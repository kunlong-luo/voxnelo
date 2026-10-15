import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { isAudioOnlyRequest, isTrustedUrl, resolveLocalFile } from '../apps/desktop/security';

describe('Voxnelo V0.1 主进程安全守卫', () => {
  describe('isTrustedUrl', () => {
    it('dev 放行本地调试源', () => {
      expect(isTrustedUrl('http://127.0.0.1:3000/index.html', { isDev: true })).toBe(true);
    });

    it('dev 拒绝非调试源与生产协议', () => {
      expect(isTrustedUrl('http://127.0.0.1:3001/', { isDev: true })).toBe(false);
      expect(isTrustedUrl('https://127.0.0.1:3000/', { isDev: true })).toBe(false);
      expect(isTrustedUrl('voxnelo://app/index.html', { isDev: true })).toBe(false);
    });

    it('dev 支持自定义调试源', () => {
      expect(isTrustedUrl('http://127.0.0.1:4000/', { isDev: true, devOrigin: 'http://127.0.0.1:4000' })).toBe(true);
    });

    it('生产放行 voxnelo://app 且拒绝变体', () => {
      expect(isTrustedUrl('voxnelo://app/index.html', { isDev: false })).toBe(true);
      expect(isTrustedUrl('voxnelo://evil/index.html', { isDev: false })).toBe(false);
      expect(isTrustedUrl('voxnelo://app:80/index.html', { isDev: false })).toBe(false);
      expect(isTrustedUrl('voxnelo://user@app/index.html', { isDev: false })).toBe(false);
      expect(isTrustedUrl('http://127.0.0.1:3000/', { isDev: false })).toBe(false);
    });

    it('非法 URL 一律拒绝', () => {
      expect(isTrustedUrl('', { isDev: false })).toBe(false);
      expect(isTrustedUrl('not a url', { isDev: true })).toBe(false);
    });
  });

  describe('isAudioOnlyRequest', () => {
    it('仅音频通过', () => {
      expect(isAudioOnlyRequest(['audio'])).toBe(true);
    });

    it('含视频、空数组与非数组拒绝', () => {
      expect(isAudioOnlyRequest(['audio', 'video'])).toBe(false);
      expect(isAudioOnlyRequest([])).toBe(false);
      expect(isAudioOnlyRequest(undefined)).toBe(false);
      expect(isAudioOnlyRequest('audio')).toBe(false);
    });
  });

  describe('resolveLocalFile', () => {
    const dir = path.resolve('/tmp/voxnelo-dist');

    it('常规路径与根路径映射', () => {
      expect(resolveLocalFile(dir, '/index.html')).toBe(path.join(dir, 'index.html'));
      expect(resolveLocalFile(dir, '/')).toBe(path.join(dir, 'index.html'));
      expect(resolveLocalFile(dir, '/assets/app.js')).toBe(path.join(dir, 'assets/app.js'));
    });

    it('目录穿越返回 null（含编码形式）', () => {
      expect(resolveLocalFile(dir, '/../secret')).toBeNull();
      expect(resolveLocalFile(dir, '/a/../../secret')).toBeNull();
      expect(resolveLocalFile(dir, '/%2e%2e/secret')).toBeNull();
    });
  });
});
