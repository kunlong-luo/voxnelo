import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

/** 渲染兜底：练习页抛错时整应用白屏，降级为可重试的中文提示。 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  private retry = (): void => {
    this.setState({ failed: false });
  };

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div className="shell">
          <main className="content">
            <div className="empty">
              <strong>页面遇到了问题</strong>
              <span>可以重试加载当前视图，学习记录保存在本地不会丢失。</span>
              <button onClick={this.retry}>重试</button>
            </div>
          </main>
        </div>
      );
    }
    return this.props.children;
  }
}
