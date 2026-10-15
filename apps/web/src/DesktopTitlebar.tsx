import { useEffect, useState } from 'react';
import { Maximize2, Minus, Square, X, Copy } from 'lucide-react';
import './desktopBridge';
import { Tooltip } from './Tooltip';
import { useI18n } from './i18n';

/** Frameless Electron chrome: only actual window controls, without product
 * logo, heading, breadcrumb or extra toolbars. Browser preview renders none.
 */
export function DesktopTitlebar() {
  const {t} = useI18n();
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
    <div className={'windowControls' + (isMac ? ' mac' : '')} role="group" aria-label={t("windowActions")}>
      <Tooltip text={t('windowMinimize')} placement="bottom">
        <button type="button" className="windowControl minimize" aria-label={t('windowMinimize')} onClick={() => controls.minimize()}>
          <Minus size={15} aria-hidden="true" />
        </button>
      </Tooltip>
      <Tooltip text={t(maximized ? 'windowRestore' : 'windowMaximize')} placement="bottom">
        <button type="button" className="windowControl maximize"
          aria-label={t(maximized ? 'windowRestore' : 'windowMaximize')} onClick={() => controls.toggleMaximize()}>
          {maximized ? <Copy size={13} aria-hidden="true" /> : isMac ? <Maximize2 size={13} aria-hidden="true" /> : <Square size={13} aria-hidden="true" />}
        </button>
      </Tooltip>
      <Tooltip text={t('windowClose')} placement="bottom">
        <button type="button" className="windowControl close" aria-label={t('windowClose')} onClick={() => controls.close()}>
          <X size={16} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  ) : null;

  if (!controls) return null;

  return (
    <header className={'appTitlebar' + (isMac ? ' mac' : '')} aria-label={t("windowTitle")}>
      {buttons}
    </header>
  );
}
