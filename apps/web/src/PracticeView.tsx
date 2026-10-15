import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronLeft,
  Heart,
  HelpCircle,
  Mic,
  Square,
  Volume2,
  VolumeX,
  X,
  BookOpen,
  Target,
  ShieldCheck,
} from 'lucide-react';
import { SENTENCES, TOPIC_LABELS, type LearningState, type LearningStats, type Sentence } from '@voxnelo/learning';
import type { useRecorder } from './useRecorder';
import { RecordingPlayback } from './RecordingPlayback';

interface PracticeViewProps {
  current: Sentence;
  currentState: LearningState | undefined;
  stats: LearningStats;
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

const tips: Record<Sentence['topic'], string> = {
  greetings: '先模仿语气和节奏。不必追求一次说得完美，听一遍再开口就好。',
  personal: '把句子里的人名、地点换成自己的信息，练习会更实用。',
  needs: '试着想象生活中的真实场景，先把整句顺畅地表达出来。',
  learning: '这些句子可以在真实交流中帮你请求重复、解释或放慢语速。',
  daily: '先听清每个词，跟读后回听自己的录音，再决定是否需要复习。',
};

/** 中心学习卡 + 本地记录侧栏。所有进度来自持久化数据，不冒充 AI 评分。 */
export function PracticeView({
  current, currentState, stats, speed, showIpa, notice, recorder, recordingBusy,
  canGoPrevious, onToggleIpa, onSpeak, onToggleSpeed, onRecord,
  onToggleFlag, onNext, onPrevious, onDismissNotice,
}: PracticeViewProps) {
  const index = SENTENCES.findIndex((item) => item.id === current.id) + 1;
  const percentage = Math.min(100, (stats.viewed / Math.max(1, SENTENCES.length)) * 100);
  return (
    <>
      <div className="practiceLayout">
        <div className="practiceColumn">
          <section className="practiceCard" aria-label="当前短句练习">
            <header className="cardHeader">
              <span className="pill"><BookOpen size={14} /> {TOPIC_LABELS[current.topic]}</span>
              <span className="difficulty">第 {index} / {SENTENCES.length} 句 · {current.level}</span>
            </header>
            <div className="lessonBody">
              <span className="lessonLabel">TODAY'S EXPRESSION</span>
              <h2 key={current.id} className="sentenceText">{current.english}</h2>
              <p className="translation">{current.chinese}</p>
              {showIpa ? <p className="ipa">{current.ipa}</p> : null}
              <button type="button" className="subtleLink" onClick={onToggleIpa} aria-expanded={showIpa}>
                <HelpCircle size={16} /> {showIpa ? '收起音标' : '查看音标'}
              </button>
            </div>
            <div className="practiceDivider" />
            <div className="sessionLabel"><span className="sessionLine" /><span>听一句 · 跟读一句</span><span className="sessionLine" /></div>
            <div className="controls">
              <div className="referenceControls">
                <button type="button" className="sampleButton" onClick={onSpeak}
                  title="播放标准朗读" disabled={recordingBusy}>
                  <Volume2 size={18} /> 播放示范
                </button>
                <button type="button" className="speedButton" onClick={onToggleSpeed}
                  disabled={recordingBusy} aria-pressed={speed === 'slow'}>
                  {speed === 'slow' ? '慢速 0.75×' : '普通语速'}
                </button>
              </div>
              <button type="button"
                className={'recordAction' + (recorder.status === 'recording' ? ' isRecording' : '')}
                onClick={onRecord} disabled={recorder.status === 'requesting'}>
                {recorder.status === 'recording' ? <Square size={21} /> : <Mic size={22} />}
                {recorder.status === 'recording' ? '结束录音' :
                  recorder.status === 'requesting' ? '正在获取权限' : '开口跟读'}
              </button>
              <p className="recordingHint">
                {recorder.status === 'recording' ? '正在录音，读完后点击结束' :
                  recorder.status === 'requesting' ? '请在系统弹窗中允许使用麦克风' :
                    '点击开始，读完后手动结束'}
              </p>
            </div>
            {recorder.status === 'recording' ? (
              <p className="recordingStatus" role="status">
                <span className="liveDot" /> 麦克风使用中 · 点击“结束录音”停止
              </p>
            ) : recorder.recordingUrl ? (
              <RecordingPlayback key={recorder.recordingUrl} src={recorder.recordingUrl} />
            ) : (
              <p className="practicePrompt"><ShieldCheck size={14} /> 录音只用于本次回听，换句后清除，不上传开发者服务器</p>
            )}
            {recorder.error ? <p className="warning" role="alert">{recorder.error}</p> : null}
            <footer className="cardFooter">
              <div className="cardFootLeft">
                <button type="button" className={'iconText' + (currentState?.favorite ? ' selected' : '')}
                  onClick={() => onToggleFlag('favorite')} aria-pressed={Boolean(currentState?.favorite)}>
                  <Heart size={17} fill={currentState?.favorite ? 'currentColor' : 'none'} />
                  {currentState?.favorite ? '已收藏' : '收藏'}
                </button>
                <button type="button" className={'iconText' + (currentState?.review ? ' selected' : '')}
                  onClick={() => onToggleFlag('review')} aria-pressed={Boolean(currentState?.review)}>
                  <Bookmark size={17} fill={currentState?.review ? 'currentColor' : 'none'} />
                  {currentState?.review ? '已加入复习' : '需要复习'}
                </button>
              </div>
              <div className="pager">
                <button type="button" className="prevButton" onClick={onPrevious}
                  disabled={!canGoPrevious} aria-label="上一句"><ChevronLeft size={19} /></button>
                <button type="button" className="nextButton" onClick={onNext} disabled={recordingBusy}>
                  换一句 <ArrowRight size={17} />
                </button>
              </div>
            </footer>
          </section>
          {notice ? (
            <div className="notice" role="status"><VolumeX size={16} />{notice}
              <button type="button" onClick={onDismissNotice} aria-label="关闭提示"><X size={16} /></button>
            </div>
          ) : null}
        </div>
        <aside className="insightsColumn" aria-label="本地学习概览">
          <section className="insightCard">
            <div className="insightHeading"><span className="insightIcon"><Target size={18} /></span><h3>我的学习记录</h3></div>
            <div className="insightHero"><strong>{stats.practiced}</strong><span>句有过录音尝试</span></div>
            <div className="progressTrack" role="progressbar" aria-label="已浏览句数占总课程比例"
              aria-valuenow={stats.viewed} aria-valuemin={0} aria-valuemax={SENTENCES.length}>
              <span style={{ width: percentage + '%' }} />
            </div>
            <p className="progressCopy">已浏览 {stats.viewed} / {SENTENCES.length} 句 · 不是发音评分</p>
            <div className="miniMetrics">
              <div><strong>{stats.favorites}</strong><span>收藏短句</span></div>
              <div><strong>{stats.review}</strong><span>待复习</span></div>
            </div>
          </section>
          <section className="insightCard tipCard">
            <div className="insightHeading"><span className="insightIcon cyan"><BookOpen size={18} /></span><h3>练习小提示</h3></div>
            <p>{tips[current.topic]}</p>
          </section>
          <div className="privacyNote"><Check size={15} /> 无需注册 · 免费使用 · 学习记录保存在本机</div>
        </aside>
      </div>
    </>
  );
}
