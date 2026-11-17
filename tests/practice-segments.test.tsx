// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { practiceSegments, STARTER_SENTENCES, SENTENCES } from '@voxnelo/content';
import { speakPracticeSegment } from '@voxnelo/learning';
import { PronunciationGuide } from '../apps/web/src/PronunciationGuide';
import { I18nProvider } from '../apps/web/src/i18n';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const starter = (id: string) => {
  const sentence = STARTER_SENTENCES.find(item => item.id === id);
  if (!sentence) throw Error('Missing seed: ' + id);
  return sentence;
};

const guide = (id:string, options?: { locale?:'zh-CN'|'en-US'; busy?:boolean }) => {
  const onSpeakSegment = vi.fn();
  const current = starter(id);
  const ui = render(
    <I18nProvider locale={options?.locale ?? 'zh-CN'}>
      <PronunciationGuide sentence={current} showIpa recordingBusy={options?.busy ?? false}
        onToggleIpa={()=>undefined} onSpeak={()=>undefined} onSpeakSegment={onSpeakSegment}/>
    </I18nProvider>,
  );
  return { ...ui, onSpeakSegment };
};

describe('F102 deterministic segment listening and repeat', () => {
  it('splits the exact source text into safe readable chunks without generating IPA', () => {
    expect(practiceSegments(starter('s008'))).toEqual(['Nice to', 'meet you.', 'meet you']);
    expect(practiceSegments(starter('s023'))).toEqual(['Please wait', 'a moment.', 'wait a']);
    expect(practiceSegments(starter('s001'))).toEqual([]);
    const drafts = practiceSegments(SENTENCES[40]!);
    expect(drafts.every(part=>SENTENCES[40]!.english.includes(part))).toBe(true);
  });

  it('rejects stale editorial metadata and never invents a draft IPA or recording', () => {
    const seed = starter('s023');
    const changed = { ...seed, ipa:'/unverified/' };
    expect(practiceSegments(changed)).toEqual(['Please wait','a moment.']);
    expect(practiceSegments({ ...seed, reviewStatus:'needs-review' })).toEqual(['Please wait','a moment.']);
  });

  it('selects and speaks exactly the chosen span in Chinese without auto-recording', () => {
    const {onSpeakSegment} = guide('s023');
    const toggle = screen.getByRole('button',{name:'分段跟读'});
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const region = screen.getByRole('region',{name:'分段听读练习'});
    expect(region.textContent).toContain('Please wait');
    const option = screen.getByRole('button',{name:'wait a'});
    expect(option.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(option);
    expect(option.getAttribute('aria-pressed')).toBe('true');
    expect(region.textContent).toContain('当前片段： wait a');
    fireEvent.click(screen.getByRole('button',{name:'播放所选片段'}));
    expect(onSpeakSegment).toHaveBeenCalledOnce();
    expect(onSpeakSegment).toHaveBeenCalledWith('wait a');
    expect(region.textContent).toContain('系统英语语音合成');
    expect(region.textContent).toContain('录音按钮');
  });

  it('blocks TTS during recording but keeps chunk selection accessible', () => {
    const {onSpeakSegment}=guide('s023',{busy:true,locale:'en-US'});
    fireEvent.click(screen.getByRole('button',{name:'Listen & repeat in chunks'}));
    const play=screen.getByRole('button',{name:'Play selected chunk'});
    expect(play.hasAttribute('disabled')).toBe(true);
    fireEvent.click(play);
    expect(onSpeakSegment).not.toHaveBeenCalled();
    expect(screen.getByRole('button',{name:'wait a'}).hasAttribute('disabled')).toBe(false);
  });

  it('resets segment selection when the sentence changes', () => {
    const { rerender, onSpeakSegment } = guide('s023');
    fireEvent.click(screen.getByRole('button',{name:'分段跟读'}));
    fireEvent.click(screen.getByRole('button',{name:'wait a'}));
    expect(screen.getByRole('button',{name:'wait a'}).getAttribute('aria-pressed')).toBe('true');
    // The PracticeCard keys the guide by sentence ID, so a new sentence remounts it.
    rerender(<I18nProvider locale="zh-CN"><PronunciationGuide key="s008" sentence={starter('s008')}
      showIpa recordingBusy={false} onSpeakSegment={onSpeakSegment}
      onToggleIpa={()=>undefined} onSpeak={()=>undefined}/></I18nProvider>);
    expect(screen.queryByRole('button',{name:'wait a'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'分段跟读'}));
    expect(screen.getByRole('button',{name:'Nice to'}).getAttribute('aria-pressed')).toBe('true');
  });

  it('fails closed on arbitrary, edited or stale phrase playback requests', async () => {
    const current=starter('s023');
    expect(await speakPracticeSegment(current, 'arbitrary prompt')).toMatchObject({ok:false});
    expect(await speakPracticeSegment({...current,english:'Please wait a second.'},'wait a')).toMatchObject({ok:false});
    expect(await speakPracticeSegment({...current,ipa:'/altered/'},'wait a')).toMatchObject({ok:false});
  });
});
