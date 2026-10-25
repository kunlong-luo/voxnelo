/** Moonshine Voice 0.0.65 has prebuilt CPython wheels for these targets:
 * Linux x64 (glibc >=2.34), Windows x64, macOS 15+ ARM64.
 * This is an allowlist of installation TARGETS, not proof of working ASR.
 * Native model/SDK checks and actual worker readiness remain mandatory.
 */
export function supportedMoonshineHost(platform:string,arch:string,systemRelease:string):boolean {
  if(arch==='x64'&&(platform==='linux'||platform==='win32'))return true;
  if(platform==='darwin'&&arch==='arm64'){
    // Darwin kernel 24 = macOS 15. Require a known version; don't infer it
    // from the marketing name, Electron version or renderer user agent.
    const major=Number(systemRelease.split('.')[0]);
    return Number.isInteger(major)&&major>=24;
  }
  return false;
}
