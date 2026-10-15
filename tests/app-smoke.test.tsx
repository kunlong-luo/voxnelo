// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FIRST_SENTENCE } from '@voxnelo/content';
import { database } from '@voxnelo/storage';
import { App } from '../apps/web/src/App';

afterEach(cleanup);

beforeEach(async () => {
  await database.transaction('rw', database.states, database.events, async () => {
    await database.states.clear();
    await database.events.clear();
  });
});

describe('App smoke', () => {
  it('首屏展示品牌、首句与导航', async () => {
    render(<App />);
    expect(screen.getByText('Voxnelo')).toBeTruthy();
    expect(await screen.findByText(FIRST_SENTENCE.english)).toBeTruthy();
    expect(screen.getByRole('button', { name: '换一句' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '我的收藏' })).toBeTruthy();
  });

  it('右方向键换到下一句', async () => {
    render(<App />);
    await screen.findByText(FIRST_SENTENCE.english);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.queryByText(FIRST_SENTENCE.english)).toBeNull();
    });
  });
});
