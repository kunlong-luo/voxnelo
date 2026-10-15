import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, MessageCircle, Settings2, ShieldCheck, Square, Star, type LucideIcon } from 'lucide-react';
import {
  APP_VERSION,
  FIRST_SENTENCE,
  pickNext,
  primeSpeechVoices,
  SENTENCES,
  silence,
  speak,
  summarize,
  type Sentence,
} from '@voxnelo/learning';
import { useRecorder } from './useRecorder';
import { useLearningData } from './useLearningData';
import { PracticeView } from './PracticeView';
import { LibraryView, type View } from './LibraryView';
import { SettingsView } from './SettingsView';
import { DesktopTitlebar } from './DesktopTitlebar';
import { applyAppearance, readAppearance, saveAppearance, type AppearanceTheme } from './appearance';
import { I18nProvider, readLanguageSetting, resolveLocale, saveLanguageSetting, setDocumentLocale, useI18n, type LanguageSetting } from './i18n';

const menu: { id: View; label: string; accessibleLabel: string; icon: LucideIcon }[] = [
  { id: 'practice', label: '练习', accessibleLabel: '开始练习', icon: MessageCircle },
  { id: 'favorites', label: '收藏', accessibleLabel: '我的收藏', icon: Star },
  { id: 'history', label: '历史', accessibleLabel: '最近学习', icon: Clock3 },
  { id: 'review', label: '复习', accessibleLabel: '需要复习', icon: BarChart3 },
  { id: 'settings', label: '设置', accessibleLabel: '设置', icon: Settings2 },
];

/** Default locale follows OS; explicit user choice is stored locally. */
export function App() {
  const [languageSetting, setLanguageSetting] = useState<LanguageSetting>(readLanguageSetting);
  const [systemLanguage, setSystemLanguage] = useState(
    () => navigator.languages?.[0] || navigator.language || 'zh-CN',
  );
  useEffect(() => {
    const changed = () => setSystemLanguage(navigator.languages?.[0] || navigator.language || 'zh-CN');
    window.addEventListener('languagechange', changed);
    return () => window.removeEventListener('languagechange', changed);
  }, []);
  const locale = resolveLocale(languageSetting, systemLanguage);
  useEffect(() => { setDocumentLocale(locale); }, [locale]);
  const changeLanguage = (next: LanguageSetting) => {
    setLanguageSetting(next);
    saveLanguageSetting(next);
  };
  return (
    <I18nProvider locale={locale}>
      <AppScreen languageSetting={languageSetting} onChangeLanguage={changeLanguage} />
    </I18nProvider>
  );
}

