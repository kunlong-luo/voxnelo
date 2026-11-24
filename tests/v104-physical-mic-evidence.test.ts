import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PINNED_MOONSHINE_MEDIUM_FILES } from '../apps/desktop/moonshineIntegrity.ts';
import wheelSnapshot from '../docs/engineering/moonshine-python312-wheel-digests-2026-11-23.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import {
  PHYSICAL_MIC_TARGETS,
  auditV104PhysicalMicEvidence,
} from '../scripts/audit-v104-physical-mic-evidence.mts';

// Synthetic, invented values for validator regression ONLY. Not Voxnelo device QA.
const pinnedWheelDigest = (platform: string): string => {
  const os = platform === 'linux-x64' ? 'linux'
    : platform === 'windows-x64' ? 'win32' : 'darwin';
  const hit = Object.entries(wheelSnapshot.platforms[os])
    .find(([name]) => name.startsWith('moonshine_voice-0.0.65-'));
  if (!hit) throw Error('Missing synthetic test Wheel pin');
  return hit[1];
};
const example = (platform: string) => ({
  installerSha256: 'a'.repeat(64),
  osVersion: 'test-os',
  microphoneCategory: 'test-physical-microphone',
  sdkVersion: '0.0.65',
  pythonVersion: '3.12.16',
  architecture: platform === 'macos-arm64-15plus' ? 'arm64' : 'x64',
  sdkWheelSha256: pinnedWheelDigest(platform),
  modelFileSha256: { ...PINNED_MOONSHINE_MEDIUM_FILES },
  modelHashesEvidenceRef: 'private-model-hashes-test',
  reviewerEvidenceRef: 'private-reviewer-ref-test',
  anonymizedEvidenceRef: 'private-session-ref-test',
  testDate: '2026-11-23',
  inputMethod: 'direct-human-physical-microphone',
  consentConfirmed: true,
  normalizationRule: 'test-normalizer',
  quiet: { trials: 10, referenceWords: 40, substitutions: 1, deletions: 2, insertions: 1 },
  noisy: { trials: 10, referenceWords: 40, substitutions: 5, deletions: 4, insertions: 3 },
  firstVisibleInterimMs: { count: 20, p50: 100, p95: 200 },
  endOfSpeechToFinalVisibleMs: { count: 20, p50: 180, p95: 360 },
  tenMinuteSessionObserved: true,
  permissionAndDenialRecoveryObserved: true,
  disconnectRecoveryObserved: true,
  stopRestartNoStaleSubtitlesObserved: true,
  upgradePreservesDataObserved: true,
  offlineAndPrivacyObserved: true,
});
const filledSyntheticFixture = () => ({
  schemaVersion: 2,
  version: '1.0.4',
  sourceCommit: 'b'.repeat(40),
  corpusDistinctSentences: 20,
  platforms: Object.fromEntries(PHYSICAL_MIC_TARGETS.map(target => [target, example(target)])),
});

