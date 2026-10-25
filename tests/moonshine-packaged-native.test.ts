import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const workflow=readFileSync('.github/workflows/moonshine-native-matrix.yml','utf8');
const smoke=readFileSync('scripts/check-packaged-moonshine-native.mts','utf8');
describe('Moonshine production packaged runtime proof',()=>{
  it('must build production app and execute the real bundled worker on three OSes',()=>{
    for(const label of ['ubuntu-24.04','windows-latest','macos-15']){
      expect(workflow).toContain(label);
    }
    expect(workflow).toContain('pnpm exec electron-builder --dir --publish never');
    expect(workflow).toContain('scripts/check-packaged-moonshine-native.mts');
    expect(smoke).toContain("path.join(asar,'dist-electron','moonshineAsrWorker.cjs')");
    expect(smoke).toContain("ELECTRON_RUN_AS_NODE:'1'");
    expect(smoke).toContain('verifyPinnedMoonshineMediumModel');
    expect(smoke).toContain('verifyMoonshinePythonRuntime');
    expect(smoke).toContain("type:'pcm'");
    expect(smoke).toContain("type:'finish'");
    expect(smoke).toContain('PACKAGED_MOONSHINE_NATIVE_OK');
  });
  it('does not download a model, use customer speech or silently select a cloud ASR',()=>{
    expect(smoke).toContain('--help');
    expect(smoke).not.toContain('pip install');
    expect(smoke).not.toContain('moonshine_voice.download');
    expect(smoke).not.toContain('SpeechRecognition');
  });
});
