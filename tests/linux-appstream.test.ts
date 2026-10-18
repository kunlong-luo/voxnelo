import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root=path.resolve('.');
const buildInfo=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8')) as {
  version:string;
  author:string;
  build:{appId:string;desktopName:string;linux:{maintainer:string}};
};
const appstream=readFileSync(path.join(root,'build','app.voxnelo.desktop.metainfo.xml'),'utf8');

describe('Linux AppStream / KDE Discover branding',()=>{
  it('uses the public desktop ID, Leo Luo and the current release version',()=>{
    expect(buildInfo.author).toBe('Leo Luo');
    expect(buildInfo.build.linux.maintainer).toContain('Leo Luo');
    expect(appstream).toContain('<id>'+buildInfo.build.appId+'</id>');
    expect(appstream).toContain('<launchable type="desktop-id">'+buildInfo.desktopName+'</launchable>');
    expect(appstream).toContain('<name>Leo Luo</name>');
    expect(appstream).toContain('<icon type="stock">voxnelo</icon>');
    expect(appstream).toContain('<release version="'+buildInfo.version+'"');
    expect(appstream).toContain('<project_license>MIT</project_license>');
    expect(appstream).toContain('https://github.com/kunlong-luo/voxnelo/issues');
  });
  it('does not misrepresent experimental local speech recognition as part of standard installers',()=>{
    expect(appstream).toContain('not included in standard public installers');
  });
  it('runs brand injection in both local and CI Linux packaging flows',()=>{
    const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8')) as {
      scripts:{'pack:linux':string};
    };
    const ci=readFileSync(path.join(root,'.github','workflows','ci.yml'),'utf8');
    const release=readFileSync(path.join(root,'.github','workflows','release.yml'),'utf8');
    expect(pkg.scripts['pack:linux']).toContain('scripts/brand-linux-installer.mts');
    expect(ci).toContain('scripts/brand-linux-installer.mts');
    expect(release).toContain('scripts/brand-linux-installer.mts');
  });
});
