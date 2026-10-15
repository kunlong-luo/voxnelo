import {
  ArrowRight,
  Bookmark,
  BookOpen,
  ChevronRight,
  Coffee,
  Lightbulb,
  MessageCircle,
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
} from 'lucide-react';
import { SENTENCES, type LearningState, type LearningStats, type Sentence } from '@voxnelo/learning';
import type { useRecorder } from './useRecorder';
import { RecordingPlayback } from './RecordingPlayback';
import { WaveformArt } from './WaveformArt';
import { Tooltip } from './Tooltip';
import { useI18n, type TranslationKey } from './i18n';

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
  onChooseRelated?: (sentence: Sentence) => void;
  onDismissNotice: () => void;
}

const topicKeys: Record<Sentence['topic'], TranslationKey> = {
  greetings: 'topicGreetings', personal: 'topicPersonal', needs: 'topicNeeds',
  learning: 'topicLearning', daily: 'topicDaily',
};
const tipKeys: Record<Sentence['topic'], TranslationKey> = {
  greetings: 'tipGreetings', personal: 'tipPersonal', needs: 'tipNeeds',
  learning: 'tipLearning', daily: 'tipDaily',
};

/** Nordic edition: UI2's three-column learning hierarchy, real V0.1 behaviors only. */
export function PracticeView({
  current, currentState, stats, speed, showIpa, notice, recorder, recordingBusy,
  canGoPrevious, onToggleIpa, onSpeak, onToggleSpeed, onRecord,
  onToggleFlag, onNext, onPrevious, onChooseRelated, onDismissNotice,
}: PracticeViewProps) {
  const {t} = useI18n();
  const rawPosition = SENTENCES.findIndex((item) => item.id === current.id);
  const index = rawPosition < 0 ? 1 : rawPosition + 1;
  const catalogPercentage = (index / Math.max(1, SENTENCES.length)) * 100;
  const viewedPercentage = Math.min(100, (stats.viewed / Math.max(1, SENTENCES.length)) * 100);
  const isRecording = recorder.status === 'recording';
  const requesting = recorder.status === 'requesting';
  const favorite = Boolean(currentState?.favorite);
  const review = Boolean(currentState?.review);
  const related = SENTENCES.filter((item) => item.topic === current.topic && item.id !== current.id).slice(0, 4);
  const sceneTopics = [
    { topic: 'greetings', label: t('sceneGreetings'), icon: MessageCircle },
    { topic: 'personal', label: t('scenePersonal'), icon: BookOpen },
    { topic: 'daily', label: t('sceneDaily'), icon: Coffee },
  ] as const;

  return (
    <div className="practiceLayout layoutWorkbench">
      <div className="practiceColumn">
        <section className="practiceCard referenceLesson" aria-label={t("currentPractice")}>
          <header className="cardHeader lessonHeader">
            <div className="lessonProgress" aria-label={t('coursePosition',{index,total:SENTENCES.length})}>
              <span className="lessonCount">{index} / {SENTENCES.length}</span>
              <div className="lessonProgressTrack" aria-hidden="true">
                <span style={{ width: catalogPercentage + '%' }} />
              </div>
            </div>
            <div className="lessonHeaderActions">
              <span className="pill"><BookOpen size={15} /> {t(topicKeys[current.topic])}</span>
              <div className="sentenceFlags" role="group" aria-label={t('navFavorites') + ' / ' + t('navReview')}>
                <Tooltip text={t(favorite ? 'favoriteRemove' : 'favoriteAdd')} placement="bottom">
                  <button type="button" className={'lessonFavorite flagButton' + (favorite ? ' selected' : '')}
                    onClick={() => onToggleFlag('favorite')} aria-label={t(favorite ? 'favoriteRemove' : 'favoriteAdd')} aria-pressed={favorite}>
                    <Heart size={20} fill={favorite ? 'currentColor' : 'none'} aria-hidden="true" />
                  </button>
                </Tooltip>
                <Tooltip text={t(review ? 'reviewRemove' : 'reviewAdd')} placement="bottom">
                  <button type="button" className={'reviewIconButton flagButton' + (review ? ' selected' : '')}
                    onClick={() => onToggleFlag('review')} aria-pressed={review}
                    aria-label={t(review ? 'reviewRemove' : 'reviewAdd')}>
                    <Bookmark size={20} fill={review ? 'currentColor' : 'none'} aria-hidden="true" />
                  </button>
                </Tooltip>
              </div>
            </div>
          </header>

          <div className="lessonFocus">
            <div className="sentenceContent">
              <p className="lessonLevel">{t("speakingPractice")} <span>·</span> {current.level}</p>
              <div className="sentenceHeading">
                <h1 key={current.id} className="sentenceText">{current.english}</h1>
              </div>
              <p className="translation">{current.chinese}</p>
              {showIpa ? <p className="ipa">{current.ipa}</p> : null}
              <button type="button" className="subtleLink" onClick={onToggleIpa} aria-expanded={showIpa}>
                <CircleHelp size={15} /> {t(showIpa ? 'ipaHide' : 'ipaShow')}
              </button>
            </div>
            <div className="wavePanel"><WaveformArt /></div>
          </div>

          <section className="lessonActions" aria-label={t("practiceActions")}>
            <div className="actionRail" data-testid="practice-control-rail">
              <div className="actionSlot">
                <Tooltip text={t('playExample')}>
                  <button type="button" className="roundControl sampleButton" onClick={onSpeak}
                    aria-label={t('playExample')} disabled={recordingBusy}>
                    <Volume2 size={23} />
                  </button>
                </Tooltip>
                <span className="actionCaption">{t('playDemo')}</span>
              </div>
              <div className="actionSlot">
                <button type="button" className="roundControl speedButton" onClick={onToggleSpeed}
                  disabled={recordingBusy} aria-pressed={speed === 'slow'} aria-label={t("speedSwitch")}>
                  <Turtle size={23} />
                </button>
                <span className="actionCaption">{t("speedSlow")}</span>
                <span className="actionAux">{speed === 'slow' ? '0.75×' : t('speedNormal')}</span>
              </div>
              <div className="actionSlot recordSlot">
                <button type="button" className={'recordAction' + (isRecording ? ' isRecording' : '')}
                  onClick={onRecord} disabled={recordingBusy}
                  aria-label={t(requesting ? 'micPermission' : isRecording ? 'micBusy' : 'micStart')}>
                  <Mic size={36} />
                </button>
                <span className="actionCaption">
                  {t(requesting ? 'micPermission' : isRecording ? 'recordingInProgress' : 'micStart')}
                </span>
                <span className="actionAux">{t("micStartHint")}</span>
              </div>
              <div className="actionSlot">
                <button type="button" className="roundControl stopButton" onClick={onRecord}
                  disabled={!isRecording} aria-label={t("stopRecording")}>
                  <Square size={21} fill="currentColor" />
                </button>
                <span className="actionCaption">{t("stopRecording")}</span>
              </div>
              <RecordingPlayback key={recorder.recordingUrl ?? 'no-recording'} src={recorder.recordingUrl} />
            </div>

            {isRecording ? (
              <p className="recordingStatus" role="status"><span className="liveDot" /> {t('recordingStatus')}</p>
            ) : requesting ? (
              <p className="recordingStatus" role="status">{t('permissionHint')}</p>
            ) : (
              <p className="practicePrompt"><ShieldCheck size={14} /> {t('privacyRecording')}</p>
            )}
            {recorder.error ? <p className="warning" role="alert">{recorder.error}</p> : null}
          </section>

          <footer className="cardFooter referenceFooter">
            <button type="button" className="prevButton pagerButton" onClick={onPrevious}
              disabled={!canGoPrevious} aria-label={t("previous")}><ChevronLeft size={18} aria-hidden="true" /> {t("previous")}</button>
            <span className="footerHint">{t("footerHint")}</span>
            <button type="button" className="nextButton pagerButton" onClick={onNext}
              disabled={recordingBusy} aria-label={t("nextAccessible")}>{t("next")} <ArrowRight size={18} aria-hidden="true" /></button>
          </footer>
        </section>
        {notice ? (
          <div className="notice" role="status"><VolumeX size={16} />{notice}
            <button type="button" onClick={onDismissNotice} aria-label={t("closeNotice")}><X size={16} /></button>
          </div>
        ) : null}
      </div>

      <aside className="insightsColumn referenceInsights" aria-label={t("localOverview")}>
        <section className="insightCard progressCard">
          <div className="insightHeading">
            <h2>{t("progress")}</h2>
            <span className="insightSideNote">{t("localRecord")}</span>
          </div>
          <div className="progressOverview">
            <div className="progressDonut" role="img"
              aria-label={t('viewedCount',{viewed:stats.viewed,total:SENTENCES.length})}
              style={{ background: 'conic-gradient(#80ad9a ' + viewedPercentage + '%, #e7eee8 0)' }}>
              <div className="donutInner"><strong>{stats.viewed}</strong><small>/{SENTENCES.length}</small></div>
            </div>
            <div className="progressSummary">
              <span>{t("viewedLessons")}</span>
              <strong>{t("sentencesCount",{count:stats.viewed,total:SENTENCES.length})}</strong>
              <small>{t("progressEncourage")}</small>
            </div>
          </div>
          <div className="miniMetrics">
            <div><strong>{stats.practiced}</strong><span>{t("practiced")}</span></div>
            <div><strong>{stats.favorites}</strong><span>{t("favorited")}</span></div>
            <div><strong>{stats.review}</strong><span>{t("toReview")}</span></div>
          </div>
          <p className="progressCopy">{t("progressDisclaimer")}</p>
        </section>

        <section className="insightCard feedCard">
          <div className="insightHeading">
            <h2>{t("relatedPhrases")}</h2>
            <span className="insightSideNote">{t("sameTopic")}</span>
          </div>
          <div className="feedStrip" aria-label={t("relatedPhrasesAria")}>
            {related.map((item) => (
              <button className="feedItem" type="button" key={item.id}
                onClick={() => onChooseRelated?.(item)} disabled={recordingBusy || !onChooseRelated}
                aria-label={t('practiceSentence',{english:item.english})}>
                <span>{item.chinese}</span>
                <strong>{item.english}</strong>
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            ))}
          </div>
        </section>

        <section className="insightCard tipCard">
          <div className="insightHeading">
            <span className="insightIcon"><Lightbulb size={18} /></span>
            <h2>{t("learningTip")}</h2>
          </div>
          <p>{t(tipKeys[current.topic])}</p>
          <div className="tipDivider" />
          <small>{t("tipFooter")}</small>
        </section>

        <section className="insightCard sceneCard">
          <div className="insightHeading">
            <span className="insightIcon cyan"><MessageCircle size={18} /></span>
            <h2>{t("relatedScenes")}</h2>
          </div>
          <div className="sceneGrid">
            {sceneTopics.map(({ topic, label, icon: Icon }) => {
              const first = SENTENCES.find((item) => item.topic === topic);
              return first ? (
                <button key={topic} type="button" className={'sceneThumb scene-' + topic}
                  onClick={() => onChooseRelated?.(first)} disabled={recordingBusy || !onChooseRelated}
                  aria-label={t('practiceScene',{name:label})}>
                  <Icon size={22} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ) : null;
            })}
          </div>
          <div className="privacyNote"><ShieldCheck size={15} /> {t("privacyLocal")}</div>
        </section>
      </aside>
    </div>
  );
}
