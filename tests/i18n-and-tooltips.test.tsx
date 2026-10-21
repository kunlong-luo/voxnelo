// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from '../apps/web/src/App';
import { translate, resolveLocale, parseLanguageSetting, LANGUAGE_STORAGE_KEY } from '../apps/web/src/i18n';
import { Tooltip } from '../apps/web/src/Tooltip';
import { zh } from '../apps/web/src/locales/zh-CN';
import { en } from '../apps/web/src/locales/en-US';

const languageDescriptor = Object.getOwnPropertyDescriptor(navigator, 'language');
const languagesDescriptor = Object.getOwnPropertyDescriptor(navigator, 'languages');
beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(navigator, 'language', { configurable:true, value:'en-US' });
  Object.defineProperty(navigator, 'languages', { configurable:true, value:['en-US'] });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  if (languageDescriptor) Object.defineProperty(navigator, 'language', languageDescriptor);
  else Reflect.deleteProperty(navigator, 'language');
  if (languagesDescriptor) Object.defineProperty(navigator, 'languages', languagesDescriptor);
  else Reflect.deleteProperty(navigator, 'languages');
  vi.restoreAllMocks();
});

describe('Type-safe localization resources',()=>{
  it('keeps all localized keys and placeholders in sync and nonempty',()=>{
    const zhKeys=Object.keys(zh);
    const enKeys=Object.keys(en);
    expect(zhKeys).toHaveLength(285);
    expect(enKeys.sort()).toEqual([...zhKeys].sort());
    const placeholders=(value:string)=>[...value.matchAll(/\\{(\\w+)\\}/g)].map(v=>v[1]).sort();
    for(const key of zhKeys){
      const translationKey=key as keyof typeof zh;
      expect(zh[translationKey].trim().length).toBeGreaterThan(0);
      expect(en[translationKey].trim().length).toBeGreaterThan(0);
      expect(placeholders(zh[translationKey])).toEqual(placeholders(en[translationKey]));
    }
  });
});

describe('Chinese-first bilingual UI (V0.1 PRD F001)', () => {
  it('resolves unsupported locales, Chinese locales, and invalid stored overrides safely', () => {
    expect(parseLanguageSetting(undefined)).toBe('zh-CN');
    expect(parseLanguageSetting('other')).toBe('zh-CN');
    expect(parseLanguageSetting('system')).toBe('system');
    expect(parseLanguageSetting('en-US')).toBe('en-US');
    expect(resolveLocale('system', 'zh-TW')).toBe('zh-CN');
    expect(resolveLocale('system', 'fr-FR')).toBe('en-US');
    expect(resolveLocale('zh-CN', 'en-US')).toBe('zh-CN');
    expect(translate('en-US','coursePosition',{index:4,total:40})).toBe('Sentence 4 of 40');
    expect(translate('zh-CN','coursePosition',{index:4,total:40})).toBe('课程位置，第 4 句，共 40 句');
  });

  it('starts in Chinese even on an English OS, then allows explicit English without resetting practice', () => {
    render(<App />);
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(screen.getByRole('button',{name:'开始练习'})).toBeTruthy();
    expect(screen.getByRole('button',{name:'开口跟读'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'设置'}));
    expect(screen.getByRole('heading',{name:'界面语言'})).toBeTruthy();
    expect(screen.getByRole('button',{name:/^简体中文/}).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button',{name:/English/}));
    expect(document.documentElement.lang).toBe('en-US');
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en-US');
    expect(screen.getByRole('heading',{name:'Practice settings'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Back to practice'}));
    expect(screen.getByRole('button',{name:'Speak now'})).toBeTruthy();
    expect(screen.getByRole('button',{name:'Next sentence'})).toBeTruthy();
  });

  it('re-applies explicit English after remount and returns to live system language', () => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY,'en-US');
    const first=render(<App />);
    expect(screen.getByRole('button',{name:'Settings'})).toBeTruthy();
    first.unmount();
    render(<App />);
    fireEvent.click(screen.getByRole('button',{name:'Settings'}));
    fireEvent.click(screen.getByRole('button',{name:/Follow system/}));
    expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('system');
    Object.defineProperty(navigator,'languages',{configurable:true,value:['zh-CN']});
    act(() => window.dispatchEvent(new Event('languagechange')));
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(screen.getByRole('heading',{name:'练习设置'})).toBeTruthy();
  });
});

describe('App styled tooltip', () => {
  it('shows a branded tooltip element without any platform-native title attribute', () => {
    const {container}=render(<Tooltip text="收藏"><button type="button" aria-label="收藏">♥</button></Tooltip>);
    expect(container.querySelector('[title]')).toBeNull();
    expect(container.querySelector('button[aria-label="收藏"]')).toBeTruthy();
    expect(screen.getByRole('button',{name:'收藏'})).toBeTruthy();
  });
});
