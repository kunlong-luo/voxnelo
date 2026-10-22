import {describe,expect,it} from 'vitest';
import {MOONSHINE_INSTALL_STAGES,moonshineStageLine,parseMoonshineInstallStage}
  from '../apps/desktop/moonshineInstallProgress';

describe('safe Moonshine installer progress protocol',()=>{
  it('accepts only the six fixed stages',()=>{
    expect(MOONSHINE_INSTALL_STAGES).toHaveLength(6);
    for(const stage of MOONSHINE_INSTALL_STAGES)
      expect(parseMoonshineInstallStage(moonshineStageLine(stage).trim())).toBe(stage);
  });
  it('rejects downloader logs, paths, malformed and arbitrary stage strings',()=>{
    for(const line of [
      'Installing moonshine-voice==0.0.65',
      'VOXNELO_INSTALL_STAGE:/home/private/user',
      'VOXNELO_INSTALL_STAGE:complete;rm -rf /',
      'VOXNELO_INSTALL_STAGE:finished',
      'VOXNELO_INSTALL_STAGE:model-download\\nVOXNELO_INSTALL_STAGE:activation',
      'VOXNELO_INSTALL_STAGE:'.padEnd(150,'x'),
    ])expect(parseMoonshineInstallStage(line)).toBeNull();
  });
});
