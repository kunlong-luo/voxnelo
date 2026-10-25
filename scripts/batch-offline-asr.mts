#!/usr/bin/env node
/**
 * Personal-only, offline ASR diagnostics. Compares the SAME private WAV for
 * both decoders, keeps transcripts and file paths out of exported reports.
 * Not a release quality gate and never stages/bundles native ASR models.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { scoreTranscript, summarizeAsrAttempts, type AsrDecoderId, type AsrScenario, type MeasuredAsrAttempt } from './asr-batch-metrics.mts';

export type BatchSample = { id: string; scenario: AsrScenario; wav: string; reference: string };
export type BatchManifest = { samples: BatchSample[] };

export function parseBatchManifest(raw: unknown): BatchManifest {
  if (!raw || typeof raw !== 'object' || !('samples' in raw)) throw Error('Expected samples array in local batch manifest');
  const data = (raw as { samples: unknown }).samples;
  if (!Array.isArray(data) || !data.length || data.length > 100)
    throw Error('Local batch must include 1–100 samples');
  const ids = new Set<string>();
  const samples: BatchSample[] = [];
  for (const value of data) {
    if (!value || typeof value !== 'object') throw Error('Invalid ASR sample');
    const item = value as Record<string, unknown>;
    const id = item.id, wav = item.wav, reference = item.reference, scenario = item.scenario;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(id) || ids.has(id))
      throw Error('Sample ids must be unique and contain only letters, digits, hyphen or underscore');
    if (scenario !== 'quiet' && scenario !== 'noise' && scenario !== 'external-playback')
      throw Error('Scenario must be quiet, external-playback, or noise');
    if (typeof wav !== 'string' || !wav.trim() || wav.length > 2048)
      throw Error('Each sample needs a local WAV path');
    if (typeof reference !== 'string' || reference.length > 300 || !/[a-z]/i.test(reference))
      throw Error('Each sample needs a short English reference sentence');
    // Validate normalized reference before loading any audio or native addon.
    scoreTranscript(reference, '');
    ids.add(id);
    samples.push({ id, wav, reference, scenario });
  }
  return { samples };
}

type ModelResult = {
  realModel: boolean; decodingMethod: string; transcript: string;
  durationSeconds: number; elapsedSeconds: number; realTimeFactor: number;
  firstInterimAudioSeconds?:number|null;
  firstInterimProcessingMs?:number|null;
  firstInterimWallMs?:number|null;
  modelLoadMs?:number|null;
};
/** Reject malformed or forged timing evidence rather than treating NaN,
 * negative timings or strings as successful numeric benchmark results.
 * Absence/null is valid: a recognizer can emit final text without an interim.
 */
export function extractTimingEvidence(
  result:Record<string,unknown>,
  moonshine:boolean,
):Pick<MeasuredAsrAttempt,'firstInterimAudioSeconds'|'firstInterimProcessingMs'|'modelLoadMs'>{
  const value=(key:string):number|null=>{
    const raw=result[key];
    if(raw===undefined||raw===null)return null;
    if(typeof raw!=='number'||!Number.isFinite(raw)||raw<0)
      throw Error('invalid-model-result');
    return Number(raw.toFixed(3));
  };
  return {
    firstInterimAudioSeconds:value('firstInterimAudioSeconds'),
    firstInterimProcessingMs:value(moonshine?'firstInterimWallMs':'firstInterimProcessingMs'),
    modelLoadMs:value('modelLoadMs'),
  };
}
type AttemptFailure = {
  id: string; scenario: BatchSample['scenario'];
  decoder: MeasuredAsrAttempt['decoder']; reason: 'invalid-wav-or-inference' | 'invalid-model-result';
};
export type BatchReport = {
  type: 'voxnelo-local-asr-diagnostic'; releaseReady: false;
  status: 'complete' | 'incomplete';
  attempted: number; succeeded: number; failed: number;
  // Intentionally contains no WAV locations, spoken text, native addon paths or user identifiers.
  groups: ReturnType<typeof summarizeAsrAttempts>;
  attempts: MeasuredAsrAttempt[];
  failures: AttemptFailure[];
};

export function buildBatchReport(attempts: MeasuredAsrAttempt[], failures: AttemptFailure[], expectedCount: number): BatchReport {
  if (attempts.length + failures.length !== expectedCount) throw Error('Missing ASR benchmark attempt');
  return {
    type: 'voxnelo-local-asr-diagnostic', releaseReady: false,
    status: failures.length ? 'incomplete' : 'complete',
    attempted: expectedCount, succeeded: attempts.length, failed: failures.length,
    groups: summarizeAsrAttempts(attempts),
    attempts, failures,
  };
}

