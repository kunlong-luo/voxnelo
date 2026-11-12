import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {parseLocalDevUrl,waitForLocalDevServer} from '../scripts/wait-for-local-dev-server.mts';

describe('dependency-free localhost renderer readiness',()=>{
  it('accepts only the Rsbuild HTTP loopback port',()=>{
    expect(parseLocalDevUrl('http://127.0.0.1:3000').origin).toBe('http://127.0.0.1:3000');
    expect(parseLocalDevUrl('http://localhost:3000').port).toBe('3000');
    expect(parseLocalDevUrl('http://[::1]:3000').port).toBe('3000');
    for(const url of [
      'https://127.0.0.1:3000',
      'http://example.com:3000',
      'http://192.168.1.1:3000',
      'http://127.0.0.1:3001',
      'http://user:secret@localhost:3000',
    ]) expect(()=>parseLocalDevUrl(url),url).toThrow();
  });
  it('retries connection-refused/error responses and returns when ready',async()=>{
    let now=0,attempts=0;
    await expect(waitForLocalDevServer('http://127.0.0.1:3000',{
      now:()=>now,
      sleep:async ms=>{now+=ms},
      probe:async url=>{
        expect(url.origin).toBe('http://127.0.0.1:3000');
        attempts++;
        if(attempts===1)throw Error('ECONNREFUSED');
        return attempts===3;
      },
    },2000)).resolves.toBeUndefined();
    expect(attempts).toBe(3);
    expect(now).toBe(500);
  });
  it('fails closed with bounded wait time when renderer never starts',async()=>{
    let now=0,attempts=0;
    await expect(waitForLocalDevServer('http://localhost:3000',{
      now:()=>now,
      sleep:async ms=>{now+=ms},
      probe:async()=>{attempts++;return false},
    },500)).rejects.toThrow(/did not become ready/);
    expect(attempts).toBe(2);
    expect(now).toBe(500);
    await expect(waitForLocalDevServer('http://localhost:3000',{},0)).rejects.toThrow(/timeout/);
  });
});

describe('retire vulnerable dev-only wait-on transitive packages',()=>{
  it('retains the desktop dev UX without wait-on, joi or follow-redirects',()=>{
    const pkg=JSON.parse(readFileSync('package.json','utf8')) as {
      devDependencies:Record<string,string>;
      scripts:Record<string,string>;
    };
    const lock=readFileSync('pnpm-lock.yaml','utf8');
    expect(pkg.devDependencies['wait-on']).toBeUndefined();
    expect(pkg.scripts['dev:desktop']).toContain('scripts/wait-for-local-dev-server.mts');
    expect(pkg.scripts['dev:desktop']).toContain('VOXNELO_DEV_SERVER_URL=http://127.0.0.1:3000');
    expect(lock).not.toContain('wait-on@9.5.1');
    expect(lock).not.toContain('follow-redirects@1.16.1');
    expect(lock).not.toContain('joi@18.2.9');
    expect(lock).not.toContain('axios@1.20.0');
  });
});
