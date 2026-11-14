// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CONNECTED_SPEECH_GUIDES, getConnectedSpeechGuide, splitConnectedSpeechSpan, SENTENCES, STARTER_SENTENCES } from '@voxnelo/content';
import { PronunciationGuide } from '../apps/web/src/PronunciationGuide';
import { LibraryView } from '../apps/web/src/LibraryView';
import { I18nProvider } from '../apps/web/src/i18n';

afterEach(cleanup);

const starter=(id:string)=>{
  const sentence=STARTER_SENTENCES.find(s=>s.id===id);
  if(!sentence)throw Error('Missing seed sentence: '+id);
  return sentence;
};
const renderGuide=(id:string,locale:'zh-CN'|'en-US'='zh-CN',recordingBusy=false)=>{
  const onSpeak=vi.fn();
  const onToggleIpa=vi.fn();
  const ui=render(<I18nProvider locale={locale}><PronunciationGuide key={id}
    sentence={starter(id)} showIpa recordingBusy={recordingBusy}
    onSpeak={onSpeak} onToggleIpa={onToggleIpa}/></I18nProvider>);
  return {...ui,onSpeak,onToggleIpa};
};

describe('curated connected-speech metadata',()=>{
  it('is finite, sentence-bound and does not invent transcriptions for all expanded material',()=>{
    expect(Object.keys(CONNECTED_SPEECH_GUIDES)).toHaveLength(10);
    for(const [id,guide] of Object.entries(CONNECTED_SPEECH_GUIDES)){
      const s=SENTENCES.find(item=>item.id===id);
      expect(s?.english).toBe(guide.english);
      expect(s?.ipa).toBe(guide.standardIpa);
      expect(guide.reviewStatus).toBe('editorial-draft');
      expect(getConnectedSpeechGuide(s!),id).toBe(guide);
      expect(guide.spokenIpa).toMatch(/^\[.+\]$/u);
      expect(guide.rules.length).toBeGreaterThan(0);
      for(const rule of guide.rules){
        expect(guide.english.toLowerCase()).toContain(rule.span.toLowerCase());
        expect(splitConnectedSpeechSpan(guide.english,rule.span)?.match).toBe(rule.span);
        const start=guide.english.toLowerCase().indexOf(rule.span.toLowerCase());
        expect(start, id+' rule start').toBeGreaterThanOrEqual(0);
        expect(/[a-z']/iu.test(guide.english[start-1]??''),id+' span begins at word boundary').toBe(false);
        expect(/[a-z']/iu.test(guide.english[start+rule.span.length]??''),id+' span ends at word boundary').toBe(false);
        expect(rule.spokenIpa).toMatch(/^\[.+\]$/u);
        expect(rule.descriptionZh.length).toBeGreaterThan(12);
        expect(rule.descriptionEn.length).toBeGreaterThan(20);
      }
    }
    expect(getConnectedSpeechGuide({...starter('s022'),english:'Different wording'})).toBeUndefined();
    expect(getConnectedSpeechGuide({...starter('s022'),ipa:'/changed standard phonemes/'})).toBeUndefined();
    expect(getConnectedSpeechGuide({...starter('s022'),reviewStatus:'needs-review'})).toBeUndefined();
    expect(getConnectedSpeechGuide(SENTENCES[40]!)).toBeUndefined();
    expect(splitConnectedSpeechSpan('you and you','you')).toBeUndefined();
    expect(splitConnectedSpeechSpan('learning','earn')).toBeUndefined();
    expect(splitConnectedSpeechSpan('Please wait a moment.','wait a')).toEqual({
      before:'Please ',match:'wait a',after:' moment.',
    });
  });
});

describe('practice short-phrase pronunciation guide',()=>{
  it('displays original sentence IPA and one annotated casual IPA, then expands rule details',()=>{
    const {onSpeak,onToggleIpa}=renderGuide('s022');
    expect(screen.getByTestId('standard-ipa').textContent).toBe('/kæn juː hɛlp miː/');
    expect(screen.getByTestId('connected-ipa').textContent).toBe('[kən jə ˈhɛlp mi]');
    expect(screen.queryByRole('region',{name:'连读规则解析'})).toBeNull();
    const toggle=screen.getByRole('button',{name:/查看连读规则/});
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(toggle);
    const region=screen.getByRole('region',{name:'连读规则解析'});
    expect(region.textContent).toContain('弱读');
    expect(region.textContent).toContain('Can you');
    expect(region.textContent).toContain('[jə]');
    expect(screen.getByTestId('connected-active-span').textContent).toBe('Can you');
    expect(screen.getByText('教学示例 · 待语言学复核')).toBeTruthy();
    expect(screen.getByRole('button',{name:'收起连读规则'}).getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByRole('button',{name:'播放短句发音'}));
    expect(onSpeak).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button',{name:'收起音标'}));
    expect(onToggleIpa).toHaveBeenCalledOnce();
  });
  it('localizes explanations and does not claim TTS exactly models connected IPA',()=>{
    renderGuide('s023','en-US');
    fireEvent.click(screen.getByRole('button',{name:'Show connected-speech rules'}));
    const details=screen.getByRole('region',{name:'Connected-speech rules explained'});
    expect(details.textContent).toContain('American T-flapping');
    expect(details.textContent).toContain('intervocalic');
    expect(screen.getByText(/not a transcript of the current system voice/)).toBeTruthy();
    expect(screen.getByText(/Teaching example · linguist review pending/)).toBeTruthy();
  });
  it('does not fake connected IPA for a seed sentence without curated metadata',()=>{
    const {onSpeak}=renderGuide('s001');
    expect(screen.getByTestId('standard-ipa').textContent).toBe('/həˈloʊ/');
    expect(screen.queryByTestId('connected-ipa')).toBeNull();
    expect(screen.getByText(/尚无经校对的自然语流音标/)).toBeTruthy();
    expect(screen.queryByRole('button',{name:'查看连读规则'})).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'播放短句发音'}));
    expect(onSpeak).toHaveBeenCalledOnce();
  });
  it('explains both weak forms and American flapping when a sentence has two rules',()=>{
    renderGuide('s009','zh-CN');
    expect(screen.getByTestId('connected-ipa').textContent).toBe('[si jə ˈleɪɾɚ]');
    fireEvent.click(screen.getByRole('button',{name:'查看连读规则'}));
    const region=screen.getByRole('region',{name:'连读规则解析'});
    expect(region.textContent).toContain('弱读');
    expect(region.textContent).toContain('美式闪音');
    expect(screen.getByTestId('connected-active-span').textContent).toBe('you');
    const second=screen.getByRole('button',{name:/美式闪音.*later/});
    expect(second.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(second);
    expect(second.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('connected-active-span').textContent).toBe('later');
    expect(region.textContent).toContain('[ˈleɪɾɚ]');
    expect(region.textContent).toContain('元音之间');
    const first=screen.getByRole('button',{name:/弱读.*you/});
    fireEvent.click(first);
    expect(first.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('connected-active-span').textContent).toBe('you');
  });
  it('keeps listening disabled during recording and allows keyboard-accessible rules',()=>{
    const {onSpeak}=renderGuide('s008','zh-CN',true);
    expect(screen.getByRole('button',{name:'播放短句发音'}).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'播放短句发音'}));
    expect(onSpeak).not.toHaveBeenCalled();
    expect(screen.getByRole('button',{name:'查看连读规则'}).hasAttribute('disabled')).toBe(false);
  });
});

describe('favorites and review list pronunciation preview',()=>{
  const state={
    sentenceId:'s022',seenCount:2,practicedCount:1,favorite:true,review:true,lastSeenAt:1000,
  };
  for(const view of ['favorites','review'] as const){
    it(view+' previews only existing pronunciation evidence, then opens the full guide',()=>{
      const onChoose=vi.fn();
      const {container}=render(<LibraryView view={view} states={[state]} events={[]}
        search="" notice="" onSearch={()=>undefined} onBackToPractice={()=>undefined}
        onChoose={onChoose}/>);
      const row=container.querySelector('.libraryItem');
      expect(row?.textContent).toContain('/kæn juː hɛlp miː/');
      expect(row?.textContent).toContain('[kən jə ˈhɛlp mi]');
      fireEvent.click(row as HTMLElement);
      expect(onChoose).toHaveBeenCalledWith(expect.objectContaining({id:'s022'}));
    });
  }
});
