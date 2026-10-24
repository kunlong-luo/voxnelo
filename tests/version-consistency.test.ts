import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from '@voxnelo/core';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const readVersion=(filename:string):string=>{
  const data=JSON.parse(readFileSync(path.join(root,filename),'utf8')) as {version?:unknown};
  if(typeof data.version!=='string')throw Error('Missing version: '+filename);
  return data.version;
};

describe('Voxnelo release identity',()=>{
  it('keeps desktop installer, renderer and workspace packages on the same version',()=>{
    const version=readVersion('package.json');
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(APP_VERSION).toBe(version);
    for(const name of ['core','audio','content','learning','storage']){
      expect(readVersion(`packages/${name}/package.json`)).toBe(version);
    }
  });
  it('attributes the application to Leo Luo',()=>{
    const packageInfo=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8')) as {
      author?:string;build?:{linux?:{maintainer?:string}};
    };
    expect(packageInfo.author).toBe('Leo Luo');
    expect(packageInfo.build?.linux?.maintainer).toBe('Leo Luo <40263163+kunlong-luo@users.noreply.github.com>');
  });

  it('uses the current official unsigned patch release version',()=>{
    expect(readVersion('package.json')).toBe('1.0.1');
  });
});
