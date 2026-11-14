#!/usr/bin/env node
/**
 * Local read-only validation of a private recording handoff worksheet.
 * Never imports approvals, generates files, or checks actual audio rights.
 */
import { readFileSync } from 'node:fs';
import { auditConnectedSpeechAudioHandoffCsv } from '../packages/content/connected-speech-audio-handoff-audit.ts';

const args = process.argv.slice(2);
if (args.length !== 1) {
  process.stderr.write('Usage: pnpm content:audio:handoff:check <audio-handoff.csv | ->\n');
  process.exitCode = 2;
} else {
  try {
    const csv = readFileSync(args[0] === '-' ? 0 : args[0]!, 'utf8');
    const audit = auditConnectedSpeechAudioHandoffCsv(csv);
    process.stdout.write(
      'Take rows: ' + audit.receivedTakes + '/' + audit.expectedTakes + '\n' +
      'Unverified decisions: ' + Object.entries(audit.decisions)
        .map(([decision, count]) => decision + '=' + count).join(', ') + '\n' +
      'Pairs claiming both ACCEPT: ' + audit.claimedPairs +
      ' (NOT verified/authorized)\n' +
      'Structural and evidence-presence checks only. No reviewer approval, IPA alignment, performer, copyright or redistribution right is authenticated.\n',
    );
    // Do not print user-entered CSV cells or paths; private metadata stays local.
    for (const error of audit.errors) process.stderr.write('ERROR: ' + error + '\n');
    if (audit.errors.length > 0) process.exitCode = 1;
  } catch (error) {
    // Avoid leaking private local paths from fs error messages into logs.
    process.stderr.write('Cannot inspect audio handoff: input is unreadable or invalid.\n');
    process.exitCode = 1;
  }
}
