/** Moonshine 0.0.65 dependencies actually observed on the three native CI
 * runners (2026-11-22). Version pins are NOT wheel hashes, reproducible-build
 * attestations, vulnerability clearance or license approval.
 *
 * Updating any pin requires native SDK/Worker verification on all three OSes.
 */
export const MOONSHINE_RUNTIME_DEPENDENCIES=Object.freeze({
  'certifi':'2026.11.20',
  'cffi':'2.1.1',
  'charset-normalizer':'3.5.2',
  'filelock':'4.3.0',
  'idna':'3.20',
  'moonshine-voice':'0.0.65',
  'numpy':'2.5.5',
  'platformdirs':'4.14.8',
  'pycparser':'3.12',
  'requests':'2.34.2',
  'sounddevice':'0.5.6',
  'tqdm':'4.70.1',
  'urllib3':'2.8.0',
  'colorama':'0.4.6',
} as const);

export function moonshinePythonConstraints():string{
  const lines=[
    '# Versions observed in native SDK CI on 2026-11-22. Hash locking still pending.',
  ];
  for(const [name,version] of Object.entries(MOONSHINE_RUNTIME_DEPENDENCIES)){
    if(name==='colorama'){
      lines.push('colorama==0.4.6; sys_platform == "win32"');
    }else lines.push(name+'=='+version);
  }
  return lines.join('\n')+'\n';
}

/** Pure, testable check of the actual isolated venv inventory after pip resolution.
 * Exactly the observed SDK dependency family is permitted. Tooling installed by
 * CPython's venv bootstrap is exempt but never considered application evidence.
 */
export function verifyMoonshineResolvedPackages(
  packages:unknown,platform:string,
):boolean{
  if(!Array.isArray(packages))return false;
  const allowed=new Map<string,string>(
    Object.entries(MOONSHINE_RUNTIME_DEPENDENCIES).filter(
      ([name])=>name!=='colorama'||platform==='win32',
    ),
  );
  const seen=new Set<string>();
  for(const item of packages){
    if(!Array.isArray(item)||item.length!==2||
      typeof item[0]!=='string'||typeof item[1]!=='string')return false;
    const name=item[0].toLowerCase().replace(/[-_.]+/g,'-');
    if(!/^[a-z0-9][a-z0-9-]*$/.test(name)||seen.has(name))return false;
    seen.add(name);
    if(['pip','setuptools','wheel'].includes(name))continue;
    if(allowed.get(name)!==item[1])return false;
  }
  return [...allowed.keys()].every(name=>seen.has(name));
}

/** CI uses setup-python 3.12; reject silent interpreter drift on all runners. */
export function verifyMoonshineCiPythonVersion(version:unknown):boolean{
  return typeof version==='string'&&/^3\.12\.\d+$/.test(version);
}