/** Learning state and recording logic are independent from display locale. */
function AppScreen({languageSetting,onChangeLanguage}: {
  languageSetting: LanguageSetting;
  onChangeLanguage: (next: LanguageSetting) => void;
}) {
  const {t} = useI18n();
  const [sentenceId, setSentenceId] = useState(FIRST_SENTENCE.id);
  const [view, setView] = useState<View>('practice');
  const [visited, setVisited] = useState<string[]>([FIRST_SENTENCE.id]);
  const [historyPosition, setHistoryPosition] = useState(0);
  const [speed, setSpeed] = useState<'normal' | 'slow'>('normal');
  const [showIpa, setShowIpa] = useState(true);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [appearance, setAppearance] = useState<AppearanceTheme>(readAppearance);
  const recorder = useRecorder();
  const current = useMemo(() => SENTENCES.find((item) => item.id === sentenceId) ?? FIRST_SENTENCE, [sentenceId]);
  const recordingBusy = recorder.status === 'requesting' || recorder.status === 'recording';
  const notify = useCallback((message: string) => setNotice(message), []);
  const { states, events, setFlag } = useLearningData(notify, sentenceId, current.id, recorder.recordingUrl);
  const currentState = states.find((item) => item.sentenceId === current.id);
  const stats = summarize(states);

  useEffect(() => {
    primeSpeechVoices();
  }, []);

  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  const changeAppearance = (next: AppearanceTheme) => {
    setAppearance(next);
    saveAppearance(next);
  };

  const display = useCallback(
    (target: Sentence) => {
      if (recordingBusy) {
        setNotice(t('recordingGuard'));
        return;
      }
      silence();
      recorder.clearAudio();
      setNotice('');
      setSentenceId(target.id);
      setView('practice');
      setVisited((history) => [...history.slice(0, historyPosition + 1), target.id]);
      setHistoryPosition((position) => position + 1);
    },
    [recordingBusy, historyPosition, recorder, t],
  );

  const nextSentence = useCallback(() => {
    if (recordingBusy) return;
    if (historyPosition < visited.length - 1) {
      const target = SENTENCES.find((s) => s.id === visited[historyPosition + 1]);
      if (target) {
        setHistoryPosition(historyPosition + 1);
        setSentenceId(target.id);
        recorder.clearAudio();
        silence();
        return;
      }
    }
    const next = pickNext(states, current.id, visited);
    if (next) display(next);
  }, [recordingBusy, historyPosition, visited, states, current.id, display, recorder]);

  const previousSentence = useCallback(() => {
    if (historyPosition <= 0 || recordingBusy) return;
    const targetId = visited[historyPosition - 1];
    if (!targetId) return;
    setHistoryPosition(historyPosition - 1);
    setSentenceId(targetId);
    recorder.clearAudio();
    silence();
  }, [historyPosition, recordingBusy, visited, recorder]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (view !== 'practice' || recordingBusy || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && typeof target.closest === 'function' && target.closest('input, textarea')) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        nextSentence();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previousSentence();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [view, recordingBusy, nextSentence, previousSentence]);

  const chooseFromLibrary = (item: Sentence) => {
    if (recordingBusy) {
      setNotice(t('recordingNavigate'));
      return;
    }
    display(item);
  };

  const toggleFlag = (flag: 'favorite' | 'review') => {
    void setFlag(current.id, flag, !currentState?.[flag]);
  };

  const playDemo = async () => {
    if (recordingBusy) {
      setNotice(t('recordingPlay'));
      return;
    }
    const result = await speak(current.english, speed);
    if (result.cancelled) return;
    if (result.ok) { setNotice(''); return; }
    const message = result.message ?? '';
    const issue = message.includes('sudo apt install espeak-ng') ? 'speechInstall'
      : message.includes('未找到可用的英语语音') ? 'speechUnavailable'
      : message.includes('已生成英语语音') ? 'speechPlayback'
      : message.includes('Linux 本地英语语音服务') ? 'speechSystemError'
      : message.includes('Linux 英语语音生成失败') ? 'speechSynthesisError'
      : 'speechFailed';
    setNotice(t(issue));
  };

  const handleRecorder = () => {
    if (recorder.status === 'recording') {
      recorder.stop();
    } else {
      // 示范音与录音不可重叠，防止把扬声器输出录为自己的跟读。
      silence();
      void recorder.start();
    }
  };

  const nav = (target: View) => {
    if (recordingBusy && target !== 'practice') {
      setNotice(t('recordingChangeView'));
      return;
    }
    setView(target);
    setSearch('');
    setNotice('');
  };

  return (
    <div className={window.voxneloDesktop?.windowControls ? "appFrame desktopFrame" : "appFrame"}>
      <DesktopTitlebar />
      <div className="shell">
      <aside className="sidebar">
        <div className="brand" aria-label="Voxnelo">
          <div className="brandMark"><img src="/brand/voxnelo-mark.svg" alt="" width="48" height="48" /></div>
          <div className="brandText"><strong>Voxnelo</strong></div>
        </div>
        <div className="sidebarHint">{t('sidebarSpace')}</div>
        <nav aria-label={t('navLabel')}>
          {menu.map(({ id, icon: Icon }) => (
            <button key={id} className={`navItem ${view === id ? 'active' : ''}`} aria-label={t(({practice:'navStart',favorites:'navMyFavorites',history:'navRecent',review:'navReviewItems',settings:'navSettings'} as const)[id])} aria-current={view === id ? 'page' : undefined} onClick={() => nav(id)}>
              <Icon size={20} strokeWidth={1.9} />
              <span>{t(({practice:'navPractice',favorites:'navFavorites',history:'navHistory',review:'navReview',settings:'navSettings'} as const)[id])}</span>
              {id === 'favorites' && stats.favorites > 0 ? <span className="navCount">{stats.favorites}</span> : null}
            </button>
          ))}
        </nav>
        <div className="sidebarBottom">
          <div className="tinyPanel privacyPanel">
            <span className="tinyBadge"><ShieldCheck size={17} /></span>
            <strong>{t('sidebarRhythm')}</strong>
            <span>{t('sidebarLocal')}</span>
          </div>
          <div className="sidebarVersion">Voxnelo · Early Access {APP_VERSION}</div>
        </div>
      </aside>
      <div className="mainArea">
        {recorder.status === 'recording' ? (
          <button type="button" className="recordingQuickStop" onClick={handleRecorder}
            aria-label={t("stopFloating")}><Square size={15} fill="currentColor" aria-hidden="true" /> {t("stopRecording")}</button>
        ) : null}
        <main className="content">
          {view === 'practice' ? (
            <PracticeView
              current={current}
              currentState={currentState}
              stats={stats}
              speed={speed}
              showIpa={showIpa}
              notice={notice}
              recorder={recorder}
              recordingBusy={recordingBusy}
              canGoPrevious={historyPosition > 0 && !recordingBusy}
              onToggleIpa={() => setShowIpa((value) => !value)}
              onSpeak={playDemo}
              onToggleSpeed={() => {
                setSpeed((value) => (value === 'normal' ? 'slow' : 'normal'));
                setNotice('');
              }}
              onRecord={handleRecorder}
              onToggleFlag={toggleFlag}
              onNext={nextSentence}
              onPrevious={previousSentence}
              onChooseRelated={display}
              onDismissNotice={() => setNotice('')}
            />
          ) : view === 'settings' ? (
            <SettingsView
              speed={speed}
              showIpa={showIpa}
              appearance={appearance}
              languageSetting={languageSetting}
              onChangeLanguage={onChangeLanguage}
              onChangeAppearance={changeAppearance}
              onToggleSpeed={() => setSpeed((value) => (value === 'normal' ? 'slow' : 'normal'))}
              onToggleIpa={() => setShowIpa((value) => !value)}
              onBackToPractice={() => nav('practice')}
            />
          ) : (
            <LibraryView
              view={view}
              states={states}
              events={events}
              search={search}
              notice={notice}
              onSearch={setSearch}
              onChoose={chooseFromLibrary}
              onBackToPractice={() => nav('practice')}
            />
          )}
        </main>
      </div>
      </div>
    </div>
  );
}
