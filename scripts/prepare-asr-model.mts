#!/usr/bin/env node
/**
 * Download a PINNED English streaming transducer candidate for offline QA.
 * This is a model-only cache, NOT a release/installer staging step.
 * No native executables, scripts or user audio are downloaded or executed.
 */
import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ENGLISH_MODEL = {
  id: 'csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-02-21',
  revision: 'bfbb11950302dad9955f8ede01f0e768595e4fba',
  license: 'apache-2.0',
  source: 'https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-02-21',
} as const;

export interface ModelFile {
  source: string;
  target: string;
  sha256?: string;
  exactBytes?: number;
  maxBytes: number;
}
export const ENGLISH_MODEL_FILES: readonly ModelFile[] = [
  {
    source: 'encoder-epoch-99-avg-1.int8.onnx',
    target: 'encoder.onnx',
    sha256: '4b7edfb7783e94a66fead1470a066ccc2eceb14e2630d8aa1914e25f8ff35027',
    exactBytes: 126967571, maxBytes: 126967571,
  },
  {
    // The upstream example pairs the int8 encoder/joiner with the FP32 decoder.
    source: 'decoder-epoch-99-avg-1.onnx',
    target: 'decoder.onnx',
    sha256: 'af7488bbff623e8ccd4913241674557d08a72e97020c8cd4a430d7e535c472b4',
    exactBytes: 2093080, maxBytes: 2093080,
  },
  {
    source: 'joiner-epoch-99-avg-1.int8.onnx',
    target: 'joiner.onnx',
    sha256: '480747e5f00fdbd68e0c93b09edfcd6698853526ccfe0f859ad624108ce7dda2',
    exactBytes: 259380, maxBytes: 259380,
  },
  { source: 'tokens.txt', target: 'tokens.txt', maxBytes: 16000 },
];

const SAFE_FILENAME = /^[a-zA-Z0-9._-]+$/;
type FetchFunction = typeof fetch;
export function pinnedModelUrl(source: string): string {
  if (!SAFE_FILENAME.test(source) || source === '.' || source === '..') throw Error('Unsafe model filename');
  return ENGLISH_MODEL.source + '/resolve/' + ENGLISH_MODEL.revision + '/' + encodeURIComponent(source);
}
async function inspectFile(filename: string): Promise<{sha256:string;size:number}> {
  const sha = createHash('sha256');
  let size = 0;
  for await (const chunk of createReadStream(filename)) {
    const bytes = chunk as Buffer;
    size += bytes.length;
    sha.update(bytes);
  }
  return {sha256:sha.digest('hex'),size};
}
function valid(file: ModelFile, result: {sha256:string;size:number}): boolean {
  return result.size > 0 && result.size <= file.maxBytes
    && (file.exactBytes === undefined || result.size === file.exactBytes)
    && (file.sha256 === undefined || result.sha256 === file.sha256);
}
/** Stream large model weights to disk without buffering them into memory. */
export async function prepareEnglishModel(
  destination: string,
  files: readonly ModelFile[] = ENGLISH_MODEL_FILES,
  fetcher: FetchFunction = fetch,
): Promise<Record<string,string>> {
  await mkdir(destination,{recursive:true});
  const checked:Record<string,string>={};
  for (const file of files) {
    if (!SAFE_FILENAME.test(file.target) || !SAFE_FILENAME.test(file.source))
      throw Error('Unsafe model filename');
    const output = path.join(destination,file.target);
    const existing = await stat(output).catch((error:unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return null;
      throw error;
    });
    if (existing) {
      if (!existing.isFile() || existing.isSymbolicLink()) throw Error('Unsafe existing model file: '+file.target);
      const previous = await inspectFile(output);
      if (valid(file,previous)) {checked[file.target]=previous.sha256;continue;}
      throw Error('Existing model file checksum or size mismatch: '+file.target+'; remove it manually');
    }
    const response = await fetcher(pinnedModelUrl(file.source),{redirect:'follow'});
    if (!response.ok || !response.body) throw Error('Model fetch failed for '+file.source+': HTTP '+response.status);
    const temp=path.join(destination,'.'+file.target+'.'+randomUUID()+'.part');
    let size=0;
    const hash=createHash('sha256');
    try{
      const limiter=new Transform({
        transform(chunk:Buffer,_encoding,callback){
          size+=chunk.length;
          if(size>file.maxBytes){callback(Error('Model exceeds pinned maximum size: '+file.target));return;}
          hash.update(chunk);
          callback(null,chunk);
        },
      });
      const body=Readable.fromWeb(response.body as unknown as import('node:stream/web').ReadableStream);
      await pipeline(body,limiter,createWriteStream(temp,{flags:'wx',mode:0o600}));
      const sha256=hash.digest('hex');
      if(!valid(file,{sha256,size}))throw Error('Model checksum or size mismatch: '+file.target);
      await rename(temp,output);
      checked[file.target]=sha256;
    }finally{
      await rm(temp,{force:true});
    }
  }
  return checked;
}

const invoked=process.argv[1] ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) : false;
if(invoked){
  const args=process.argv.slice(2);
  if(args.length!==0 && !(args.length===2 && args[0]==='--out' && path.isAbsolute(args[1]??''))){
    throw Error('Usage: pnpm asr:model:prepare [--out /absolute/cache/directory]');
  }
  const output=args[1]??path.resolve('.cache/voxnelo/offline-asr/english-zipformer/model');
  const digests=await prepareEnglishModel(output);
  console.log(JSON.stringify({
    modelId:ENGLISH_MODEL.id,
    modelRevision:ENGLISH_MODEL.revision,
    modelLicense:ENGLISH_MODEL.license,
    path:output,
    sha256:digests,
    releaseReady:false,
    note:'Candidate model only: native binding, licensing review and actual speech QA are separate gates.',
  },null,2));
}
