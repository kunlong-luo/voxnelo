import { createContext, useContext, type ReactNode } from 'react';
import { zh, type TranslationKey } from './locales/zh-CN';
import { en } from './locales/en-US';
export type { TranslationKey } from './locales/zh-CN';

export type Locale = 'zh-CN' | 'en-US';
export type LanguageSetting = 'system' | Locale;
export const LANGUAGE_STORAGE_KEY = 'voxnelo.language';
const strings = { zh, en } as const;

function systemLanguage(): string {
  if (typeof navigator === 'undefined') return 'zh-CN';
  return navigator.languages?.[0] || navigator.language || 'zh-CN';
}
export function resolveLocale(setting: LanguageSetting, system = systemLanguage()): Locale {
  if (setting !== 'system') return setting;
  return /^zh(?:-|$)/i.test(system) ? 'zh-CN' : 'en-US';
}
export function parseLanguageSetting(value: unknown): LanguageSetting {
  return value === 'system' || value === 'zh-CN' || value === 'en-US' ? value : 'zh-CN';
}
export function readLanguageSetting(): LanguageSetting {
  try { return parseLanguageSetting(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)); }
  catch { return 'zh-CN'; }
}
export function saveLanguageSetting(setting: LanguageSetting): void {
  try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, setting); } catch { /* session only */ }
}
export function setDocumentLocale(locale: Locale): void {
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
}
export function translate(locale: Locale, key: TranslationKey, params?: Record<string, string | number>): string {
  const template: string = strings[locale === 'en-US' ? 'en' : 'zh'][key];
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params?.[name] ?? '{' + name + '}'));
}
export interface I18nContextValue {
  locale: Locale;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}
const fallback: I18nContextValue = {
  locale: 'zh-CN',
  t: (key, params) => translate('zh-CN', key, params),
};
const LocaleContext = createContext<I18nContextValue>(fallback);
export function I18nProvider({locale, children}: {locale: Locale; children: ReactNode}) {
  const value: I18nContextValue = { locale, t: (key, params) => translate(locale, key, params) };
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export function useI18n(): I18nContextValue { return useContext(LocaleContext); }
