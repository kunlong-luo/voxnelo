import { useEffect, useState } from 'react';
import { Maximize2, Minus, Square, X, Copy } from 'lucide-react';
import './desktopBridge';

/** Real window actions are available exclusively via our narrow Electron preload API.
 * The browser preview shows the title, without fake OS buttons.
 */
export function DesktopTitlebar() {
  const desktop = window.voxneloDesktop;
  const controls = desktop?.windowControls;
  const isMac = desktop?.platform === 'darwin';
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!controls) return;
    let active = true;
    let changedSinceSubscribe = false;
    // Subscribe first: a late initial state request must not override a
    // more recent maximize/unmaximize event from the main process.
    const unsubscribe = controls.onMaximizeChange((value) => {
      changedSinceSubscribe = true;
      if (active) setMaximized(value);
    });
    void controls.isMaximized().then((value) => {
      if (active && !changedSinceSubscribe) setMaximized(value);
    }).catch(() => undefined);
    return () => { active = false; unsubscribe(); };
  }, [controls]);

  const buttons = controls ? (
    <div className={'windowControls' + (isMac ? ' mac' : '')} role="group" aria-label="窗口操作">
      <button type="button" className="windowControl minimize" title="最小化窗口" aria-label="最小化窗口" onClick={() => controls.minimize()}>
        <Minus size={15} aria-hidden="true" />
      </button>
      <button type="button" className="windowControl maximize" title={maximized ? '还原窗口' : '最大化窗口'}
        aria-label={maximized ? '还原窗口' : '最大化窗口'} onClick={() => controls.toggleMaximize()}>
        {maximized ? <Copy size={13} aria-hidden="true" /> : isMac ? <Maximize2 size={13} aria-hidden="true" /> : <Square size={13} aria-hidden="true" />}
      </button>
      <button type="button" className="windowControl close" title="关闭窗口" aria-label="关闭窗口" onClick={() => controls.close()}>
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  ) : null;

  return (
    <header className={'appTitlebar' + (isMac ? ' mac' : '')} aria-label="Voxnelo 自定义窗口标题栏">
      <div className="titlebarBrand"><img src="/brand/voxnelo-mark.svg" alt="" width="24" height="24" /><strong>Voxnelo</strong></div>
      <span className="titlebarSubtitle">英语口语练习</span>
      {buttons}
    </header>
  );
}
