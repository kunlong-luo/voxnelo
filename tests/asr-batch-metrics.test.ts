import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { scoreTranscript, summarizeAsrAttempts, tokenizeAsr, type MeasuredAsrAttempt } from '../scripts/asr-batch-metrics.mts';
import { buildBatchReport, formatBatchMarkdown, parseBatchManifest, validatePcm16Wav } from '../scripts/batch-offline-asr.mts';
import { requireRealAsrQuality } from '../apps/desktop/asrAcceptance';

describe('private local ASR word error scoring', () => {
  it('tokenizes case/punctuation consistently with existing real-model quality tests', () => {
    expect(tokenizeAsr("Hello, I'M ready!")).toEqual(['hello', "i'm", 'ready']);
    expect(scoreTranscript("Hello, WORLD!",'hello world')).toMatchObject({
      referenceWords:2, substitutions:0, deletions:0, insertions:0, wordErrorRate:0,
    });
  });
  it('reports substitution, deletion and insertion without hiding blank model output', () => {
    expect(scoreTranscript('we speak slowly', 'we walk slowly')).toMatchObject({
      substitutions:1,deletions:0,insertions:0,wordErrorRate:0.3333,
    });
    expect(scoreTranscript('we speak slowly', 'we slowly')).toMatchObject({
      substitutions:0,deletions:1,insertions:0,wordErrorRate:0.3333,
    });
    expect(scoreTranscript('we speak slowly', 'we speak very slowly')).toMatchObject({
      substitutions:0,deletions:0,insertions:1,wordErrorRate:0.3333,
    });
    expect(scoreTranscript('please speak English slowly', '')).toMatchObject({
      referenceWords:4,substitutions:0,deletions:4,insertions:0,wordErrorRate:1,
    });
    expect(()=>scoreTranscript('', 'random')).toThrow(/reference/);
    expect(()=>scoreTranscript('!!!','')).toThrow(/reference/);
  });
  it('can express WER > 100 percent for hallucinated words',()=>{
    const report=scoreTranscript('hello','hello there again');
    expect(report.insertions).toBe(2);
    expect(report.wordErrorRate).toBe(2);
  });
  const trial=(id:string, words:number, errors:number, seconds:number):MeasuredAsrAttempt=>({
    id,scenario:'quiet',decoder:'greedy_search',
    referenceWords:words,substitutions:errors,deletions:0,insertions:0,wordErrorRate:errors/words,
    durationSeconds:seconds,elapsedSeconds:seconds*0.5,realTimeFactor:0.5,
  });
  it('computes weighted WER from total errors / words, not an average of sentence WER',()=>{
    const summary=summarizeAsrAttempts([trial('short',2,1,1),trial('long',8,1,5)]);
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatchObject({
      sampleCount:2,referenceWords:10,substitutions:2,wordErrorRate:0.2,realTimeFactor:0.5,
    });
    expect(summary[0]?.wordErrorRate).not.toBe(0.3125);
  });
  it('keeps quiet/noise and greedy/beam groups separate',()=>{
    const data=[trial('s1',2,1,1),{...trial('s1',2,0,1),decoder:'modified_beam_search' as const},
      {...trial('s2',2,2,1),scenario:'noise' as const}];
    const groups=summarizeAsrAttempts(data);
    expect(groups.map(s=>[s.scenario,s.decoder,s.wordErrorRate])).toEqual([
      ['quiet','greedy_search',0.5],['quiet','modified_beam_search',0],
      ['noise','greedy_search',1],
    ]);
  });
});

