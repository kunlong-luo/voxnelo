import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {lstat,readdir} from 'node:fs/promises';
import path from 'node:path';
import {supportedMoonshineHost} from './moonshinePlatform.ts';

/** PyPI-published wheel filenames and SHA-256 for the *existing* 0.0.65 SDK.
 * Source: https://pypi.org/project/moonshine-voice/0.0.65/
 * These are registry file digests, not a publisher signature, license clearance,
 * transitive dependency lock or independent reproducible-build attestation.
 */
export interface MoonshineWheel {
  filename:string;
  sha256:string;
}
const wheels:Readonly<Record<string,MoonshineWheel>>=Object.freeze({
  'linux:x64':Object.freeze({
    filename:'moonshine_voice-0.0.65-py3-none-manylinux_2_34_x86_64.whl',
    sha256:'946e0a056dd3a13ee8cc28dec84c0f01676743a841bae5e6c52a87483b10241b',
  }),
  'win32:x64':Object.freeze({
    filename:'moonshine_voice-0.0.65-py3-none-win_amd64.whl',
    sha256:'657e16825ca8f4298fea2a9d9a28bb685d9cf6ad247e104656ed5b02b9ff886b',
  }),
  'darwin:arm64':Object.freeze({
    filename:'moonshine_voice-0.0.65-py3-none-macosx_15_0_arm64.whl',
    sha256:'3e92fa8497bf4fc40b6241e4dc29fd4ac77832f7f3d8addc4fd467a6bf1cf605',
  }),
});

/** Only the platform wheel that is both supported and listed above may be installed. */
export function pinnedMoonshineWheel(
  platform:string,arch:string,systemRelease:string,
):MoonshineWheel|null{
  if(!supportedMoonshineHost(platform,arch,systemRelease))return null;
  return wheels[platform+':'+arch]??null;
}

/** Verify the exact staged SDK wheel *before* asking pip to install it.
 * A private per-install directory must contain exactly one ordinary wheel.
 * Fail closed on unknown files, symlinks, bad digests and read errors.
 */
export async function verifyPinnedMoonshineWheel(
  directory:string,wheel:Readonly<MoonshineWheel>,
):Promise<boolean>{
  try{
    if(!path.isAbsolute(directory)||
      !/^moonshine_voice-0\.0\.65-py3-none-[A-Za-z0-9_.]+\.whl$/.test(wheel.filename)||
      !/^[0-9a-f]{64}$/.test(wheel.sha256))return false;
    const dir=await lstat(directory);
    if(!dir.isDirectory()||dir.isSymbolicLink())return false;
    const entries=await readdir(directory,{withFileTypes:true});
    if(entries.length!==1||entries[0]?.name!==wheel.filename||
      !entries[0].isFile()||entries[0].isSymbolicLink())return false;
    const hash=createHash('sha256');
    for await(const chunk of createReadStream(path.join(directory,wheel.filename)))
      hash.update(chunk);
    return hash.digest('hex')===wheel.sha256;
  }catch{return false;}
}
