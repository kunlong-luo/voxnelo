// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DesktopTitlebar } from '../apps/web/src/DesktopTitlebar';
import type { VoxneloDesktopAPI } from '../apps/web/src/desktopBridge';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Nordic frameless Electron titlebar', () => {
  it('does not fake OS controls in a normal browser preview', () => {
    render(<DesktopTitlebar />);
    expect(screen.getByText('Voxnelo')).toBeTruthy();
    expect(screen.getByRole('banner', { name: 'Voxnelo 自定义窗口标题栏' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '关闭窗口' })).toBeNull();
  });

  it('routes only named window operations through the preload bridge', async () => {
    const minimize = vi.fn();
    const toggleMaximize = vi.fn();
    const close = vi.fn();
    const unsubscribe = vi.fn();
    let notify: ((value: boolean) => void) | undefined;
    const api: VoxneloDesktopAPI = {
      platform: 'win32', version: '0.1.0',
      windowControls: {
        minimize, toggleMaximize, close,
        isMaximized: vi.fn().mockResolvedValue(false),
        onMaximizeChange: (listener) => {
          notify = listener;
          return unsubscribe;
        },
      },
    };
    vi.stubGlobal('voxneloDesktop', api);
    const view = render(<DesktopTitlebar />);
    fireEvent.click(screen.getByRole('button', { name: '最小化窗口' }));
    fireEvent.click(screen.getByRole('button', { name: '最大化窗口' }));
    fireEvent.click(screen.getByRole('button', { name: '关闭窗口' }));
    expect(minimize).toHaveBeenCalledOnce();
    expect(toggleMaximize).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
    act(() => notify?.(true));
    await waitFor(() => expect(screen.getByRole('button', { name: '还原窗口' })).toBeTruthy());
    view.unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('uses macOS control order and keeps accessible labels', () => {
    vi.stubGlobal('voxneloDesktop', {
      platform: 'darwin', version: '0.1.0',
      windowControls: {
        minimize: vi.fn(), toggleMaximize: vi.fn(), close: vi.fn(),
        isMaximized: vi.fn().mockResolvedValue(false),
        onMaximizeChange: () => () => undefined,
      },
    } satisfies VoxneloDesktopAPI);
    const { container } = render(<DesktopTitlebar />);
    expect(container.querySelector('.windowControls.mac')).toBeTruthy();
    expect(screen.getByRole('button', { name: '最小化窗口' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '关闭窗口' })).toBeTruthy();
  });
});