export function formatBatchMarkdown(report: BatchReport): string {
  const rows = report.groups.map(g =>
    `| ${g.scenario} | ${g.decoder} | ${g.sampleCount} | ${g.referenceWords} | ${g.substitutions}/${g.deletions}/${g.insertions} | ${g.wordErrorRate} | ${g.realTimeFactor} |`);
  const numberOrNA=(value:number|null|undefined)=>value===null||value===undefined?'N/A':value;
  const bySample = report.attempts.map(a =>
    `| ${a.id} | ${a.scenario} | ${a.decoder} | ${a.referenceWords} | ${a.substitutions}/${a.deletions}/${a.insertions} | ${a.wordErrorRate} | ${a.realTimeFactor} | ${numberOrNA(a.firstInterimAudioSeconds)} | ${numberOrNA(a.firstInterimProcessingMs)} | ${numberOrNA(a.modelLoadMs)} |`);
  const incomplete = report.failures.length
    ? '\n**Incomplete:** failed attempts must be investigated; do not compare these partial totals as final results.\n' +
      report.failures.map(f => `- ${f.id} / ${f.decoder}: ${f.reason}`).join('\n') + '\n'
    : '';
  return [
    '# Voxnelo — local ASR evaluation (private diagnostic)',
    '',
    `**Status:** ${report.status} · ${report.succeeded}/${report.attempted} attempts`,
    '',
    '**Not a release approval.** No voice, full transcript, WAV path, or model location is included.',
    'Report only qualified consented local experiments. Real-device latency and endpoint behavior require separate observation.',
    '**Interim timing below is fast-fed WAV processing, NOT live microphone-to-screen latency.** Null/N/A means no observed interim or unavailable timing; it is not zero latency.',
    '',
    '## Weighted results (sum errors / sum reference words; RTF = total elapsed / total audio duration)',
    '',
    '| Scenario | Decoder | Attempts | Words | S/D/I | Weighted WER | Aggregate RTF |',
    '| --- | --- | ---: | ---: | --- | ---: | ---: |',
    ...rows,
    '',
    '## Per-sample diagnostic counts (not recognized text)',
    '',
    '| ID | Scenario | Decoder | Words | S/D/I | WER | RTF | First interim audio (s) | First interim processing (ms) | Model load (ms) |',
    '| --- | --- | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: |',
    ...bySample,
    '',
    incomplete,
  ].join('\n');
}

/** Preflight keeps malformed recordings from being counted as ASR results. */
export function validatePcm16Wav(buffer: Buffer): number {
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' ||
    buffer.toString('ascii', 8, 12) !== 'WAVE') throw Error('Invalid RIFF WAV');
  let offset = 12;
  let encoding = 0, channels = 0, rate = 0, bits = 0, sampleBytes = 0;
  while (offset + 8 <= buffer.length) {
    const kind = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > buffer.length) throw Error('Truncated WAV chunk');
    if (kind === 'fmt ' && size >= 16) {
      encoding = buffer.readUInt16LE(start);
      channels = buffer.readUInt16LE(start + 2);
      rate = buffer.readUInt32LE(start + 4);
      bits = buffer.readUInt16LE(start + 14);
    }
    if (kind === 'data') sampleBytes = size;
    offset = start + size + size % 2;
  }
  if (encoding !== 1 || channels !== 1 || rate !== 16000 || bits !== 16 ||
    sampleBytes === 0 || sampleBytes % 2 !== 0 || sampleBytes > 16000 * 180 * 2)
    throw Error('Expected 16 kHz mono PCM16 WAV, maximum 180 seconds');
  return sampleBytes / 2;
}

const sherpaDecoders:readonly AsrDecoderId[]=['greedy_search','modified_beam_search'];
export function selectedBatchDecoders(
  compareMoonshine:boolean,moonshineSize:'small'|'medium'='medium',moonshineOnly=false,
):readonly AsrDecoderId[]{
  if(compareMoonshine&&moonshineOnly)throw Error('Choose only one Moonshine evaluation mode');
  const candidate=moonshineSize==='medium'?'moonshine-medium-streaming':'moonshine-small-streaming';
  // Evaluate an installed Moonshine without requiring legacy Zipformer.
  if(moonshineOnly)return [candidate];
  return compareMoonshine?[...sherpaDecoders,candidate]:sherpaDecoders;
}
function runOne(item: BatchSample, decoder: AsrDecoderId, manifestDir: string): MeasuredAsrAttempt {
  const wavPath = path.resolve(manifestDir, item.wav);
  // A single recording is bounded to ~6 MB; inspect before spawning a native
  // process and never print its filename, full path, voice or transcript.
  const waveform = readFileSync(wavPath);
  if (waveform.length > 7_000_000) throw Error('invalid-wav-or-inference');
  validatePcm16Wav(waveform);
  const moonshine=decoder.startsWith('moonshine-');
  const args=moonshine
    ? [path.resolve('scripts/benchmark-moonshine-voice.py'),
       '--wav',wavPath,'--model-dir',process.env.VOXNELO_MOONSHINE_MODEL_DIR??'',
       '--size',decoder==='moonshine-medium-streaming'?'medium':'small']
    : ['--experimental-strip-types',
       path.resolve('scripts/benchmark-offline-asr.mts'),
       '--wav',wavPath,'--expect',item.reference,
       '--decoding-method',decoder,'--report-only'];
  const result = spawnSync(moonshine?(process.env.VOXNELO_MOONSHINE_PYTHON??'python3'):process.execPath,args, {
    cwd: path.resolve('.'), env: process.env, encoding: 'utf8',
    timeout: 240000, maxBuffer: 1024 * 512, windowsHide: true,
  });
  if (result.error || result.status !== 0) throw Error('invalid-wav-or-inference');
  let parsed: ModelResult;
  try { parsed = JSON.parse(result.stdout) as ModelResult; }
  catch { throw Error('invalid-model-result'); }
  if (parsed.realModel !== true || parsed.decodingMethod !== decoder ||
    typeof parsed.transcript !== 'string' ||
    !Number.isFinite(parsed.durationSeconds) || parsed.durationSeconds <= 0 ||
    !Number.isFinite(parsed.elapsedSeconds) || parsed.elapsedSeconds <= 0 ||
    !Number.isFinite(parsed.realTimeFactor) || parsed.realTimeFactor <= 0)
    throw Error('invalid-model-result');
  const scores = scoreTranscript(item.reference, parsed.transcript);
  const timings=extractTimingEvidence(parsed as unknown as Record<string,unknown>,moonshine);
  return {
    id: item.id, scenario: item.scenario, decoder, ...scores,...timings,
    durationSeconds: parsed.durationSeconds,
    elapsedSeconds: parsed.elapsedSeconds,
    realTimeFactor: parsed.realTimeFactor,
  };
}

