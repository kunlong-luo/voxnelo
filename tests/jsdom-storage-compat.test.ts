// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

describe('jsdom Web Storage on supported Node LTS versions', () => {
  it('keeps local and session storage available to browser component tests', () => {
    expect(window.localStorage).toBe(localStorage);
    expect(window.sessionStorage).toBe(sessionStorage);
    const key = 'voxnelo:node26-jsdom-storage';
    try {
      localStorage.setItem(key, 'local');
      sessionStorage.setItem(key, 'session');
      expect(window.localStorage.getItem(key)).toBe('local');
      expect(window.sessionStorage.getItem(key)).toBe('session');
    } finally {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  });
});
