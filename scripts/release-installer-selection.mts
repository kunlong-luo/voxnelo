/**
 * A release directory may contain old installers from previous local builds.
 * Never select an arbitrary find() hit: doing so makes a successful upgrade
 * appear to fail whenever 0.1.0 coexists with 0.1.1.
 */
export function linuxInstallerNames(version:string,arch:NodeJS.Architecture):{deb:string;appImage:string}{
  if(!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version))throw Error('Invalid release version: '+version);
  const debArch=arch==='x64'?'amd64':arch==='arm64'?'arm64':null;
  if(!debArch)throw Error('Unsupported Linux installer architecture: '+arch);
  return {deb:`voxnelo_${version}_${debArch}.deb`,appImage:`Voxnelo-${version}.AppImage`};
}
export function selectLinuxInstallers(
  files:readonly string[],version:string,arch:NodeJS.Architecture,
):{deb:string;appImage:string}{
  const names=linuxInstallerNames(version,arch);
  for(const [type,filename] of Object.entries(names)){
    if(!files.includes(filename))
      throw Error(`Missing current Voxnelo ${type} installer: ${filename}; release/ may contain installers from another version, but only ${version} is valid`);
  }
  return names;
}
