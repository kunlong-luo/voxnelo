import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  PHYSICAL_MIC_TARGETS,
  auditV104PhysicalMicEvidence,
} from '../scripts/audit-v104-physical-mic-evidence.mts';

// Synthetic, invented values for validator regression ONLY. Not Voxnelo device QA.
const example = () => ({
  installerSha256: 'a'.repeat(64),
  osVersion: 'test-os',
  microphoneCategory: 'test-physical-microphone',
  sdkVersion: '0.0.65',
  modelHashesEvidenceRef: 'private-model-hashes-test',
  reviewerEvidenceRef: 'private-reviewer-ref-test',
  anonymizedEvidenceRef: 'private-session-ref-test',
  testDate: '2026-11-23',
  inputMethod: 'direct-human-physical-microphone',
  consentConfirmed: true,
  normalizationRule: 'test-normalizer',
  quiet: { trials: 10, referenceWords: 40, substitutions: 1, deletions: 2, insertions: 1 },
  noisy: { trials: 10, referenceWords: 40, substitutions: 5, deletions: 4, insertions: 3 },
  firstVisibleInterimMs: { count: 10, p50: 100, p95: 200 },
  endOfSpeechToFinalVisibleMs: { count: 10, p50: 180, p95: 360 },
  tenMinuteSessionObserved: true,
  permissionAndDenialRecoveryObserved: true,
  disconnectRecoveryObserved: true,
  stopRestartNoStaleSubtitlesObserved: true,
  upgradePreservesDataObserved: true,
  offlineAndPrivacyObserved: true,
});
const filledSyntheticFixture = () => ({
  schemaVersion: 1,
  version: '1.0.4',
  sourceCommit: 'b'.repeat(40),
  corpusDistinctSentences: 20,
  platforms: Object.fromEntries(PHYSICAL_MIC_TARGETS.map(target => [target, example()])),
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

  it('fails closed on omitted/unknown platforms, invalid identifiers and dates', () => {
    const input = filledSyntheticFixture();
    delete input.platforms['windows-x64'];
    input.platforms['unsupported'] = example();
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

  it('does not accept a claimed status or malformed input as a reviewer decision', () => {
    const fake = { ...filledSyntheticFixture(), releaseApproved: true };
    expect(auditV104PhysicalMicEvidence(fake).releaseApproved).toBe(false);
    expect(auditV104PhysicalMicEvidence(null).structurallyReviewable).toBe(false);
  });
});
