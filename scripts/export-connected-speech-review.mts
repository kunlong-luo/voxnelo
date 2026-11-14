#!/usr/bin/env node
// Export existing editorial annotations for external pronunciation review.
// This CLI does not mark content reviewed and does not fetch or create audio.
import { connectedSpeechReviewCsv } from '../packages/content/connected-speech-review.ts';

if(process.argv.length>2){
  process.stderr.write('Usage: pnpm content:review:export > connected-speech-review.csv\n');
  process.exitCode=2;
}else{
  process.stdout.write(connectedSpeechReviewCsv());
}
