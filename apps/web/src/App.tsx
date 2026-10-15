import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, Headphones, Heart, ListRestart, Sparkles, type LucideIcon } from 'lucide-react';
import {
  APP_VERSION,
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

const menu: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'practice', label: '开始练习', icon: Headphones },
  { id: 'history', label: '最近学习', icon: Clock3 },
  { id: 'favorites', label: '我的收藏', icon: Heart },
  { id: 'review', label: '需要复习', icon: ListRestart },
];

/** 应用壳：侧边导航、视图切换与句子游走；数据读写在 useLearningData，视图在各 View 组件。 */
export function App() {
  const [sentenceId, setSentenceId] = useState(SENTENCES[0].id);
  const [view, setView] = useState<View>('practice');
  const [visited, setVisited] = useState<string[]>([SENTENCES[0].id]);
  const [historyPosition, setHistoryPosition] = useState(0);
  const [speed, setSpeed] = useState<'normal' | 'slow'>('normal');
  const [showIpa, setShowIpa] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const recorder = useRecorder();
  const current = useMemo(() => SENTENCES.find((item) => item.id === sentenceId) ?? SENTENCES[0], [sentenceId]);
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
    setHistoryPosition(historyPosition - 1);
    setSentenceId(visited[historyPosition - 1]);
    recorder.clearAudio();
    silence();
  }, [historyPosition, recordingBusy, visited, recorder]);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (view !== 'practice' || recordingBusy || event.altKey || event.ctrlKey || event.metaKey) return;
      if ((event.target as HTMLElement)?.closest('input, textarea')) return;
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
    const result = speak(current.english, speed);
    setNotice(result.ok ? '' : (result.message ?? '无法播放语音。'));
  };

  const handleRecorder = () => {
    if (recorder.status === 'recording') {
      recorder.stop();
    } else void recorder.start();
  };

  const nav = (target: View) => {
    setView(target);
    setSearch('');
    setNotice('');
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">
            <span>✳</span>
          </div>
          <div>
            <strong>Voxnelo</strong>
            <small>每天开口说一句英语</small>
          </div>
        </div>
        <div className="sidebarHint">YOUR LEARNING SPACE</div>
        <nav aria-label="主导航">
          {menu.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`navItem ${view === id ? 'active' : ''}`} onClick={() => nav(id)}>
              <Icon size={19} />
              {label}
              {id === 'favorites' && stats.favorites > 0 ? <span className="navCount">{stats.favorites}</span> : null}
            </button>
          ))}
        </nav>
        <div className="sidebarBottom">
          <div className="tinyPanel">
            <Sparkles size={18} />
            <span>从一句简单的英语开始，慢慢练习就好。</span>
          </div>
          <div className="sidebarVersion">Early Access · V{APP_VERSION}</div>
        </div>
      </aside>
      <div className="mainArea">
        <header className="topbar">
          <span className="breadcrumb">
            学习空间 <span>/</span> {view === 'practice' ? '今日练习' : menu.find((x) => x.id === view)?.label}
          </span>
          <span className="topRight">
            <span className="statusDot" /> 免费 · 本地优先
          </span>
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
              onDismissNotice={() => setNotice('')}
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
