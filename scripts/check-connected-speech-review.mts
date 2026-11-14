#!/usr/bin/env node
// Offline, read-only syntax/evidence-presence check. Does not certify a linguist or audio rights.
import { readFileSync } from 'node:fs';
import { auditConnectedSpeechReviewCsv } from '../packages/content/connected-speech-review-audit.ts';

const args = process.argv.slice(2);
if (args.length !== 1) {
  process.stderr.write('Usage: pnpm content:review:check <review.csv | ->\n');
  process.exitCode = 2;
} else {
  try {
    const csv = readFileSync(args[0] === '-' ? 0 : args[0]!, 'utf8');
    const report = auditConnectedSpeechReviewCsv(csv);
    process.stdout.write(
      'Rule rows: ' + report.receivedRows + '/' + report.expectedRows + '\n' +
      'Review decisions (unverified): ' +
      Object.entries(report.decisions).map(([name, count]) => name + '=' + count).join(', ') + '\n' +
      'This is only a local structural check; no linguistic approval, audio provenance or license is verified.\n',
    );
    for (const message of report.errors) process.stderr.write('ERROR: ' + message + '\n');
    if (report.errors.length > 0) process.exitCode = 1;
  } catch (error) {
    process.stderr.write('Cannot inspect review CSV: ' +
      (error instanceof Error ? error.message : 'unknown error') + '\n');
    process.exitCode = 1;
  }
}
