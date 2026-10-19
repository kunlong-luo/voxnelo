import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { createOnlineRecognizerConfig } from '../apps/desktop/asrConfig';

describe('Sherpa ONNX Node public streaming recognizer contract', () => {
  it('uses exactly the upstream transducer and endpoint configuration', () => {
    const model = path.resolve('/tmp', 'voxnelo', 'test-model');
    const config = createOnlineRecognizerConfig(model);
    expect(config.featConfig).toEqual({sampleRate:16000,featureDim:80});
    expect(config.modelConfig).toEqual({
      transducer:{
        encoder:path.join(model,'encoder.onnx'),
        decoder:path.join(model,'decoder.onnx'),
        joiner:path.join(model,'joiner.onnx'),
      },
      tokens:path.join(model,'tokens.txt'),
      numThreads:2,debug:0,provider:'cpu',
    });
    expect(config).toMatchObject({
      decodingMethod:'greedy_search',enableEndpoint:true,
      rule1MinTrailingSilence:2.4,
      rule2MinTrailingSilence:1.2,
      rule3MinUtteranceLength:15,
    });
  });

  it('keeps greedy as the production default but supports a documented A/B beam configuration',()=>{
    const model=path.resolve('reviewed-model');
    const greedy=createOnlineRecognizerConfig(model);
    const beam=createOnlineRecognizerConfig(model,'modified_beam_search');
    expect(greedy.decodingMethod).toBe('greedy_search');
    expect('maxActivePaths' in greedy).toBe(false);
    expect(beam).toMatchObject({decodingMethod:'modified_beam_search',maxActivePaths:4});
    expect(beam.modelConfig).toEqual(greedy.modelConfig);
    expect(beam.featConfig).toEqual(greedy.featConfig);
  });

  it('does not depend on a hard-coded native binary or user-selected path', () => {
    const config = createOnlineRecognizerConfig(path.resolve('reviewed-model'));
    expect(config.modelConfig.transducer.encoder).toContain('reviewed-model');
    expect('addonPath' in config).toBe(false);
  });
});
