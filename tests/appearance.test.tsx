// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { APPEARANCE_KEY, applyAppearance, parseAppearance, readAppearance, saveAppearance } from '../apps/web/src/appearance';
import { App } from '../apps/web/src/App';

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('Local-only appearance preference', () => {
  it('falls back to Nordic for a missing or unrecognized value', () => {
    expect(parseAppearance(undefined)).toBe('nordic');
    expect(parseAppearance('invalid-theme')).toBe('nordic');
    expect(readAppearance()).toBe('nordic');
  });

  it('applies and persists only the explicitly chosen appearance', () => {
    saveAppearance('sunset');
    expect(localStorage.getItem(APPEARANCE_KEY)).toBe('sunset');
    expect(document.documentElement.dataset.theme).toBe('sunset');
    expect(readAppearance()).toBe('sunset');
    applyAppearance('nordic');
    expect(readAppearance()).toBe('sunset');
    saveAppearance('nordic');
    expect(readAppearance()).toBe('nordic');
  });

  it('switches theme through settings and leaves practice navigation intact', async () => {
    const view = render(<App />);
    expect(document.documentElement.dataset.theme).toBe('nordic');
    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    const sunset = screen.getByRole('button', { name: '选择日落柔光主题' });
    expect(sunset.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(sunset);
    expect(document.documentElement.dataset.theme).toBe('sunset');
    expect(localStorage.getItem(APPEARANCE_KEY)).toBe('sunset');
    expect(screen.getByRole('button', { name: '选择日落柔光主题' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '返回练习' }));
    expect(screen.getByRole('button', { name: '开口跟读' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '换一句' })).toBeTruthy();
    view.unmount();

    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('sunset');
    fireEvent.click(screen.getByRole('button', { name: '设置' }));
    fireEvent.click(screen.getByRole('button', { name: '选择北欧纯净主题' }));
    expect(localStorage.getItem(APPEARANCE_KEY)).toBe('nordic');
    expect(document.documentElement.dataset.theme).toBe('nordic');
  });

  it('replaces invalid stored preferences with the safe Nordic baseline', () => {
    localStorage.setItem(APPEARANCE_KEY, 'glow-unknown');
    render(<App />);
    expect(document.documentElement.dataset.theme).toBe('nordic');
  });
});
