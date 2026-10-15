import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw, ShieldCheck } from 'lucide-react';
import { translate, resolveLocale, readLanguageSetting } from './i18n';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';

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
        <main className="recoveryShell flex min-h-dvh items-center justify-center bg-gradient-to-br from-background via-brand-cream to-brand-mist/50 p-6">
          <Card className="recoveryPanel flex w-full max-w-xl flex-col items-center gap-5 border-white/70 p-8 text-center sm:p-12" role="alert" aria-labelledby="recovery-title">
            <img src="brand/voxnelo-mark.svg" alt="Voxnelo" width="53" height="53" />
            <div className="recoveryIcon rounded-2xl bg-destructive/10 p-4 text-destructive"><AlertTriangle size={22}/></div>
            <h1 className="text-2xl font-extrabold" id="recovery-title">{t("errorTitle")}</h1>
            <p className="max-w-md text-sm leading-7 text-muted-foreground">{t("errorDesc")}</p>
            <div className="recoveryButtons flex flex-wrap justify-center gap-3">
              <Button variant="default" className="recoveryPrimary" onClick={this.retry}>
                <RotateCcw size={17} /> {t("errorRetry")}
              </Button>
              <Button variant="outline" className="recoverySecondary" onClick={this.reload}>
                <RefreshCw size={17} /> {t("errorReload")}
              </Button>
            </div>
            <span className="recoveryPrivacy flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck size={15} /> {t("errorPrivacy")}</span>
          </Card>
        </main>
      );
    }
    return this.props.children;
  }
}