describe('v1.0.4 physical human microphone evidence intake (NOT release approval)', () => {
  it('keeps the repository example explicitly pending and rejected', () => {
    const template = JSON.parse(readFileSync('docs/release/v1.0.4-physical-mic-evidence.example.json', 'utf8')) as unknown;
    const audit = auditV104PhysicalMicEvidence(template);
    expect(audit.structurallyReviewable).toBe(false);
    expect(audit.reviewRequired).toBe(true);
    expect(audit.releaseApproved).toBe(false);
    expect(audit.blockers.join(' ')).toMatch(/sourceCommit/);
    for (const platform of PHYSICAL_MIC_TARGETS) {
      expect(audit.blockers.join(' ')).toContain(platform + '.inputMethod');
    }
  });

  it('calculates weighted WER from synthetic counts but NEVER approves a release', () => {
    const audit = auditV104PhysicalMicEvidence(filledSyntheticFixture());
    expect(audit.blockers).toEqual([]);
    expect(audit.structurallyReviewable).toBe(true);
    expect(audit.releaseApproved).toBe(false);
    expect(audit.reviewRequired).toBe(true);
    expect(audit.weightedWer['linux-x64']?.quiet).toBeCloseTo(0.1);
    expect(audit.weightedWer['macos-arm64-15plus']?.noisy).toBeCloseTo(0.3);
  });

  it('rejects loopback, speaker playback and synthetic microphone substitutions', () => {
    for (const method of ['system-tts', 'speaker-playback', 'synthetic-pcm', 'loopback', '']) {
      const input = filledSyntheticFixture();
      input.platforms['linux-x64']!.inputMethod = method;
      const audit = auditV104PhysicalMicEvidence(input);
      expect(audit.blockers.join(' ')).toContain('linux-x64.inputMethod');
      expect(audit.releaseApproved).toBe(false);
    }
  });

  it('requires real human scenario counts and valid count arithmetic', () => {
    const input = filledSyntheticFixture();
    input.platforms['windows-x64']!.quiet.trials = 9;
    input.platforms['windows-x64']!.noisy.referenceWords = 0;
    input.platforms['macos-arm64-15plus']!.quiet.substitutions = 50;
    input.corpusDistinctSentences = 19;
    const issues = auditV104PhysicalMicEvidence(input).blockers.join(' ');
    expect(issues).toContain('windows-x64.quiet.trials');
    expect(issues).toContain('windows-x64.noisy.referenceWords');
    expect(issues).toContain('macos-arm64-15plus.quiet.edits');
    expect(issues).toContain('corpusDistinctSentences');
  });

  it('requires measured screen latencies, real consent and session/recovery observations', () => {
    const input = filledSyntheticFixture();
    input.platforms['linux-x64']!.firstVisibleInterimMs.p95 = 10;
    input.platforms['linux-x64']!.tenMinuteSessionObserved = false;
    input.platforms['windows-x64']!.consentConfirmed = false;
    input.platforms['macos-arm64-15plus']!.disconnectRecoveryObserved = false;
    const issues = auditV104PhysicalMicEvidence(input).blockers.join(' ');
    expect(issues).toContain('linux-x64.firstVisibleInterimMs.p50/p95');
    expect(issues).toContain('linux-x64.tenMinuteSessionObserved');
    expect(issues).toContain('windows-x64.consentConfirmed');
    expect(issues).toContain('macos-arm64-15plus.disconnectRecoveryObserved');
  });

  it('rejects latency samples covering fewer sessions than quiet+noisy human trials', () => {
    const input = filledSyntheticFixture();
    input.platforms['linux-x64']!.firstVisibleInterimMs.count = 1;
    input.platforms['linux-x64']!.endOfSpeechToFinalVisibleMs.count = 19;
    input.platforms['windows-x64']!.noisy.trials = 11;
    // Exactly 20 samples cannot account for 10 quiet + 11 noisy trials.
    const issues = auditV104PhysicalMicEvidence(input).blockers.join(' ');
    expect(issues).toContain('linux-x64.firstVisibleInterimMs.count');
    expect(issues).toContain('linux-x64.endOfSpeechToFinalVisibleMs.count');
    expect(issues).toContain('windows-x64.firstVisibleInterimMs.count');
    expect(issues).toContain('windows-x64.endOfSpeechToFinalVisibleMs.count');
    expect(auditV104PhysicalMicEvidence(input).releaseApproved).toBe(false);
  });

  it('rejects excessive first-visible/final-visible samples unrelated to the trials', () => {
    const input = filledSyntheticFixture();
    input.platforms['linux-x64']!.firstVisibleInterimMs.count = 21;
    input.platforms['macos-arm64-15plus']!.endOfSpeechToFinalVisibleMs.count = 99;
    const audit = auditV104PhysicalMicEvidence(input);
    expect(audit.blockers.join(' ')).toContain('linux-x64.firstVisibleInterimMs.count');
    expect(audit.blockers.join(' ')).toContain('macos-arm64-15plus.endOfSpeechToFinalVisibleMs.count');
    expect(audit.structurallyReviewable).toBe(false);
    expect(audit.releaseApproved).toBe(false);
  });

  it('refuses integer-overflowed WER sums instead of computing an imprecise score', () => {
    const input = filledSyntheticFixture();
    input.platforms['linux-x64']!.quiet.insertions = Number.MAX_SAFE_INTEGER;
    const audit = auditV104PhysicalMicEvidence(input);
    expect(audit.blockers.join(' ')).toContain('linux-x64.quiet.edits');
    expect(audit.weightedWer['linux-x64']?.quiet).toBeNull();
    expect(audit.releaseApproved).toBe(false);
  });

  it('never echoes arbitrary unknown platform JSON keys to diagnostics', () => {
    const input = filledSyntheticFixture();
    const secret = 'private-transcript-and-home-directory-sentinel';
    input.platforms[secret] = example(secret);
    const audit = auditV104PhysicalMicEvidence(input);
    expect(audit.blockers.join(' ')).toContain('platforms: unexpected platform');
    expect(JSON.stringify(audit)).not.toContain(secret);
    expect(audit.structurallyReviewable).toBe(false);
  });

  it('blocks oversized private evidence input before parsing or logging it', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'voxnelo-private-mic-intake-'));
    try {
      const file = path.join(dir, 'private-summary.json');
      const sentinel = 'private-audio-transcript-never-print-this';
      writeFileSync(file, sentinel.repeat(9000));
      const run = spawnSync(
        process.execPath,
        ['--experimental-strip-types', 'scripts/audit-v104-physical-mic-evidence.mts', file],
        { cwd: process.cwd(), encoding: 'utf8', timeout: 15000 },
      );
      expect(run.status).toBe(1);
      expect(run.stderr).toContain('Cannot parse or open evidence JSON');
      expect(run.stderr).not.toContain(sentinel);
      expect(run.stdout).toBe('');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects impossible future human-microphone test dates', () => {
    const input = filledSyntheticFixture();
    input.platforms['macos-arm64-15plus']!.testDate = '2999-12-31';
    const audit = auditV104PhysicalMicEvidence(input);
    expect(audit.blockers.join(' ')).toContain('macos-arm64-15plus.testDate');
    expect(audit.structurallyReviewable).toBe(false);
    expect(audit.releaseApproved).toBe(false);
  });

  it('fails closed on omitted/unknown platforms, invalid identifiers and dates', () => {
    const input = filledSyntheticFixture();
    delete input.platforms['windows-x64'];
    input.platforms['unsupported'] = example('unsupported');
    input.platforms['linux-x64']!.installerSha256 = 'not-a-real-hash';
    input.platforms['linux-x64']!.testDate = '2026-02-30';
    input.platforms['linux-x64']!.reviewerEvidenceRef = '../private/user-name';
    const issues = auditV104PhysicalMicEvidence(input).blockers.join(' ');
    expect(issues).toContain('platforms: unexpected platform');
    expect(issues).toContain('windows-x64.installerSha256');
    expect(issues).toContain('linux-x64.installerSha256');
    expect(issues).toContain('linux-x64.testDate');
    expect(issues).toContain('linux-x64.reviewerEvidenceRef');
  });

  it('rejects wrong SDK version, untested Python ABI and unsupported architecture', () => {
    const input = filledSyntheticFixture();
    input.platforms['linux-x64']!.sdkVersion = '0.1.6';
    input.platforms['windows-x64']!.pythonVersion = '3.15.2';
    input.platforms['macos-arm64-15plus']!.architecture = 'x64';
    const issues = auditV104PhysicalMicEvidence(input).blockers.join(' ');
    expect(issues).toContain('linux-x64.sdkVersion');
    expect(issues).toContain('windows-x64.pythonVersion');
    expect(issues).toContain('macos-arm64-15plus.architecture');
  });

  it('rejects spoofed, missing and substituted SDK Wheel or model hashes', () => {
    const input = filledSyntheticFixture();
    input.platforms['linux-x64']!.sdkWheelSha256 = '0'.repeat(64);
    input.platforms['windows-x64']!.modelFileSha256 = {};
    input.platforms['macos-arm64-15plus']!.modelFileSha256 = {
      ...input.platforms['macos-arm64-15plus']!.modelFileSha256,
      'frontend.ort': '0'.repeat(64),
    };
    const issues = auditV104PhysicalMicEvidence(input).blockers.join(' ');
    expect(issues).toContain('linux-x64.sdkWheelSha256');
    expect(issues).toContain('windows-x64.modelFileSha256');
    expect(issues).toContain('macos-arm64-15plus.modelFileSha256');
    expect(auditV104PhysicalMicEvidence(input).releaseApproved).toBe(false);
  });

  it('rejects old schema 1 evidence instead of silently treating it as complete', () => {
    const input = filledSyntheticFixture();
    input.schemaVersion = 1;
    expect(auditV104PhysicalMicEvidence(input).blockers.join(' ')).toContain('schemaVersion/version');
  });

  it('does not accept a claimed status or malformed input as a reviewer decision', () => {
    const fake = { ...filledSyntheticFixture(), releaseApproved: true };
    expect(auditV104PhysicalMicEvidence(fake).releaseApproved).toBe(false);
    expect(auditV104PhysicalMicEvidence(null).structurallyReviewable).toBe(false);
  });
});
