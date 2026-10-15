import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw, ShieldCheck } from 'lucide-react';
import { translate, resolveLocale, readLanguageSetting } from './i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  failed: boolean;
}

/**
 * Inspired by resume-craft's ErrorBoundary.
 * Render failures never trigger automatic IndexedDB deletion or cloud reporting.
 * Avoid displaying raw error messages that might contain local data/paths.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Local console only; no analytics, uploads, or automatic reset.
    console.error('[Voxnelo] Render failed', error, info.componentStack);
  }

  private retry = (): void => {
    this.setState({ failed: false });
  };

  private reload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.failed) {
      const t = (key: Parameters<typeof translate>[1]) => translate(resolveLocale(readLanguageSetting()), key);
      return (
        <main className="recoveryShell">
          <section className="recoveryPanel" role="alert" aria-labelledby="recovery-title">
            <img src="brand/voxnelo-mark.svg" alt="Voxnelo" width="53" height="53" />
            <div className="recoveryIcon"><AlertTriangle size={22} /></div>
            <h1 id="recovery-title">{t("errorTitle")}</h1>
            <p>{t("errorDesc")}</p>
            <div className="recoveryButtons">
              <button type="button" className="recoveryPrimary" onClick={this.retry}>
                <RotateCcw size={17} /> {t("errorRetry")}
              </button>
              <button type="button" className="recoverySecondary" onClick={this.reload}>
                <RefreshCw size={17} /> {t("errorReload")}
              </button>
            </div>
            <span className="recoveryPrivacy"><ShieldCheck size={15} /> {t("errorPrivacy")}</span>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
