import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, RefreshCw, ShieldCheck } from 'lucide-react';

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
      return (
        <main className="recoveryShell">
          <section className="recoveryPanel" role="alert" aria-labelledby="recovery-title">
            <img src="/brand/voxnelo-mark.svg" alt="Voxnelo" width="53" height="53" />
            <div className="recoveryIcon"><AlertTriangle size={22} /></div>
            <h1 id="recovery-title">页面遇到了问题</h1>
            <p>可以重新尝试打开练习界面，或者重新加载应用。不会自动清除你的本地学习记录。</p>
            <div className="recoveryButtons">
              <button type="button" className="recoveryPrimary" onClick={this.retry}>
                <RotateCcw size={17} /> 重试
              </button>
              <button type="button" className="recoverySecondary" onClick={this.reload}>
                <RefreshCw size={17} /> 重新加载
              </button>
            </div>
            <span className="recoveryPrivacy"><ShieldCheck size={15} /> 错误详情仅记录在本机控制台，不会自动上传</span>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
