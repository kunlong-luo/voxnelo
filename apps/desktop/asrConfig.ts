import path from 'node:path';

/** Public sherpa-onnx-node OnlineRecognizer configuration contract.
 * The native .node addon alone exposes low-level functions; the approved
 * CommonJS adapter entry must expose OnlineRecognizer.
 * https://k2-fsa.github.io/sherpa/onnx/javascript-api/examples/api_streaming_asr.html
 */
export function createOnlineRecognizerConfig(modelDir: string) {
  return {
    featConfig: { sampleRate: 16000, featureDim: 80 },
    modelConfig: {
      transducer: {
        encoder: path.join(modelDir, 'encoder.onnx'),
        decoder: path.join(modelDir, 'decoder.onnx'),
        joiner: path.join(modelDir, 'joiner.onnx'),
      },
      tokens: path.join(modelDir, 'tokens.txt'),
      numThreads: 2,
      debug: 0,
      provider: 'cpu',
    },
    decodingMethod: 'greedy_search',
    enableEndpoint: true,
    rule1MinTrailingSilence: 2.4,
    rule2MinTrailingSilence: 1.2,
    rule3MinUtteranceLength: 15,
  };
}
