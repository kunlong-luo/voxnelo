import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';

const read=(path:string)=>readFileSync(path,'utf8');
const future=read('.github/workflows/release-draft.yml');
const repair=read('.github/workflows/repair-v1.0.4-private-draft-win-checksum-once.yml');

describe('GitHub draft Windows filename normalization and one-time checksum repair',()=>{
  it('keeps the exact source/manifest checks before normalizing the download name',()=>{
    expect(future).toContain('scripts/validate-release-draft.mts');
    expect(future).toContain('mv -- "$original" "$published"');
    expect(future).toContain('Voxnelo.Setup.${RELEASE_VERSION}.exe');
    expect(future).toContain('sha256sum -c SHA256SUMS-win32.txt');
    expect(future.indexOf('scripts/validate-release-draft.mts')).toBeLessThan(
      future.indexOf('Normalize Windows Release asset filename'));
    expect(future.indexOf('Normalize Windows Release asset filename')).toBeLessThan(
      future.indexOf('gh release create "v$RELEASE_VERSION"'));
    expect(future).toContain('--draft --prerelease');
    expect(future).not.toContain('gh release publish');
  });
  it('runs only when its own one-time workflow lands on main',()=>{
    expect(repair).toContain('branches: [main]');
    expect(repair).toContain(
      "- '.github/workflows/repair-v1.0.4-private-draft-win-checksum-once.yml'");
    expect(repair).toContain("github.repository == 'kunlong-luo/voxnelo'");
    expect(repair).toContain("github.ref == 'refs/heads/main'");
    expect(repair).not.toMatch(/^\s+tags:/m);
    expect(repair).not.toMatch(/^\s+schedule:/m);
  });
  it('limits write access to the exact private v1.0.4 draft and its checksum',()=>{
    expect(repair).toContain('.id == 428750217');
    expect(repair).toContain('.draft == true');
    expect(repair).toContain('.published_at == null');
    expect(repair).toContain('4aeb58e37840d2aec760fac3e348ab18b9ce1be1');
    expect(repair).toContain('releases/$RELEASE_ID');
    expect(repair).toContain('releases/assets/$id');
    expect(repair).toContain('Accept: application/octet-stream');
    expect(repair).toContain("actual=\"$(sha256sum 'Voxnelo.Setup.1.0.4.exe'");
    expect(repair).toContain('Voxnelo Setup 1.0.4.exe');
    expect(repair).toContain('Voxnelo.Setup.1.0.4.exe');
    expect(repair).toContain('sha256sum -c SHA256SUMS-win32.txt');
    expect(repair).toContain('https://uploads.github.com/repos/$GH_REPO/releases/$RELEASE_ID/assets?name=$temp_name');
    expect(repair).toContain('gh api --method DELETE');
    expect(repair).toContain('gh api --method PATCH');
    expect(repair).toContain('SHA256SUMS-win32-verified-');
    expect(repair).not.toContain('gh release publish');
    expect(repair).not.toContain('gh release create');
    expect(repair).not.toContain('gh release edit');
    expect(repair).not.toContain('gh api repos/kunlong-luo/voxnelo/releases/tags/v1.0.4');
    expect(repair).not.toContain('git tag ');
    expect(repair).not.toContain('Voxnelo.Setup.1.0.4.exe" --clobber');
  });
});
