/** Narrow, privacy-preserving progress contract for consented Moonshine setup.
 * Pip/model downloader stdout is never sent to the renderer.
 * Stages are qualitative: no fabricated percent or byte-count claims.
 */
export const MOONSHINE_INSTALL_STAGES=[
  'environment','dependencies','model-download','model-verification','activation','complete',
] as const;
export type MoonshineInstallStage=typeof MOONSHINE_INSTALL_STAGES[number];
const prefix='VOXNELO_INSTALL_STAGE:';
export function parseMoonshineInstallStage(line:string):MoonshineInstallStage|null{
  if(!line.startsWith(prefix)||line.length>80)return null;
  const value=line.slice(prefix.length).trim();
  return MOONSHINE_INSTALL_STAGES.find(stage=>stage===value)??null;
}
export function moonshineStageLine(stage:MoonshineInstallStage):string{
  return prefix+stage+'\n';
}
