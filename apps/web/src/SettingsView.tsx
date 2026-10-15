import { ArrowLeft, AudioLines, Languages, ShieldCheck, Settings2 } from 'lucide-react';

interface SettingsViewProps {
  speed: 'normal' | 'slow';
  showIpa: boolean;
  onToggleSpeed: () => void;
  onToggleIpa: () => void;
  onBackToPractice: () => void;
}

/** Session preferences: no account, cloud sync or background recording. */
export function SettingsView({ speed, showIpa, onToggleSpeed, onToggleIpa, onBackToPractice }: SettingsViewProps) {
  return (
    <div className="settingsPage">
      <div className="libraryTitle">
        <div>
          <div className="eyebrow"><Settings2 size={16} /> YOUR PRACTICE</div>
          <h1>练习设置</h1>
          <p>调整当前练习体验。选择在本次打开应用期间生效。</p>
        </div>
        <button type="button" className="backPractice" onClick={onBackToPractice}><ArrowLeft size={17} /> 返回练习</button>
      </div>
      <div className="settingsGrid">
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
