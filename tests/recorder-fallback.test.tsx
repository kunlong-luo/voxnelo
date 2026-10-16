// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRecorder } from '../apps/web/src/useRecorder';
import { PracticeView } from '../apps/web/src/PracticeView';
import { FIRST_SENTENCE } from '@voxnelo/content';

const originalDevices = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (originalDevices) Object.defineProperty(navigator, 'mediaDevices', originalDevices);
  else Reflect.deleteProperty(navigator, 'mediaDevices');
});

function RecorderFixture() {
  const recorder=useRecorder();
  return <div>
    <button onClick={() => void recorder.start()}>Test recording</button>
    <output data-testid="recorder-status">{recorder.status}</output>
    {recorder.error && <p role="status">{recorder.error}</p>}
  </div>;
}

function failingDevice(errorName: string) {
  vi.stubGlobal('MediaRecorder', class FakeMediaRecorder {});
  const failure=Object.assign(new Error('Microphone unavailable'),{name:errorName});
  Object.defineProperty(navigator,'mediaDevices',{
    configurable:true,value:{getUserMedia:vi.fn().mockRejectedValue(failure)},
  });
}

describe('Nonblocking microphone fallback', () => {
  it.each(['NotFoundError','NotReadableError','OverconstrainedError'])(
    'shows gentle missing-device guidance for %s, without locking practice',
    async errorName => {
      failingDevice(errorName);
      render(<RecorderFixture/>);
      fireEvent.click(screen.getByRole('button',{name:'Test recording'}));
      expect(await screen.findByText(/暂未检测到可用麦克风/)).toBeTruthy();
      expect(screen.getByTestId('recorder-status').textContent).toBe('idle');
      expect((screen.getByRole('button',{name:'Test recording'}) as HTMLButtonElement).disabled).toBe(false);
    },
  );
  it('treats denied device access differently', async () => {
    failingDevice('NotAllowedError');
    render(<RecorderFixture/>);
    fireEvent.click(screen.getByRole('button',{name:'Test recording'}));
    await waitFor(()=>expect(screen.getByText(/尚未获授权/)).toBeTruthy());
    expect(screen.queryByText(/暂未检测到可用麦克风/)).toBeNull();
  });
  it('keeps no-device notices inside the learning card as a nonblocking status', () => {
    const recorder = {
      status:'idle' as const, recordingUrl:null, error:'暂未检测到可用麦克风，可以先畅听示范或收藏喜欢的句子。',
      start: async()=>undefined, stop:()=>undefined, clearAudio:()=>undefined,
    };
    render(<PracticeView current={FIRST_SENTENCE} currentState={undefined}
      stats={{viewed:0,practiced:0,favorites:0,review:0}}
      speed="normal" showIpa={false} notice="" recorder={recorder}
      dictation={{status:'idle',active:false,mode:'local',chooseMode:()=>undefined,
        supported:false,browserModeAvailable:true,desktopReason:'not-configured' as const,noiseReduction:'unknown' as const,localPack:'unknown',finalText:'',interimText:'',
        error:'',start:async()=>undefined,stop:()=>undefined,clear:()=>undefined,installLocal:async()=>undefined}}
      onStartDictation={()=>undefined} recordingBusy={false} canGoPrevious={false}
      onToggleIpa={()=>undefined} onSpeak={()=>undefined} onToggleSpeed={()=>undefined}
      onRecord={()=>undefined} onToggleFlag={()=>undefined}
      onNext={()=>undefined} onPrevious={()=>undefined} onDismissNotice={()=>undefined}/>);
    expect(screen.getByText('暂未检测到可用麦克风，可以先畅听示范或收藏喜欢的句子。')).toBeTruthy();
    expect((screen.getByRole('button',{name:'播放标准朗读'}) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button',{name:'收藏'}) as HTMLButtonElement).disabled).toBe(false);
  });
});