describe('local batch input validation and privacy',()=>{
  const good=()=>({ samples:[
    {id:'q01',scenario:'quiet',wav:'voice/first.wav',reference:'How are you?'},
    {id:'n01',scenario:'noise',wav:'voice/second.wav',reference:'Good morning!'},
  ]});
  it('validates scenario, unique ids, bounded manifest and English-only references',()=>{
    expect(parseBatchManifest(good()).samples).toHaveLength(2);
    expect(()=>parseBatchManifest({samples:[]})).toThrow(/1–100/);
    expect(()=>parseBatchManifest({samples:Array.from({length:101},()=>good().samples[0])})).toThrow(/1–100/);
    expect(()=>parseBatchManifest({samples:[good().samples[0],good().samples[0]]})).toThrow(/unique/);
    expect(()=>parseBatchManifest({samples:[{...good().samples[0],id:'../../secret'}]})).toThrow(/unique/);
    expect(()=>parseBatchManifest({samples:[{...good().samples[0],scenario:'cloud'}]})).toThrow(/Scenario/);
    expect(()=>parseBatchManifest({samples:[{...good().samples[0],reference:'!!!'}]})).toThrow(/reference/);
    expect(()=>parseBatchManifest({samples:[{...good().samples[0],wav:''}]})).toThrow(/WAV/);
  });
  const example:MeasuredAsrAttempt={
    id:'q01',scenario:'quiet',decoder:'greedy_search',referenceWords:4,
    substitutions:1,deletions:0,insertions:0,wordErrorRate:0.25,
    durationSeconds:3,elapsedSeconds:1.5,realTimeFactor:0.5,
  };
  it('rejects damaged or incorrectly encoded WAV before invoking a native model',()=>{
    const wav=Buffer.alloc(48);
    wav.write('RIFF',0,'ascii');
    wav.writeUInt32LE(40,4);
    wav.write('WAVEfmt ',8,'ascii');
    wav.writeUInt32LE(16,16);
    wav.writeUInt16LE(1,20); // PCM
    wav.writeUInt16LE(1,22); // mono
    wav.writeUInt32LE(16000,24);
    wav.writeUInt32LE(32000,28);
    wav.writeUInt16LE(2,32);
    wav.writeUInt16LE(16,34);
    wav.write('data',36,'ascii');
    wav.writeUInt32LE(4,40);
    expect(validatePcm16Wav(wav)).toBe(2);
    expect(()=>validatePcm16Wav(Buffer.from('bad WAV'))).toThrow(/WAV/);
    const stereo=Buffer.from(wav);
    stereo.writeUInt16LE(2,22);
    expect(()=>validatePcm16Wav(stereo)).toThrow(/mono PCM16/);
    const not16k=Buffer.from(wav);
    not16k.writeUInt32LE(48000,24);
    expect(()=>validatePcm16Wav(not16k)).toThrow(/16 kHz/);
    const broken=Buffer.from(wav);
    broken.writeUInt32LE(100000,40);
    expect(()=>validatePcm16Wav(broken)).toThrow(/Truncated/);
  });
  it('makes partially failed evaluations explicit rather than declaring incomplete WER a pass',()=>{
    const failures=[{id:'q01',scenario:'quiet' as const,decoder:'modified_beam_search' as const,
      reason:'invalid-wav-or-inference' as const}];
    const report=buildBatchReport([example],failures,2);
    expect(report.status).toBe('incomplete');
    expect(report.failed).toBe(1);
    expect(formatBatchMarkdown(report)).toContain('**Incomplete:**');
    expect(formatBatchMarkdown(report)).toContain('Weighted WER');
    expect(formatBatchMarkdown(report)).toContain('\n## Weighted results');
    expect(()=>buildBatchReport([example],[],2)).toThrow(/Missing/);
  });
  it('excludes raw samples/transcripts/paths from locally written reports',()=>{
    const report=buildBatchReport([example],[],1);
    const serialized=JSON.stringify(report)+formatBatchMarkdown(report);
    for(const secret of ['/home/secret/voice.wav','private spoken transcript','VOXNELO_ASR_ADDON_PATH'])
      expect(serialized).not.toContain(secret);
    expect(report.releaseReady).toBe(false);
    expect(report.status).toBe('complete');
  });
  it('does not relax the real-model CI quality gate when running batch diagnostics',()=>{
    const script=readFileSync('scripts/benchmark-offline-asr.mts','utf8');
    const batch=readFileSync('scripts/batch-offline-asr.mts','utf8');
    expect(script).toContain("if(!argv.includes('--report-only'))requireRealAsrQuality(result)");
    expect(batch).toContain("'--report-only'");
    expect(()=>requireRealAsrQuality({
      transcript:'wrong', reference:'please speak English slowly',
      realTimeFactor:0.5,wordErrorRate:0.75,
    })).toThrow(/quality failed/);
  });
});
