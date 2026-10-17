// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { APP_VERSION, SUPPORT_LINKS } from '@voxnelo/core';
import { I18nProvider } from '../apps/web/src/i18n';
import { SettingsView } from '../apps/web/src/SettingsView';

afterEach(cleanup);
const settingsProps = {
  speed: 'normal' as const,
  showIpa: true,
  appearance: 'sunset' as const,
  languageSetting: 'zh-CN' as const,
  onChangeAppearance: () => undefined,
  onChangeLanguage: () => undefined,
  onToggleSpeed: () => undefined,
  onToggleIpa: () => undefined,
  onBackToPractice: () => undefined,
};

describe('About and support in Settings', () => {
  it('shows true version, project, license, help and issue templates', () => {
    render(<I18nProvider locale="zh-CN"><SettingsView {...settingsProps}/></I18nProvider>);
    expect(screen.getByRole('heading', {name: '关于 Voxnelo'})).toBeTruthy();
    expect(screen.getByText('版本 '+APP_VERSION+' · Early Access 早期体验版')).toBeTruthy();
    expect(screen.getByRole('heading', {name: '帮助与反馈'})).toBeTruthy();
    const links: Array<[string,string]> = [
      ['查看开源项目', SUPPORT_LINKS.repository],
      ['开源许可证', SUPPORT_LINKS.license],
      ['使用帮助', SUPPORT_LINKS.guide],
      ['反馈问题', SUPPORT_LINKS.bugReport],
      ['功能建议', SUPPORT_LINKS.featureRequest],
    ];
    for (const [name,href] of links) {
      const link=screen.getByRole('link', {name: new RegExp(name)});
      expect(link.getAttribute('href')).toBe(href);
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
      expect(link.getAttribute('rel')).toContain('noreferrer');
    }
    expect(screen.getByText(/GitHub Issue 公开可见/)).toBeTruthy();
  });

  it('offers the same links and version in English', () => {
    render(<I18nProvider locale="en-US"><SettingsView {...settingsProps}/></I18nProvider>);
    expect(screen.getByRole('heading', {name: 'About Voxnelo'})).toBeTruthy();
    expect(screen.getByText('Version '+APP_VERSION+' · Early Access')).toBeTruthy();
    expect(screen.getByRole('heading', {name: 'Help & feedback'})).toBeTruthy();
    expect(screen.getByRole('link', {name: /Report an issue/}).getAttribute('href')).toBe(SUPPORT_LINKS.bugReport);
    expect(screen.getByRole('link', {name: /User guide/}).getAttribute('href')).toBe(SUPPORT_LINKS.guide);
  });
});
