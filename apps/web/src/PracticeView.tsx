import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  CircleHelp,
  Heart,
  Mic,
  ShieldCheck,
  Square,
  Turtle,
  Volume2,
  VolumeX,
  X,
  Target,
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
  greetings: '先模仿语气和节奏，不必追求一次完美。听一遍，再跟着读一遍。',
  personal: '试着把句子里的人名或地点换成自己的信息，让练习更贴近生活。',
  needs: '想象一个真实场景，先把整句顺畅地说出来，再回听自己的语速。',
  learning: '遇到没有听清的地方，可以用这些句子请求对方重复或放慢。',
  daily: '先听清每个词，再连起来练习；不熟悉的短句可以加入复习。',
};

/** 纯视觉节奏纹理，绝不是实时麦克风输入或发音正确率。 */
const accentHeights = [3, 4, 6, 8, 10, 14, 17, 21, 13, 7, 11, 20, 28, 37, 45, 30, 18, 11, 8, 16, 29, 47, 55, 34, 21, 14, 26, 33, 22, 12, 6, 4, 3];

function RhythmDecoration() {
  return (
    <div className="rhythmDecoration" aria-hidden="true">
      {accentHeights.map((height, index) => <span key={index} style={{ height }} />)}
    </div>
  );
}

/** Original concept's spatial arrangement with only genuine V0.1 functionality. */
export function PracticeView({
  current, currentState, stats, speed, showIpa, notice, recorder, recordingBusy,
  canGoPrevious, onToggleIpa, onSpeak, onToggleSpeed, onRecord,
  onToggleFlag, onNext, onPrevious, onDismissNotice,
}: PracticeViewProps) {
  const rawPosition = SENTENCES.findIndex((item) => item.id === current.id);
  const index = rawPosition < 0 ? 1 : rawPosition + 1;
  const catalogPercentage = (index / Math.max(1, SENTENCES.length)) * 100;
  const viewedPercentage = Math.min(100, (stats.viewed / Math.max(1, SENTENCES.length)) * 100);
  const isRecording = recorder.status === 'recording';
  const requesting = recorder.status === 'requesting';
  const favorite = Boolean(currentState?.favorite);
  const review = Boolean(currentState?.review);

  return (
    <div className="practiceLayout layoutWorkbench">
      <div className="practiceColumn">
        <section className="practiceCard referenceLesson" aria-label="当前短句练习">
          <header className="cardHeader lessonHeader">
            <div className="lessonProgress" aria-label={'课程位置，第 ' + index + ' 句，共 ' + SENTENCES.length + ' 句'}>
              <span className="lessonCount">{index} / {SENTENCES.length}</span>
              <div className="lessonProgressTrack" aria-hidden="true">
                <span style={{ width: catalogPercentage + '%' }} />
              </div>
            </div>
            <span className="pill"><BookOpen size={15} /> {TOPIC_LABELS[current.topic]}</span>
          </header>

          <div className="lessonFocus">
            <div className="sentenceContent">
              <p className="lessonLevel">英语口语 · {current.level}</p>
              <div className="sentenceHeading">
                <h1 key={current.id} className="sentenceText">{current.english}</h1>
                <button className={'lessonFavorite' + (favorite ? ' selected' : '')}
                  type="button" onClick={() => onToggleFlag('favorite')}
                  aria-label={favorite ? '取消收藏' : '收藏'} aria-pressed={favorite}
                  title={favorite ? '取消收藏' : '收藏'}>
                  <Heart size={23} fill={favorite ? 'currentColor' : 'none'} />
                </button>
              </div>
              <p className="translation">{current.chinese}</p>
              {showIpa ? <p className="ipa">{current.ipa}</p> : null}
              <button type="button" className="subtleLink" onClick={onToggleIpa} aria-expanded={showIpa}>
                <CircleHelp size={15} /> {showIpa ? '收起音标' : '查看音标'}
              </button>
            </div>
            <RhythmDecoration />
          </div>

          <section className="lessonActions" aria-label="口语练习操作">
            <div className="actionRail" data-testid="practice-control-rail">
              <div className="actionSlot">
                <button type="button" className="roundControl sampleButton" onClick={onSpeak}
                  title="播放标准朗读" aria-label="播放标准朗读" disabled={recordingBusy}>
                  <Volume2 size={23} />
                </button>
                <span className="actionCaption">播放示范</span>
              </div>
              <div className="actionSlot">
                <button type="button" className="roundControl speedButton" onClick={onToggleSpeed}
                  disabled={recordingBusy} aria-pressed={speed === 'slow'} aria-label="切换语速">
                  <Turtle size={23} />
                </button>
                <span className="actionCaption">慢速模式</span>
                <span className="actionAux">{speed === 'slow' ? '已开启' : '点击切换'}</span>
              </div>
              <div className="actionSlot recordSlot">
                <button type="button" className={'recordAction' + (isRecording ? ' isRecording' : '')}
                  onClick={onRecord} disabled={recordingBusy}
                  aria-label={requesting ? '正在获取权限' : isRecording ? '录音进行中' : '开口跟读'}>
                  <Mic size={36} />
                </button>
                <span className="actionCaption">
                  {requesting ? '正在获取权限' : isRecording ? '正在录音' : '开口跟读'}
                </span>
                <span className="actionAux">点击开始，手动结束</span>
              </div>
              <div className="actionSlot">
                <button type="button" className="roundControl stopButton" onClick={onRecord}
                  disabled={!isRecording} aria-label="结束录音">
                  <Square size={21} fill="currentColor" />
                </button>
                <span className="actionCaption">结束录音</span>
              </div>
              <RecordingPlayback key={recorder.recordingUrl ?? 'no-recording'} src={recorder.recordingUrl} />
              <div className="actionSlot">
                <button type="button" className="roundControl nextButton" onClick={onNext}
                  disabled={recordingBusy} aria-label="换一句">
                  <ArrowRight size={24} />
                </button>
                <span className="actionCaption">下一个</span>
              </div>
            </div>

            {isRecording ? (
              <p className="recordingStatus" role="status"><span className="liveDot" /> 麦克风正在使用 · 点击“结束录音”停止</p>
            ) : requesting ? (
              <p className="recordingStatus" role="status">请在系统弹窗中允许使用麦克风</p>
            ) : (
              <p className="practicePrompt"><ShieldCheck size={14} /> 录音只用于本次回听，切换短句后清除，不上传开发者服务器</p>
            )}
            {recorder.error ? <p className="warning" role="alert">{recorder.error}</p> : null}
          </section>

          <footer className="cardFooter referenceFooter">
            <button type="button" className="prevButton" onClick={onPrevious}
              disabled={!canGoPrevious} aria-label="上一句"><ChevronLeft size={18} /> 上一句</button>
            <span className="footerHint">先听示范，再开口跟读</span>
            <button type="button" className={'iconText' + (review ? ' selected' : '')}
              onClick={() => onToggleFlag('review')} aria-pressed={review}>
              <Bookmark size={17} fill={review ? 'currentColor' : 'none'} />
              {review ? '已加入复习' : '需要复习'}
            </button>
          </footer>
        </section>
        {notice ? (
          <div className="notice" role="status"><VolumeX size={16} />{notice}
            <button type="button" onClick={onDismissNotice} aria-label="关闭提示"><X size={16} /></button>
          </div>
        ) : null}
      </div>

      <aside className="insightsColumn referenceInsights" aria-label="本地学习概览">
        <section className="insightCard">
          <div className="insightHeading">
            <span className="insightIcon"><Target size={19} /></span><h2>学习记录</h2>
          </div>
          <div className="progressOverview">
            <div className="progressDonut" role="img"
              aria-label={'已浏览 ' + stats.viewed + ' / ' + SENTENCES.length + ' 句'}
              style={{ background: 'conic-gradient(#0dc7bd ' + viewedPercentage + '%, #e7f0fa 0)' }}>
              <div className="donutInner"><strong>{stats.viewed}</strong><small>/{SENTENCES.length}</small></div>
            </div>
            <div className="progressSummary">
              <span>已浏览课程</span>
              <strong>{stats.viewed} / {SENTENCES.length} 句</strong>
              <small>按自己的节奏练习</small>
            </div>
          </div>
          <div className="miniMetrics">
            <div><strong>{stats.practiced}</strong><span>录音尝试句</span></div>
            <div><strong>{stats.favorites}</strong><span>已收藏</span></div>
            <div><strong>{stats.review}</strong><span>待复习</span></div>
          </div>
          <p className="progressCopy">统计来自本地记录，不代表发音评分</p>
        </section>
        <section className="insightCard tipCard">
          <div className="insightHeading"><span className="insightIcon cyan"><BookOpen size={18} /></span><h2>学习提示</h2></div>
          <p>{tips[current.topic]}</p>
        </section>
        <section className="insightCard routineCard">
          <div className="insightHeading"><span className="insightIcon cyan"><Check size={18} /></span><h2>练习流程</h2></div>
          <div className="routineChips"><span>听示范</span><span>开口说</span><span>回听录音</span></div>
          <p>都是手动操作，可以随时重来。</p>
        </section>
        <div className="privacyNote"><ShieldCheck size={15} /> 无需注册 · 学习进度保存在本机</div>
      </aside>
    </div>
  );
}
