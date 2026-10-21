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
import { scoreTranscript, summarizeAsrAttempts, type AsrDecoderId, type MeasuredAsrAttempt } from './asr-batch-metrics.mts';

export type BatchSample = { id: string; scenario: 'quiet' | 'noise'; wav: string; reference: string };
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
    if (scenario !== 'quiet' && scenario !== 'noise') throw Error('Scenario must be quiet or noise');
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
};
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
  const bySample = report.attempts.map(a =>
    `| ${a.id} | ${a.scenario} | ${a.decoder} | ${a.referenceWords} | ${a.substitutions}/${a.deletions}/${a.insertions} | ${a.wordErrorRate} | ${a.realTimeFactor} |`);
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
    '',
    '## Weighted results (sum errors / sum reference words; RTF = total elapsed / total audio duration)',
    '',
    '| Scenario | Decoder | Attempts | Words | S/D/I | Weighted WER | Aggregate RTF |',
    '| --- | --- | ---: | ---: | --- | ---: | ---: |',
    ...rows,
    '',
    '## Per-sample diagnostic counts (not recognized text)',
    '',
    '| ID | Scenario | Decoder | Words | S/D/I | WER | RTF |',
    '| --- | --- | --- | ---: | --- | ---: | ---: |',
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
export function selectedBatchDecoders(compareMoonshine:boolean,moonshineSize:'small'|'medium'='medium'):readonly AsrDecoderId[]{
  return compareMoonshine?[...sherpaDecoders,moonshineSize==='medium'?'moonshine-medium-streaming':'moonshine-small-streaming']:sherpaDecoders;
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
  return {
    id: item.id, scenario: item.scenario, decoder, ...scores,
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
  if (!process.env.VOXNELO_ASR_MODEL_DIR || !process.env.VOXNELO_ASR_ADDON_PATH)
    throw Error('Set your local VOXNELO_ASR_MODEL_DIR and VOXNELO_ASR_ADDON_PATH; no auto-download occurs');
  const compareMoonshine=process.argv.includes('--compare-moonshine');
  const moonshineSize=arg('moonshine-size')??'medium';
  if(moonshineSize!=='small'&&moonshineSize!=='medium')throw Error('Moonshine size must be small or medium');
  if(compareMoonshine&&(!process.env.VOXNELO_MOONSHINE_MODEL_DIR ||
      !path.isAbsolute(process.env.VOXNELO_MOONSHINE_MODEL_DIR)))
    throw Error('Set absolute VOXNELO_MOONSHINE_MODEL_DIR for local Moonshine comparison; no downloads occur');
  const decoders=selectedBatchDecoders(compareMoonshine,moonshineSize);
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
