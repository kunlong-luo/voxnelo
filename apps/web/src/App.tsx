import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpen, CalendarDays, Clock3, MessageCircle, Settings2, ShieldCheck, Square, Star, UserCircle2, type LucideIcon } from 'lucide-react';
import {
  APP_VERSION,
  FIRST_SENTENCE,
  pickNext,
  primeSpeechVoices,
  SENTENCES,
  TOPIC_LABELS,
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

const menu: { id: View; label: string; accessibleLabel: string; icon: LucideIcon }[] = [
  { id: 'practice', label: '练习', accessibleLabel: '开始练习', icon: MessageCircle },
  { id: 'favorites', label: '收藏', accessibleLabel: '我的收藏', icon: Star },
  { id: 'history', label: '历史', accessibleLabel: '最近学习', icon: Clock3 },
  { id: 'review', label: '复习', accessibleLabel: '需要复习', icon: BarChart3 },
  { id: 'settings', label: '设置', accessibleLabel: '设置', icon: Settings2 },
];

/** 应用壳：侧边导航、视图切换与句子游走；数据读写在 useLearningData，视图在各 View 组件。 */
export function App() {
  const [sentenceId, setSentenceId] = useState(FIRST_SENTENCE.id);
  const [view, setView] = useState<View>('practice');
  const [visited, setVisited] = useState<string[]>([FIRST_SENTENCE.id]);
  const [historyPosition, setHistoryPosition] = useState(0);
  const [speed, setSpeed] = useState<'normal' | 'slow'>('normal');
  const [showIpa, setShowIpa] = useState(true);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
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

  const display = useCallback(
    (target: Sentence) => {
      if (recordingBusy) {
        setNotice('请先结束当前录音，再切换句子。');
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
    [recordingBusy, historyPosition, recorder],
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
      setNotice('请先停止录音。');
      return;
    }
    display(item);
  };

  const toggleFlag = (flag: 'favorite' | 'review') => {
    void setFlag(current.id, flag, !currentState?.[flag]);
  };

  const playDemo = () => {
    if (recordingBusy) {
      setNotice('请先结束当前录音，再播放参考发音。');
      return;
    }
    const result = speak(current.english, speed);
    setNotice(result.ok ? '' : (result.message ?? '无法播放语音。'));
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
      setNotice('请先结束当前录音，再切换页面。');
      return;
    }
    setView(target);
    setSearch('');
    setNotice('');
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark"><img src="/brand/voxnelo-mark.svg" alt="" width="48" height="48" /></div>
          <div className="brandText">
            <strong>Voxnelo</strong>
          </div>
        </div>
        <div className="sidebarHint">YOUR LEARNING SPACE</div>
        <nav aria-label="主导航">
          {menu.map(({ id, label, accessibleLabel, icon: Icon }) => (
            <button key={id} className={`navItem ${view === id ? 'active' : ''}`} aria-label={accessibleLabel} aria-current={view === id ? 'page' : undefined} onClick={() => nav(id)}>
              <Icon size={20} strokeWidth={1.9} />
              <span>{label}</span>
              {id === 'favorites' && stats.favorites > 0 ? <span className="navCount">{stats.favorites}</span> : null}
            </button>
          ))}
        </nav>
        <div className="sidebarBottom">
          <div className="tinyPanel privacyPanel">
            <span className="tinyBadge"><ShieldCheck size={17} /></span>
            <strong>在自己的节奏里练习</strong>
            <span>无需登录 · 记录保存在本机</span>
          </div>
          <div className="sidebarVersion">Voxnelo · Early Access {APP_VERSION}</div>
        </div>
      </aside>
      <div className="mainArea">
        <header className="topbar">
          <span className="breadcrumb">
            <BookOpen size={18} aria-hidden="true" />
            <span>英语口语</span><span className="breadcrumbArrow">›</span>
            <span>{view === 'practice' ? TOPIC_LABELS[current.topic] : menu.find((x) => x.id === view)?.label}</span>
          </span>
          <div className="topbarActions">
            {recorder.status === 'recording' ? (
              <button type="button" className="topbarStop" onClick={handleRecorder}
                aria-label="顶部快速停止录音"><Square size={15} fill="currentColor" /> 结束录音</button>
            ) : null}
            <span className="dateBadge"><CalendarDays size={15} aria-hidden="true" />{new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}</span>
            <span className="topRight" title="无需账号，本地练习"><UserCircle2 size={22} aria-hidden="true" /><span className="srOnly">本地学习模式</span></span>
          </div>
        </header>
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
  );
}
