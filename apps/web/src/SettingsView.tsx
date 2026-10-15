import { ArrowLeft, AudioLines, Check, Languages, Palette, ShieldCheck, Settings2 } from 'lucide-react';
import type { AppearanceTheme } from './appearance';

interface SettingsViewProps {
  speed: 'normal' | 'slow';
  showIpa: boolean;
  appearance: AppearanceTheme;
  onChangeAppearance: (theme: AppearanceTheme) => void;
  onToggleSpeed: () => void;
  onToggleIpa: () => void;
  onBackToPractice: () => void;
}

const appearances: { id: AppearanceTheme; name: string; summary: string }[] = [
  { id: 'nordic', name: '北欧纯净', summary: '暖白与鼠尾草绿 · 默认主题' },
  { id: 'sunset', name: '日落柔光', summary: '桃粉与雾青 · 实验性视觉预览' },
];

/** Local appearance persists; speed and IPA remain session-scoped. */
export function SettingsView({
  speed, showIpa, appearance, onChangeAppearance,
  onToggleSpeed, onToggleIpa, onBackToPractice,
}: SettingsViewProps) {
  return (
    <div className="settingsPage">
      <div className="libraryTitle">
        <div>
          <div className="eyebrow"><Settings2 size={16} /> YOUR PRACTICE</div>
          <h1>练习设置</h1>
          <p>语音和音标设置本次会话生效；外观选择只保存在本机。</p>
        </div>
        <button type="button" className="backPractice" onClick={onBackToPractice}>
          <ArrowLeft size={17} /> 返回练习
        </button>
      </div>
      <div className="settingsGrid">
        <section className="settingsPanel appearanceSettings">
          <div className="settingsPanelHeading"><Palette size={21} /><h2>外观主题</h2></div>
          <p>两种风格使用同一套练习功能。可以随时切换，不影响学习进度和录音。</p>
          <div className="appearanceChoices" role="group" aria-label="选择外观主题">
            {appearances.map(({ id, name, summary }) => (
              <button type="button" className="appearanceChoice" key={id}
                onClick={() => onChangeAppearance(id)}
                aria-label={'选择' + name + '主题'}
                aria-pressed={appearance === id}>
                <span className={'appearancePreview ' + id} aria-hidden="true" />
                <strong>{name} {appearance === id ? <Check size={15} aria-hidden="true" /> : null}</strong>
                <small>{summary}</small>
              </button>
            ))}
          </div>
          <p className="appearanceHelp">日落柔光目前为设计预览，尚未完成跨平台实机与用户体验验证。</p>
        </section>
        <section className="settingsPanel">
          <div className="settingsPanelHeading"><AudioLines size={21} /><h2>语音播放</h2></div>
          <p>选择系统英语朗读速度；具体声音取决于设备安装的语音包。</p>
          <button type="button" className="settingToggle" onClick={onToggleSpeed} aria-pressed={speed === 'slow'}>
            <span><strong>慢速模式</strong><small>以约 0.75 倍速播放示范发音</small></span>
            <span className={'switchTrack' + (speed === 'slow' ? ' on' : '')}><span /></span>
          </button>
        </section>
        <section className="settingsPanel">
          <div className="settingsPanelHeading"><Languages size={21} /><h2>练习内容</h2></div>
          <p>音标仅供学习参考；发音标记将在正式发布前继续校对。</p>
          <button type="button" className="settingToggle" onClick={onToggleIpa} aria-pressed={showIpa}>
            <span><strong>显示参考音标</strong><small>在英语例句下方展示音标</small></span>
            <span className={'switchTrack' + (showIpa ? ' on' : '')}><span /></span>
          </button>
        </section>
        <section className="settingsPanel privacySettings">
          <div className="settingsPanelHeading"><ShieldCheck size={21} /><h2>本地隐私</h2></div>
          <p>无需账号，学习记录保存在本机。麦克风仅在点击跟读后申请权限，录音只供本次回听，切换句子后会清理。</p>
        </section>
      </div>
    </div>
  );
}
