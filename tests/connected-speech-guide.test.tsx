// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CONNECTED_SPEECH_GUIDES, getConnectedSpeechGuide, SENTENCES, STARTER_SENTENCES } from '@voxnelo/content';
import { PronunciationGuide } from '../apps/web/src/PronunciationGuide';
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
    expect(Object.keys(CONNECTED_SPEECH_GUIDES).length).toBeGreaterThanOrEqual(4);
    for(const [id,guide] of Object.entries(CONNECTED_SPEECH_GUIDES)){
      const s=SENTENCES.find(item=>item.id===id);
      expect(s?.english).toBe(guide.english);
      expect(getConnectedSpeechGuide(s!),id).toBe(guide);
      expect(guide.spokenIpa).toMatch(/^\[.+\]$/u);
      expect(guide.rules.length).toBeGreaterThan(0);
      for(const rule of guide.rules){
        expect(guide.english.toLowerCase()).toContain(rule.span.toLowerCase());
        expect(rule.spokenIpa).toMatch(/^\[.+\]$/u);
        expect(rule.descriptionZh.length).toBeGreaterThan(12);
        expect(rule.descriptionEn.length).toBeGreaterThan(20);
      }
    }
    expect(getConnectedSpeechGuide({...starter('s022'),english:'Different wording'})).toBeUndefined();
    expect(getConnectedSpeechGuide({...starter('s022'),reviewStatus:'needs-review'})).toBeUndefined();
    expect(getConnectedSpeechGuide(SENTENCES[40]!)).toBeUndefined();
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
    expect(region.textContent).toContain('/j/');
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
  it('keeps listening disabled during recording and allows keyboard-accessible rules',()=>{
    const {onSpeak}=renderGuide('s008','zh-CN',true);
    expect(screen.getByRole('button',{name:'播放短句发音'}).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button',{name:'播放短句发音'}));
    expect(onSpeak).not.toHaveBeenCalled();
    expect(screen.getByRole('button',{name:'查看连读规则'}).hasAttribute('disabled')).toBe(false);
  });
});
