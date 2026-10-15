// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { ErrorBoundary } from '../apps/web/src/ErrorBoundary';
import { LANGUAGE_STORAGE_KEY } from '../apps/web/src/i18n';

afterEach(() => { cleanup(); localStorage.removeItem(LANGUAGE_STORAGE_KEY); });

beforeEach(() => localStorage.setItem(LANGUAGE_STORAGE_KEY, 'zh-CN'));

function Boom(): ReactNode {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  it('子组件抛错时显示中文兜底而非白屏', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('页面遇到了问题')).toBeTruthy();
    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '重新加载' })).toBeTruthy();
    expect(screen.getByText(/不会自动清除你的本地学习记录/)).toBeTruthy();
    expect(screen.getByText(/不会自动上传/)).toBeTruthy();
    vi.restoreAllMocks();
  });

  it('正常渲染子组件', () => {
    render(
      <ErrorBoundary>
        <span>hello</span>
      </ErrorBoundary>,
    );
    expect(screen.getByText('hello')).toBeTruthy();
  });

  it('点击重试后恢复渲染', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let broken = true;
    function Maybe(): ReactNode {
      if (broken) throw new Error('boom');
      return <span>recovered</span>;
    }
    render(
      <ErrorBoundary>
        <Maybe />
      </ErrorBoundary>,
    );
    broken = false;
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    expect(screen.getByText('recovered')).toBeTruthy();
    vi.restoreAllMocks();
  });
});
