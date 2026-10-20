import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Square } from 'lucide-react';
import {
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
import { useLiveDictation } from './useLiveDictation';
import { useLearningData } from './useLearningData';
import { PracticeView } from './PracticeView';
import { LibraryView, type View } from './LibraryView';
import { CatalogView } from './CatalogView';
import { SettingsView } from './SettingsView';
import { OfflineModelsView } from './OfflineModelsView';
import { DesktopTitlebar } from './DesktopTitlebar';
import { NavigationSidebar, MobileNavigation } from './AppNavigation';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
import { applyAppearance, readAppearance, saveAppearance, applyMotion, readMotionEnabled, saveMotionEnabled, type AppearanceTheme } from './appearance';
import { I18nProvider, readLanguageSetting, resolveLocale, saveLanguageSetting, setDocumentLocale, useI18n, type LanguageSetting } from './i18n';

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
  // React replaces the direct page node on navigation, so attach motion here.
  const [pageMotionRef]=useAutoAnimate<HTMLElement>({duration:500,easing:'ease-in-out'});
  const [sentenceId, setSentenceId] = useState(FIRST_SENTENCE.id);
  const [view, setView] = useState<View>('practice');
  const [visited, setVisited] = useState<string[]>([FIRST_SENTENCE.id]);
  const [historyPosition, setHistoryPosition] = useState(0);
  const [speed, setSpeed] = useState<'normal' | 'slow'>('normal');
  const [showIpa, setShowIpa] = useState(true);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [appearance, setAppearance] = useState<AppearanceTheme>(readAppearance);
  const [motionEnabled, setMotionEnabled] = useState(readMotionEnabled);
  const recorder = useRecorder();
  const dictation = useLiveDictation(sentenceId);
  const current = useMemo(() => SENTENCES.find((item) => item.id === sentenceId) ?? FIRST_SENTENCE, [sentenceId]);
  const recordingBusy = recorder.status === 'requesting' || recorder.status === 'recording' || dictation.active;
  const notify = useCallback((message: string) => setNotice(message), []);
  const restoreLastSentence=useCallback((id:string|undefined)=>{
    if (!id || !SENTENCES.some(item=>item.id===id)) return;
    setSentenceId(id);
    setVisited([id]);
    setHistoryPosition(0);
  },[]);
  const { states, events, setFlag } = useLearningData(
    notify, sentenceId, current.id, recorder.recordingUrl, restoreLastSentence,
  );
  const currentState = states.find((item) => item.sentenceId === current.id);
  const stats = summarize(states);

  useEffect(() => {
    primeSpeechVoices();
  }, []);

  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  useEffect(() => {applyMotion(motionEnabled);}, [motionEnabled]);
  const changeMotion = (next:boolean) => {
    setMotionEnabled(next);
    saveMotionEnabled(next);
  };
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
    if (dictation.active) return;
    if (recorder.status === 'recording') {
      recorder.stop();
    } else {
      // 示范音与录音不可重叠，防止把扬声器输出录为自己的跟读。
      silence();
      void recorder.start();
    }
  };

  const startDictation = () => {
    if (recorder.status === 'recording' || recorder.status === 'requesting') return;
    silence();
    void dictation.start();
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
    <div className={cn("appFrame min-h-dvh bg-background bg-[image:var(--workspace-gradient)] text-foreground sm:h-dvh sm:overflow-hidden",window.voxneloDesktop?.windowControls&&"desktopFrame")}>
      <div className="shell flex min-h-dvh items-stretch sm:h-dvh sm:overflow-hidden">
      <NavigationSidebar view={view} favorites={stats.favorites} onNavigate={nav} />
      <div className="mainArea @container/workspace relative isolate min-w-0 flex-1 overflow-clip bg-background bg-[image:var(--workspace-gradient)] sm:flex sm:h-dvh sm:flex-col">
        <DesktopTitlebar />
        <div aria-hidden="true" data-motion="ambient-drift" className="pointer-events-none absolute -top-16 right-[-7%] size-72 rounded-full bg-ambient-glow/75 blur-[65px] animate-ambient-drift sm:size-125"/>
        <div aria-hidden="true" data-motion="ambient-breathe" className="pointer-events-none absolute -bottom-35 left-[1%] size-80 rounded-full bg-brand-cream/85 blur-[75px] animate-ambient-breathe sm:size-135"/>
        <div aria-hidden="true" data-motion="ambient-breathe-secondary" className="pointer-events-none absolute top-[32%] right-[17%] size-56 rounded-full bg-brand-mist/75 blur-[70px] animate-ambient-breathe [animation-delay:-3.5s] sm:size-110"/>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-[6%] top-[12%] h-px bg-linear-to-r from-transparent via-white/70 to-transparent"/>
        {recorder.status === 'recording' ? (
          <Button variant="destructive" className="recordingQuickStop fixed right-4 bottom-24 z-60 shadow-xl animate-soft-pop sm:right-6 sm:bottom-6" onClick={handleRecorder}
            aria-label={t("stopFloating")}><Square size={15} fill="currentColor" aria-hidden="true" /> {t("stopRecording")}</Button>
        ) : null}
        <main ref={pageMotionRef} className="content voxnelo-scroll voxnelo-workspace-scroll relative z-10 mx-auto w-full max-w-380 px-3 pt-3 pb-28 sm:min-h-0 sm:flex-1 sm:overflow-y-auto sm:overscroll-contain sm:px-6 sm:py-6 lg:px-9 lg:py-8 2xl:px-12 2xl:py-10 [@media(max-height:800px)]:py-2">
          {view === 'practice' ? (
            <PracticeView
              current={current}
              currentState={currentState}
              stats={stats}
              speed={speed}
              showIpa={showIpa}
              notice={notice}
              recorder={recorder}
              dictation={dictation}
              onStartDictation={startDictation}
              onManageModels={() => nav('models')}
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
          ) : view === 'catalog' ? (
            <CatalogView onChoose={chooseFromLibrary} onBackToPractice={() => nav('practice')} />
          ) : view === 'models' ? (
            <OfflineModelsView dictation={dictation} onBack={()=>nav('practice')} />
          ) : view === 'settings' ? (
            <SettingsView
              speed={speed}
              showIpa={showIpa}
              appearance={appearance}
              motionEnabled={motionEnabled}
              onChangeMotion={changeMotion}
              languageSetting={languageSetting}
              onChangeLanguage={onChangeLanguage}
              onChangeAppearance={changeAppearance}
              onToggleSpeed={() => setSpeed((value) => (value === 'normal' ? 'slow' : 'normal'))}
              onToggleIpa={() => setShowIpa((value) => !value)}
              onBackToPractice={() => nav('practice')}
              onManageModels={() => nav('models')}
            />
          ) : (
            <LibraryView key={view}
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
      <MobileNavigation view={view} onNavigate={nav} />
    </div>
  );
}
