#!/usr/bin/env node
/**
 * Review audio preflight only. Does not permit changing lesson review status,
 * bundling recordings, publishing releases or enabling audio playback.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { auditReviewedAudioManifest } from './reviewed-audio-validator.mts';

if (process.argv.length !== 2) {
  process.stderr.write('Usage: pnpm content:audio:verify\n');
  process.exitCode = 2;
} else {
  try {
    const manifest = JSON.parse(await readFile('assets/audio/reviewed-manifest.json', 'utf8')) as unknown;
    const result = await auditReviewedAudioManifest(manifest, path.resolve('assets/audio/reviewed'));
    process.stdout.write('Reviewed audio preflight: ' + result.pairs + ' pairs, ' +
      result.filesChecked + ' WAV files inspected (NOT a rights/phonetics certification).\n');
    for (const error of result.errors) process.stderr.write('ERROR: ' + error + '\n');
    if (result.errors.length > 0) process.exitCode = 1;
  } catch (error) {
    process.stderr.write('Reviewed audio manifest is missing or malformed: ' +
      (error instanceof Error ? error.message : 'unknown error') + '\n');
    process.exitCode = 1;
  }
}
