import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { allowsAudioPermissionCheck, allowsAudioPermissionRequest, isAudioOnlyRequest, isTrustedUrl, resolveLocalFile } from '../apps/desktop/security';

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

  describe('Electron audio permission origin and device policy', () => {
    const top='voxnelo://app/index.html';
    const trustedRequest={mediaTypes:['audio'],requestingUrl:top};
    const options={isDev:false};
    it('only the trusted top-level application may request audio', () => {
      expect(allowsAudioPermissionRequest(top,'media',trustedRequest,options)).toBe(true);
      expect(allowsAudioPermissionRequest('https://attacker.example/','media',trustedRequest,options)).toBe(false);
      expect(allowsAudioPermissionRequest(top,'media',{...trustedRequest,requestingUrl:'https://attacker.example/frame'},options)).toBe(false);
      expect(allowsAudioPermissionRequest(top,'media',{mediaTypes:['audio']},options)).toBe(false);
      expect(allowsAudioPermissionRequest(top,'media',{...trustedRequest,requestingUrl:'not a url'},options)).toBe(false);
    });
    it('rejects camera, mixed media, display capture and unrelated permissions', () => {
      expect(allowsAudioPermissionRequest(top,'media',{...trustedRequest,mediaTypes:['video']},options)).toBe(false);
      expect(allowsAudioPermissionRequest(top,'media',{...trustedRequest,mediaTypes:['audio','video']},options)).toBe(false);
      expect(allowsAudioPermissionRequest(top,'display-capture',trustedRequest,options)).toBe(false);
      expect(allowsAudioPermissionRequest(top,'geolocation',trustedRequest,options)).toBe(false);
    });
    it('permission checks reject subframes and foreign origins independently', () => {
      const details={isMainFrame:true,mediaType:'audio',requestingUrl:top,securityOrigin:'voxnelo://app'};
      expect(allowsAudioPermissionCheck(top,'media','voxnelo://app',details,options)).toBe(true);
      expect(allowsAudioPermissionCheck(top,'media','https://attacker.example',details,options)).toBe(false);
      expect(allowsAudioPermissionCheck(top,'media','voxnelo://app',{...details,isMainFrame:false},options)).toBe(false);
      expect(allowsAudioPermissionCheck(top,'media','voxnelo://app',{...details,mediaType:'video'},options)).toBe(false);
      expect(allowsAudioPermissionCheck(top,'media','voxnelo://app',{...details,mediaType:'unknown'},options)).toBe(false);
      expect(allowsAudioPermissionCheck(top,'display-capture','voxnelo://app',details,options)).toBe(false);
      expect(allowsAudioPermissionCheck(top,'media','voxnelo://app',{...details,requestingUrl:'https://attacker.example'},options)).toBe(false);
      expect(allowsAudioPermissionCheck(top,'media','voxnelo://app',{...details,securityOrigin:'https://attacker.example'},options)).toBe(false);
      expect(allowsAudioPermissionCheck(null,'media','voxnelo://app',details,options)).toBe(false);
    });
    it('development-only origin can request audio, but cannot grant production or other dev sites', () => {
      const dev='http://127.0.0.1:3000/index.html';
      expect(allowsAudioPermissionRequest(dev,'media',{mediaTypes:['audio'],requestingUrl:dev},{isDev:true})).toBe(true);
      expect(allowsAudioPermissionRequest(dev,'media',{mediaTypes:['audio'],requestingUrl:top},{isDev:true})).toBe(false);
      expect(allowsAudioPermissionCheck(dev,'media','http://127.0.0.1:3000',{isMainFrame:true,mediaType:'audio',requestingUrl:dev},{isDev:true})).toBe(true);
      expect(allowsAudioPermissionCheck(dev,'media','http://127.0.0.1:3001',{isMainFrame:true,mediaType:'audio',requestingUrl:dev},{isDev:true})).toBe(false);
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