function arg(name: string): string | undefined {
  const at = process.argv.indexOf('--' + name);
  return at < 0 ? undefined : process.argv[at + 1];
}
export function runBatch(): void {
  const manifestArg = arg('manifest'), outputArg = arg('output-dir');
  if (!manifestArg || !outputArg) throw Error('Usage: pnpm asr:batch --manifest /abs/private-samples.json --output-dir /abs/new-private-report-folder');
  if (!path.isAbsolute(manifestArg) || !path.isAbsolute(outputArg))
    throw Error('Manifest and output directory must both be absolute paths');
  const compareMoonshine=process.argv.includes('--compare-moonshine');
  const moonshineOnly=process.argv.includes('--moonshine-only');
  const moonshineSize=arg('moonshine-size')??'medium';
  if(moonshineSize!=='small'&&moonshineSize!=='medium')throw Error('Moonshine size must be small or medium');
  const decoders=selectedBatchDecoders(compareMoonshine,moonshineSize,moonshineOnly);
  if(!moonshineOnly&&(!process.env.VOXNELO_ASR_MODEL_DIR||!process.env.VOXNELO_ASR_ADDON_PATH))
    throw Error('Set your local VOXNELO_ASR_MODEL_DIR and VOXNELO_ASR_ADDON_PATH; no auto-download occurs');
  if((compareMoonshine||moonshineOnly)&&(!process.env.VOXNELO_MOONSHINE_MODEL_DIR||
      !path.isAbsolute(process.env.VOXNELO_MOONSHINE_MODEL_DIR)))
    throw Error('Set absolute VOXNELO_MOONSHINE_MODEL_DIR for local Moonshine evaluation; no downloads occur');
  if(moonshineOnly&&(!process.env.VOXNELO_MOONSHINE_PYTHON||
      !path.isAbsolute(process.env.VOXNELO_MOONSHINE_PYTHON)))
    throw Error('Set absolute VOXNELO_MOONSHINE_PYTHON for your installed local Moonshine runtime');
  const project = path.resolve('.');
  const output = path.resolve(outputArg);
  const relative = path.relative(project, output);
  if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)))
    throw Error('Keep private evaluation reports outside the Git checkout');
  if (existsSync(output)) throw Error('Choose a new private output folder to prevent overwriting old evidence');
  const manifest = parseBatchManifest(JSON.parse(readFileSync(manifestArg, 'utf8')) as unknown);
  mkdirSync(output, { mode: 0o700 });
  const attempts: MeasuredAsrAttempt[] = [], failures: AttemptFailure[] = [];
  const manifestDir = path.dirname(manifestArg);
  for (const item of manifest.samples) for (const decoder of decoders) {
    try {
      attempts.push(runOne(item, decoder, manifestDir));
      console.log('Scored', item.id, item.scenario, decoder);
    } catch (error) {
      const reason = error instanceof Error && error.message === 'invalid-model-result'
        ? 'invalid-model-result' : 'invalid-wav-or-inference';
      failures.push({ id: item.id, scenario: item.scenario, decoder, reason });
      console.warn('Local benchmark failed for', item.id, decoder, '(no private paths/audio logged)');
    }
  }
  const report = buildBatchReport(attempts, failures, manifest.samples.length * decoders.length);
  writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  writeFileSync(path.join(output, 'report.md'), formatBatchMarkdown(report), { mode: 0o600, flag: 'wx' });
  console.log('Local ASR evaluation:', report.status, report.succeeded, '/', report.attempted, '(reports saved only in your private folder)');
  if (report.status === 'incomplete') process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { runBatch(); }
  catch (error) {
    console.error('ASR batch validation failed:', error instanceof Error ? error.message : 'unknown error');
    process.exitCode = 1;
  }
}
