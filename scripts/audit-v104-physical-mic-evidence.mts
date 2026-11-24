#!/usr/bin/env node
/**
 * Local, read-only intake check for v1.0.4 real-human microphone observations.
 * It checks the shape and arithmetic of self-reported private summaries only.
 * It cannot authenticate a device, recording, consent, reviewer, legal rights or release.
 */
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PINNED_MOONSHINE_MEDIUM_FILES } from '../apps/desktop/moonshineIntegrity.ts';
import wheelSnapshot from '../docs/engineering/moonshine-python312-wheel-digests-2026-11-23.json' with { type: 'json' };

// Self-reported summary aggregates must not contain raw transcripts or audio.
const MAX_PRIVATE_SUMMARY_BYTES = 256 * 1024;

type Row = Record<string, unknown>;
const row = (value: unknown): Row =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Row
    : {};
const valueString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';
const isSha256 = (value: unknown): boolean => /^[a-f0-9]{64}$/.test(valueString(value));
const isCommit = (value: unknown): boolean => /^[a-f0-9]{40}$/.test(valueString(value));
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const validDate = (value: unknown): boolean => {
  const date = valueString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date + 'T00:00:00Z');
  if (Number.isNaN(parsed.getTime()) || !parsed.toISOString().startsWith(date)) return false;
  // A reviewer cannot have observed a future test session. Allow the
  // next UTC calendar day for testers east of UTC (local date may be +1).
  const latestUtc = new Date();
  latestUtc.setUTCHours(0, 0, 0, 0);
  latestUtc.setUTCDate(latestUtc.getUTCDate() + 1);
  return parsed.getTime() <= latestUtc.getTime();
};
// Opaque, non-identifying reference token; no personal paths, URLs, names or raw audio.
const isPrivateEvidenceToken = (value: unknown): boolean =>
  /^[a-zA-Z0-9][a-zA-Z0-9_.:-]{3,99}$/.test(valueString(value));

export const PHYSICAL_MIC_TARGETS = [
  'linux-x64', 'windows-x64', 'macos-arm64-15plus',
] as const;

export type PhysicalMicEvidenceAudit = {
  blockers: string[];
  // This invariant must not be reused as a release-approval switch.
  releaseApproved: false;
  reviewRequired: true;
  structurallyReviewable: boolean;
  weightedWer: Record<string, { quiet: number | null; noisy: number | null }>;
};

