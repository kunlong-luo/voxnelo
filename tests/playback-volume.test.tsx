// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { I18nProvider } from '../apps/web/src/i18n';
import { SettingsView } from '../apps/web/src/SettingsView';
import {
  PLAYBACK_VOLUME_KEY, VOLUME_LEVELS, parsePlaybackVolume,
  readPlaybackVolume, savePlaybackVolume,
} from '../apps/web/src/audioPreferences';

beforeEach(()=>window.localStorage.clear());
afterEach(()=>{cleanup();window.localStorage.clear();vi.restoreAllMocks();});

const settingsProps={
  speed:'normal' as const,showIpa:true,appearance:'nordic' as const,
  onChangeAppearance:()=>undefined,onToggleSpeed:()=>undefined,
  onToggleIpa:()=>undefined,onBackToPractice:()=>undefined,
};

describe('F107 independent output volume',()=>{
  it('accepts exactly five safe levels, falls back on corrupt stored values and persists across reloads',()=>{
    expect(VOLUME_LEVELS).toEqual([0,0.25,0.5,0.75,1]);
    expect(parsePlaybackVolume('0')).toBe(0);
    expect(parsePlaybackVolume('0.5')).toBe(0.5);
    expect(parsePlaybackVolume('2')).toBe(1);
    expect(parsePlaybackVolume('NaN')).toBe(1);
    expect(parsePlaybackVolume(null)).toBe(1);
    expect(parsePlaybackVolume('0.43')).toBe(1);
    expect(readPlaybackVolume()).toBe(1);
    savePlaybackVolume(0.25);
    expect(window.localStorage.getItem(PLAYBACK_VOLUME_KEY)).toBe('0.25');
    expect(readPlaybackVolume()).toBe(0.25);
    savePlaybackVolume(0);
    expect(readPlaybackVolume()).toBe(0);
  });

  it('exposes accessible five-level volume controls in Chinese and calls back the selected setting',()=>{
    const onChangeVolume=vi.fn();
    const view=render(<I18nProvider locale="zh-CN">
      <SettingsView {...settingsProps} volume={0.5} onChangeVolume={onChangeVolume}/>
    </I18nProvider>);
    const group=screen.getByRole('group',{name:'播放音量'});
    expect(within(group).getAllByRole('button')).toHaveLength(5);
    const selected=within(group).getByRole('button',{name:'播放音量 50%'});
    expect(selected.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(group).getByRole('button',{name:'播放音量 0%'}));
    expect(onChangeVolume).toHaveBeenCalledWith(0);
    view.rerender(<I18nProvider locale="zh-CN">
      <SettingsView {...settingsProps} volume={0} onChangeVolume={onChangeVolume}/>
    </I18nProvider>);
    expect(within(group).getByRole('button',{name:'播放音量 0%'}).getAttribute('aria-pressed')).toBe('true');
    expect(within(group).getByText(/不改变麦克风输入/)).toBeTruthy();
  });

  it('shows English controls without offering active buttons when the save callback is absent',()=>{
    render(<I18nProvider locale="en-US"><SettingsView {...settingsProps}/></I18nProvider>);
    const group=screen.getByRole('group',{name:'Playback volume'});
    expect(within(group).getByRole('button',{name:'Playback volume 100%'}).hasAttribute('disabled')).toBe(true);
    expect(within(group).getByText(/microphone input/)).toBeTruthy();
  });
});