import { ArrowLeft, AudioLines, Check, Languages, Palette, ShieldCheck, Settings2 } from 'lucide-react';
import type { AppearanceTheme } from './appearance';
import { useI18n, type LanguageSetting } from './i18n';

interface SettingsViewProps {
  speed: 'normal' | 'slow';
  showIpa: boolean;
  appearance: AppearanceTheme;
  languageSetting?: LanguageSetting;
  onChangeAppearance: (theme: AppearanceTheme) => void;
  onChangeLanguage?: (language: LanguageSetting) => void;
  onToggleSpeed: () => void;
  onToggleIpa: () => void;
  onBackToPractice: () => void;
}

const appearanceIds: AppearanceTheme[] = ['nordic', 'sunset'];
const languageIds: LanguageSetting[] = ['system', 'zh-CN', 'en-US'];

/** A fully styled appearance and language picker, never a platform-native select. */
export function SettingsView({
  speed, showIpa, appearance, languageSetting = 'system', onChangeAppearance, onChangeLanguage,
  onToggleSpeed, onToggleIpa, onBackToPractice,
}: SettingsViewProps) {
  const { t, locale } = useI18n();
  return (
    <div className="settingsPage">
      <div className="libraryTitle">
        <div>
          <div className="eyebrow"><Settings2 size={16} /> {t('settingsEyebrow')}</div>
          <h1>{t('settingsTitle')}</h1>
          <p>{t('settingsSummary')}</p>
        </div>
        <button type="button" className="backPractice" onClick={onBackToPractice}>
          <ArrowLeft size={17} /> {t('backPractice')}
        </button>
      </div>
      <div className="settingsGrid">
        <section className="settingsPanel appearanceSettings">
          <div className="settingsPanelHeading"><Palette size={21} /><h2>{t('appearanceTitle')}</h2></div>
          <p>{t('appearanceDesc')}</p>
          <div className="appearanceChoices" role="group" aria-label={t('appearanceGroup')}>
            {appearanceIds.map((id) => {
              const name = t(id === 'nordic' ? 'nordicName' : 'sunsetName');
              return (
                <button type="button" className="appearanceChoice" key={id}
                  onClick={() => onChangeAppearance(id)}
                  aria-label={t('appearanceChoose',{name})} aria-pressed={appearance === id}>
                  <span className={'appearancePreview ' + id} aria-hidden="true" />
                  <strong>{name} {appearance === id ? <Check size={15} aria-hidden="true" /> : null}</strong>
                  <small>{t(id === 'nordic' ? 'nordicSummary' : 'sunsetSummary')}</small>
                </button>
              );
            })}
          </div>
          <p className="appearanceHelp">{t('appearanceNote')}</p>
        </section>
        <section className="settingsPanel languageSettings">
          <div className="settingsPanelHeading"><Languages size={21} /><h2>{t('languageTitle')}</h2></div>
          <p>{t('languageDesc')}</p>
          <div className="languageChoices" role="group" aria-label={t('languageGroup')}>
            {languageIds.map((id) => (
              <button className="languageChoice" type="button" key={id}
                aria-pressed={languageSetting === id}
                onClick={() => onChangeLanguage?.(id)}>
                <span className="languageChoiceTop">
                  <strong>{t(id === 'system' ? 'languageSystem' : id === 'zh-CN' ? 'languageChinese' : 'languageEnglish')}</strong>
                  {languageSetting === id ? <Check size={16} aria-hidden="true" /> : null}
                </span>
                <small>{id === 'system'
                  ? t('languageSystemDetail',{name:t(locale === 'zh-CN' ? 'languageChinese' : 'languageEnglish')})
                  : t('languageManualDetail')}</small>
              </button>
            ))}
          </div>
          <p className="appearanceHelp">{t('languageContentNote')}</p>
        </section>
        <section className="settingsPanel">
          <div className="settingsPanelHeading"><AudioLines size={21} /><h2>{t('voiceTitle')}</h2></div>
          <p>{t('voiceDesc')}</p>
          <button type="button" className="settingToggle" onClick={onToggleSpeed} aria-pressed={speed === 'slow'}>
            <span><strong>{t('slowMode')}</strong><small>{t('slowModeHint')}</small></span>
            <span className={'switchTrack' + (speed === 'slow' ? ' on' : '')}><span /></span>
          </button>
        </section>
        <section className="settingsPanel">
          <div className="settingsPanelHeading"><Languages size={21} /><h2>{t('contentTitle')}</h2></div>
          <p>{t('contentDesc')}</p>
          <button type="button" className="settingToggle" onClick={onToggleIpa} aria-pressed={showIpa}>
            <span><strong>{t('showIpa')}</strong><small>{t('showIpaHint')}</small></span>
            <span className={'switchTrack' + (showIpa ? ' on' : '')}><span /></span>
          </button>
        </section>
        <section className="settingsPanel privacySettings">
          <div className="settingsPanelHeading"><ShieldCheck size={21} /><h2>{t('localPrivacyTitle')}</h2></div>
          <p>{t('localPrivacyDesc')}</p>
        </section>
      </div>
    </div>
  );
}
