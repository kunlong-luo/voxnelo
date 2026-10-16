import path from 'node:path';

export interface AsrAssetOptions {
  isPackaged: boolean;
  resourcesPath: string;
  developerModelDir?: string | undefined;
  developerAddonPath?: string | undefined;
}

/**
 * Only developer-specified paths or files bundled by our own release builder
 * are eligible. Renderer IPC must never accept an arbitrary model/addon path.
 */
export function resolveAsrAssets(options: AsrAssetOptions): {modelDir:string|null;addonPath:string|null} {
  if (!options.isPackaged) {
    return {
      modelDir: options.developerModelDir ?? null,
      addonPath: options.developerAddonPath ?? null,
    };
  }
  return {
    modelDir: path.join(options.resourcesPath, 'offline-asr', 'model'),
    addonPath: path.join(options.resourcesPath, 'offline-asr', 'native', 'sherpa-onnx.node'),
  };
}
