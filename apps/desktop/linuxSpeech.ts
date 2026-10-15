import { spawn, type ChildProcess } from 'node:child_process';
import { isLessonSpeechRequest } from '@voxnelo/core';

export type LinuxSpeechResult =
  | { ok: true; wavBase64: string }
  | { ok: false; reason: 'not-installed' | 'failed' | 'cancelled' | 'invalid' };

export type SpeechSpeed = 'normal' | 'slow';

const MAX_WAV_BYTES = 3 * 1024 * 1024;
const MAX_GENERATION_MS = 12_000;
/** Restrict renderer requests to actual shipped lessons, never arbitrary CLI input. */
export const validSpeechRequest = isLessonSpeechRequest;

export function validWave(bytes: Buffer): boolean {
  return bytes.length >= 44 && bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WAVE';
}

/**
 * Linux local offline synthesis: eSpeak NG preferred, classic eSpeak fallback.
 * Returns generated WAV for Chromium to play, rather than relying on eSpeak's
 * audio sink (which can fail on PipeWire). No shell, network or file writes.
 */
export class LinuxEnglishSpeech {
  private current: ChildProcess | null = null;
  private sequence = 0;

  cancel(): void {
    this.sequence += 1;
    this.current?.kill();
    this.current = null;
  }

  async synthesize(text: unknown, speed: unknown): Promise<LinuxSpeechResult> {
    if (!validSpeechRequest(text, speed)) return { ok: false, reason: 'invalid' };
    this.cancel();
    const request = this.sequence;
    for (const executable of ['espeak-ng', 'espeak']) {
      if (this.sequence !== request) return { ok: false, reason: 'cancelled' };
      const result = await this.generate(executable, text, speed as SpeechSpeed, request);
      if (result.ok || result.reason !== 'not-installed') return result;
    }
    return { ok: false, reason: 'not-installed' };
  }

  private generate(executable: string, text: string, speed: SpeechSpeed, request: number): Promise<LinuxSpeechResult> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      let total = 0;
      let tooLarge = false;
      let finished = false;
      let timedOut = false;
      const child = spawn(executable, ['--stdout', '--stdin', '-v', 'en-us', '-s', speed === 'slow' ? '135' : '175'], {
        shell: false, stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true,
      });
      this.current = child;
      const timeout = setTimeout(() => { timedOut = true; child.kill(); }, MAX_GENERATION_MS);
      const finish = (value: LinuxSpeechResult) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        if (this.current === child) this.current = null;
        resolve(value);
      };
      child.on('error', (error: NodeJS.ErrnoException) => {
        finish({ ok: false, reason: error.code === 'ENOENT' ? 'not-installed' : 'failed' });
      });
      child.stdout.on('data', (chunk: Buffer) => {
        total += chunk.length;
        if (total > MAX_WAV_BYTES) {
          tooLarge = true;
          child.kill();
          return;
        }
        chunks.push(chunk);
      });
      child.on('close', (code) => {
        if (this.sequence !== request) return finish({ ok: false, reason: 'cancelled' });
        if (timedOut || tooLarge || code !== 0) return finish({ ok: false, reason: 'failed' });
        const audio = Buffer.concat(chunks);
        finish(validWave(audio) ? { ok: true, wavBase64: audio.toString('base64') } : { ok: false, reason: 'failed' });
      });
      // If an executable is missing, its stdin can emit EPIPE; never crash.
      child.stdin.on('error', () => undefined);
      child.stdin.end(text, 'utf8');
    });
  }
}