export function auditV104PhysicalMicEvidence(input: unknown): PhysicalMicEvidenceAudit {
  const data = row(input);
  const blockers: string[] = [];
  const weightedWer: PhysicalMicEvidenceAudit['weightedWer'] = {};
  const requireText = (id: string, value: unknown): void => {
    if (!valueString(value)) blockers.push(id + ': missing');
  };
  const requireTrue = (id: string, value: unknown): void => {
    if (value !== true) blockers.push(id + ': must be observed true');
  };
  const requirePrivateToken = (id: string, value: unknown): void => {
    if (!isPrivateEvidenceToken(value)) blockers.push(id + ': nonidentifying evidence token required');
  };

  if (data.schemaVersion !== 2 || data.version !== '1.0.4') {
    blockers.push('schemaVersion/version: v1.0.4 evidence schema 2 required');
  }
  if (!isCommit(data.sourceCommit)) blockers.push('sourceCommit: full source SHA required');
  if (!isCount(data.corpusDistinctSentences) || data.corpusDistinctSentences < 20) {
    blockers.push('corpusDistinctSentences: at least 20 different consented human sentences required overall');
  }
  const platforms = row(data.platforms);
  for (const key of Object.keys(platforms)) {
    if (!(PHYSICAL_MIC_TARGETS as readonly string[]).includes(key)) {
      // Never echo an attacker/user-controlled JSON property name to CI/CLI
      // output: it may contain a private path, transcript or other secret.
      blockers.push('platforms: unexpected platform key (name withheld)');
    }
  }
  for (const platform of PHYSICAL_MIC_TARGETS) {
    const src = row(platforms[platform]);
    const prefix = platform + '.';
    if (!isSha256(src.installerSha256)) blockers.push(prefix + 'installerSha256: exact tested installer digest required');
    requireText(prefix + 'osVersion', src.osVersion);
    requireText(prefix + 'microphoneCategory', src.microphoneCategory);
    if (src.sdkVersion !== '0.0.65') {
      blockers.push(prefix + 'sdkVersion: must equal installed Moonshine 0.0.65 pin');
    }
    if (typeof src.pythonVersion !== 'string' || !/^3\.12\.\d+$/.test(src.pythonVersion)) {
      blockers.push(prefix + 'pythonVersion: tested 3.12.x ABI required');
    }
    const expectedArch = platform === 'macos-arm64-15plus' ? 'arm64' : 'x64';
    if (src.architecture !== expectedArch) {
      blockers.push(prefix + 'architecture: unsupported host architecture');
    }
    const wheelPlatform = platform === 'linux-x64' ? 'linux'
      : platform === 'windows-x64' ? 'win32' : 'darwin';
    const sdkWheels = Object.entries(wheelSnapshot.platforms[wheelPlatform])
      .filter(([name]) => name.startsWith('moonshine_voice-0.0.65-') && name.endsWith('.whl'));
    if (!isSha256(src.sdkWheelSha256) || sdkWheels.length !== 1 ||
        src.sdkWheelSha256 !== sdkWheels[0]?.[1]) {
      blockers.push(prefix + 'sdkWheelSha256: must match tested 3.12 platform SDK Wheel digest');
    }
    const observedModelHashes = row(src.modelFileSha256);
    const expectedModelNames = Object.keys(PINNED_MOONSHINE_MEDIUM_FILES);
    if (Object.keys(observedModelHashes).length !== expectedModelNames.length ||
        expectedModelNames.some(name => observedModelHashes[name] !== PINNED_MOONSHINE_MEDIUM_FILES[name])) {
      blockers.push(prefix + 'modelFileSha256: exactly eight locally checked model file digests must match candidate pins');
    }
    requirePrivateToken(prefix + 'modelHashesEvidenceRef', src.modelHashesEvidenceRef);
    requirePrivateToken(prefix + 'reviewerEvidenceRef', src.reviewerEvidenceRef);
    requirePrivateToken(prefix + 'anonymizedEvidenceRef', src.anonymizedEvidenceRef);
    if (!validDate(src.testDate)) blockers.push(prefix + 'testDate: valid YYYY-MM-DD required');
    if (src.inputMethod !== 'direct-human-physical-microphone') {
      blockers.push(prefix + 'inputMethod: direct human speech through physical microphone required');
    }
    requireTrue(prefix + 'consentConfirmed', src.consentConfirmed);
    requireText(prefix + 'normalizationRule', src.normalizationRule);
    requireTrue(prefix + 'tenMinuteSessionObserved', src.tenMinuteSessionObserved);
    requireTrue(prefix + 'permissionAndDenialRecoveryObserved', src.permissionAndDenialRecoveryObserved);
    requireTrue(prefix + 'disconnectRecoveryObserved', src.disconnectRecoveryObserved);
    requireTrue(prefix + 'stopRestartNoStaleSubtitlesObserved', src.stopRestartNoStaleSubtitlesObserved);
    requireTrue(prefix + 'upgradePreservesDataObserved', src.upgradePreservesDataObserved);
    requireTrue(prefix + 'offlineAndPrivacyObserved', src.offlineAndPrivacyObserved);

    const results: { quiet: number | null; noisy: number | null } = { quiet: null, noisy: null };
    for (const condition of ['quiet', 'noisy'] as const) {
      const scenario = row(src[condition]);
      const label = prefix + condition + '.';
      const trials = scenario.trials;
      if (!isCount(trials) || trials < 10) blockers.push(label + 'trials: at least 10 real human-microphone trials required');
      const fields = ['referenceWords', 'substitutions', 'deletions', 'insertions'] as const;
      for (const field of fields) {
        if (!isCount(scenario[field])) blockers.push(label + field + ': nonnegative integer required');
      }
      if (isCount(scenario.referenceWords) && isCount(trials) &&
          (scenario.referenceWords === 0 || scenario.referenceWords < trials)) {
        blockers.push(label + 'referenceWords: positive and at least trial count');
      }
      if (isCount(scenario.referenceWords) && isCount(scenario.substitutions) &&
          isCount(scenario.deletions) &&
          scenario.substitutions + scenario.deletions > scenario.referenceWords) {
        blockers.push(label + 'edits: substitutions + deletions exceed reference words');
      }
      if (fields.every(field => isCount(scenario[field])) && (scenario.referenceWords as number) > 0) {
        const totalEdits = (scenario.substitutions as number) +
          (scenario.deletions as number) + (scenario.insertions as number);
        if (!Number.isSafeInteger(totalEdits)) {
          blockers.push(label + 'edits: combined edit counts exceed safe integer precision');
        } else {
          results[condition] = totalEdits / (scenario.referenceWords as number);
        }
      }
    }
    weightedWer[platform] = results;
    // All quiet+noisy attempts must be represented by measured UI latency
    // observations. A single easy example is not enough for 20+ trials.
    const quietTrials = row(src.quiet).trials;
    const noisyTrials = row(src.noisy).trials;
    const requiredLatencySamples = isCount(quietTrials) && isCount(noisyTrials) &&
      Number.isSafeInteger(quietTrials + noisyTrials)
      ? quietTrials + noisyTrials : null;
    if (isCount(quietTrials) && isCount(noisyTrials) && requiredLatencySamples === null) {
      blockers.push(prefix + 'latency: total trial count exceeds safe integer precision');
    }
    for (const metric of ['firstVisibleInterimMs', 'endOfSpeechToFinalVisibleMs']) {
      const samples = row(src[metric]);
      const label = prefix + metric + '.';
      if (!isCount(samples.count) || samples.count === 0) {
        blockers.push(label + 'count: measured observations required');
      } else if (requiredLatencySamples !== null &&
          samples.count !== requiredLatencySamples) {
        // A first-visible/final-visible value is measured once per attempt,
        // not multiple times per attempt or on unrelated replayed audio.
        blockers.push(label +
          'count: exactly one observation per quiet and noisy human-microphone trial required');
      }
      if (typeof samples.p50 !== 'number' || !Number.isFinite(samples.p50) || samples.p50 < 0 ||
          typeof samples.p95 !== 'number' || !Number.isFinite(samples.p95) || samples.p95 < samples.p50) {
        blockers.push(label + 'p50/p95: finite nonnegative values with p95 >= p50 required');
      }
    }
  }

  return {
    blockers,
    releaseApproved: false,
    reviewRequired: true,
    structurallyReviewable: blockers.length === 0,
    weightedWer,
  };
}

const executedAsScript = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executedAsScript) {
  const file = process.argv[2];
  if (!file || process.argv.length !== 3) {
    console.error('Usage: pnpm asr:mic:evidence:audit <private-evidence-summary.json>');
    process.exitCode = 2;
  } else {
    try {
      if (statSync(file).size > MAX_PRIVATE_SUMMARY_BYTES) {
        throw new Error('Private evidence aggregate exceeds size limit');
      }
      const audit = auditV104PhysicalMicEvidence(JSON.parse(readFileSync(file, 'utf8')) as unknown);
      for (const blocker of audit.blockers) console.error('INCOMPLETE: ' + blocker);
      if (audit.blockers.length) process.exitCode = 1;
      else console.log('STRUCTURE ONLY: complete summaries; human review, model rights and release approval remain PENDING.');
    } catch {
      // Never echo the input, user file path or private reference transcripts in logs.
      console.error('Cannot parse or open evidence JSON; no approval granted.');
      process.exitCode = 1;
    }
  }
}
