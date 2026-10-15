import { useEffect, useState } from 'react';
import { Maximize2, Minus, Square, X, Copy } from 'lucide-react';
import './desktopBridge';
import { Tooltip } from './Tooltip';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';
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
    <div className={cn('windowControls window-no-drag flex items-center gap-1',isMac&&'mac gap-2')} role="group" aria-label={t("windowActions")}>
      <Tooltip text={t('windowMinimize')} placement="bottom">
        <Button variant="ghost" size="icon-sm" className="windowControl minimize window-no-drag size-8 rounded-xl text-muted-foreground hover:bg-secondary" aria-label={t('windowMinimize')} onClick={() => controls.minimize()}>
          <Minus size={15} aria-hidden="true" />
        </Button>
      </Tooltip>
      <Tooltip text={t(maximized ? 'windowRestore' : 'windowMaximize')} placement="bottom">
        <Button variant="ghost" size="icon-sm" className="windowControl maximize window-no-drag size-8 rounded-xl text-muted-foreground hover:bg-secondary"
          aria-label={t(maximized ? 'windowRestore' : 'windowMaximize')} onClick={() => controls.toggleMaximize()}>
          {maximized ? <Copy size={13} aria-hidden="true" /> : isMac ? <Maximize2 size={13} aria-hidden="true" /> : <Square size={13} aria-hidden="true" />}
        </Button>
      </Tooltip>
      <Tooltip text={t('windowClose')} placement="bottom">
        <Button variant="ghost" size="icon-sm" className="windowControl close window-no-drag size-8 rounded-xl text-muted-foreground hover:bg-destructive/15 hover:text-destructive" aria-label={t('windowClose')} onClick={() => controls.close()}>
          <X size={16} aria-hidden="true" />
        </Button>
      </Tooltip>
    </div>
  ) : null;

  if (!controls) return null;

  return (
    <header className={cn('appTitlebar window-drag sticky top-0 z-50 flex h-11 min-h-11 shrink-0 items-center border-b border-border/70 bg-sidebar/90 px-3 backdrop-blur-xl',isMac?'mac justify-start':'justify-end')} aria-label={t("windowTitle")}>
      {buttons}
    </header>
  );
}
