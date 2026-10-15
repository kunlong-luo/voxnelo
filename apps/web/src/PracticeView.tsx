import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  Heart,
  HelpCircle,
  Mic,
  Settings2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { TOPIC_LABELS, type Sentence } from '../../../packages/content/sentences';
import { calculateStats, type LearningState } from '../../../packages/core/recommend';
import type { useRecorder } from './useRecorder';

interface PracticeViewProps {
  current: Sentence;
  currentState: LearningState | undefined;
  stats: ReturnType<typeof calculateStats>;
  speed: 'normal' | 'slow';
  showIpa: boolean;
  notice: string;
  recorder: ReturnType<typeof useRecorder>;
  recordingBusy: boolean;
  canGoPrevious: boolean;
  onToggleIpa: () => void;
  onSpeak: () => void;
  onToggleSpeed: () => void;
  onRecord: () => void;
  onToggleFlag: (flag: 'favorite' | 'review') => void;
  onNext: () => void;
  onPrevious: () => void;
  onDismissNotice: () => void;
}

/** 练习视图：短句展示、朗读、录音回听、收藏/复习、换句与统计。 */
export function PracticeView({
  current,
  currentState,
  stats,
  speed,
  showIpa,
  notice,
  recorder,
  recordingBusy,
  canGoPrevious,
  onToggleIpa,
  onSpeak,
  onToggleSpeed,
  onRecord,
  onToggleFlag,
  onNext,
  onPrevious,
  onDismissNotice,
}: PracticeViewProps) {
  return (
    <>
      <div className="welcome">
        <div className="eyebrow">
          <Sparkles size={15} /> YOUR DAILY SPEAKING MOMENT
        </div>
        <h1>
          每天开口，<em>进步一点点。</em>
        </h1>
        <p>不用赶时间，也不用担心读错。从一句简单的英语开始。</p>
      </div>
      <section className="practiceCard" aria-label="当前短句练习">
        <div className="cardHeader">
          <span className="pill">
            <span className="pillDot" />
            {TOPIC_LABELS[current.topic]}
          </span>
          <span className="difficulty">{current.level} · 入门练习</span>
        </div>
        <div className="lessonBody">
          <span className="lessonLabel">TODAY'S EXPRESSION</span>
          <h2 key={current.id} className="sentenceText">
            {current.english}
          </h2>
          <p className="translation">{current.chinese}</p>
          {showIpa ? <p className="ipa">{current.ipa}</p> : null}
          <button className="subtleLink" onClick={onToggleIpa}>
            <HelpCircle size={15} />
            {showIpa ? '收起音标' : '查看音标'}
          </button>
        </div>
        <div className="practiceDivider" />
        <div className="controls">
          <button className="circleAction" onClick={onSpeak} title="播放标准朗读">
            <Volume2 size={22} />
          </button>
          <button className="textAction" onClick={onToggleSpeed}>
            <Settings2 size={17} />
            {speed === 'slow' ? '慢速 · 开启' : '普通语速'}
          </button>
          <button
            className={`recordAction ${recorder.status === 'recording' ? 'isRecording' : ''}`}
            onClick={onRecord}
            disabled={recorder.status === 'requesting'}
          >
            <Mic size={19} />
            {recorder.status === 'recording'
              ? '结束录音'
              : recorder.status === 'requesting'
                ? '正在获取权限'
                : '开口跟读'}
          </button>
        </div>
        {recorder.status === 'recording' ? (
          <p className="recordingStatus">
            <span className="liveDot" /> 正在录音 · 读完后点击“结束录音”
          </p>
        ) : recorder.recordingUrl ? (
          <div className="playback">
            <Check size={17} />
            <span>录好了！现在可以听听自己的发音。</span>
            <audio controls src={recorder.recordingUrl} aria-label="回听刚才的录音" />
          </div>
        ) : (
          <p className="practicePrompt">先听一遍，再跟着读。录音默认只保存在当前练习中。</p>
        )}
        {recorder.error ? (
          <p className="warning" role="alert">
            {recorder.error}
          </p>
        ) : null}
        <div className="cardFooter">
          <div className="cardFootLeft">
            <button
              className={`iconText ${currentState?.favorite ? 'selected' : ''}`}
              onClick={() => onToggleFlag('favorite')}
            >
              <Heart size={18} fill={currentState?.favorite ? 'currentColor' : 'none'} />
              {currentState?.favorite ? '已收藏' : '收藏'}
            </button>
            <button
              className={`iconText ${currentState?.review ? 'selected' : ''}`}
              onClick={() => onToggleFlag('review')}
            >
              <Bookmark size={18} fill={currentState?.review ? 'currentColor' : 'none'} />
              {currentState?.review ? '已加入复习' : '需要复习'}
            </button>
          </div>
          <div className="pager">
            <button className="prevButton" onClick={onPrevious} disabled={!canGoPrevious} aria-label="上一句">
              <ChevronLeft size={20} />
            </button>
            <button className="nextButton" onClick={onNext} disabled={recordingBusy}>
              换一句 <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
      {notice ? (
        <div className="notice" role="status">
          <VolumeX size={16} />
          {notice}
          <button onClick={onDismissNotice} aria-label="关闭提示">
            <X size={16} />
          </button>
        </div>
      ) : null}
      <div className="bottomStats">
        <div>
          <div className="statIcon">◎</div>
          <div>
            <strong>{stats.viewed}</strong>
            <span>浏览过的短句</span>
          </div>
        </div>
        <div>
          <div className="statIcon">◉</div>
          <div>
            <strong>{stats.practiced}</strong>
            <span>开口练习过</span>
          </div>
        </div>
        <div>
          <div className="statIcon">♡</div>
          <div>
            <strong>{stats.favorites}</strong>
            <span>喜欢的表达</span>
          </div>
        </div>
      </div>
    </>
  );
}
