#!/usr/bin/env node
/** Read-only immutable upstream-asset revision discovery for v0.0.65.
 * Do not reinterpret absence of a public tag as proof no older publisher asset
 * ever existed. A file-level match is NOT a license/provenance attestation.
 *
 * No model downloads: fetches only ref JSON and text SHA-256 catalog files.
 * Independent of the candidate Electron installer and microphone input.
 */
import {compareMoonshineModelCatalog}
  from './compare-moonshine-model-catalog.mts';

const MODEL_REPOSITORY='moonshine-ai/moonshine-voice-assets';
const REFS_URL='https://huggingface.co/api/models/'+MODEL_REPOSITORY+'/refs';
const LEGACY_MODEL='model/medium-streaming-en/quantized';
const DATED_MODEL='model/medium-streaming-en/quantized_26_07_30';
const exactSha=/^[a-f0-9]{40}$/;
const tagPattern=/^v[0-9]+\.[0-9]+\.[0-9]+$/;

export interface OfficialAssetRef {
  name:string;
  sha:string;
  kind:'tag'|'main';
}

export function parseOfficialAssetRefs(raw:unknown):OfficialAssetRef[]|null{
  if(!raw||typeof raw!=='object')return null;
  const v=raw as Record<string,unknown>;
  if(!Array.isArray(v.tags)||!Array.isArray(v.branches))return null;
  if(v.tags.length>40||v.branches.length>10)return null;
  const refs:OfficialAssetRef[]=[];
  const names=new Set<string>();
  for(const kind of ['tags','branches'] as const){
    for(const item of v[kind]){
      if(!item||typeof item!=='object')return null;
      const entry=item as Record<string,unknown>;
      const name=entry.name,sha=entry.targetCommit;
      if(typeof name!=='string'||typeof sha!=='string'||
        !exactSha.test(sha))return null;
      if(kind==='branches'&&name!=='main')continue;
      if(kind==='tags'&&!tagPattern.test(name))continue;
      if(names.has(name))return null;
      names.add(name);
      refs.push({name,sha,kind:kind==='tags'?'tag':'main'});
    }
  }
  if(!names.has('main'))return null;
  return refs.sort((a,b)=>a.name.localeCompare(b.name));
}

export type SourceMatch = 'FULL_BYTES_MATCH'|'PARTIAL_OR_DIFFERENT'|
  'CATALOG_UNAVAILABLE'|'INVALID_CATALOG';

export interface ImmutableRefEvidence {
  name:string;
  sha:string;
  kind:'tag'|'main';
  legacyModel:SourceMatch;
  legacyMatchedCount:number;
  datedModel:SourceMatch;
  datedMatchedCount:number;
}
export interface ImmutableAssetEvidence {
  schemaVersion:1;
  sourceRepository:string;
  pinnedSdkVersion:'0.0.65';
  officialLegacyTagPresent:boolean;
  foundFullLegacyByteMatch:boolean;
  results:ImmutableRefEvidence[];
  immutableAssetMappingAccepted:false;
  legalOrRedistributionRightsApproved:false;
  humanMicrophoneAccepted:false;
}

/** An immutable ref is a prerequisite to, not proof of, publisher rights.
 * Ref parse failures and malformed catalog content must fail closed.
 */
export function compareImmutableAssetRefs(
  refs:readonly OfficialAssetRef[],
  catalogs:Readonly<Record<string,string|null>>,
):ImmutableAssetEvidence{
  const results:ImmutableRefEvidence[]=[];
  for(const ref of refs){
    if(!exactSha.test(ref.sha))throw Error('Untrusted asset revision');
    const text=catalogs[ref.sha]??null;
    const legacy=text===null?null:
      compareMoonshineModelCatalog(text,LEGACY_MODEL);
    const dated=text===null?null:
      compareMoonshineModelCatalog(text,DATED_MODEL);
    const status=(result:typeof legacy):SourceMatch=>
      result===null?'CATALOG_UNAVAILABLE':result.verdict;
    results.push({
      name:ref.name,sha:ref.sha,kind:ref.kind,
      legacyModel:status(legacy),
      legacyMatchedCount:legacy?.matched.length??0,
      datedModel:status(dated),
      datedMatchedCount:dated?.matched.length??0,
    });
  }
  return {
    schemaVersion:1,
    sourceRepository:MODEL_REPOSITORY,
    pinnedSdkVersion:'0.0.65',
    officialLegacyTagPresent:refs.some(ref=>ref.kind==='tag'&&ref.name==='v0.0.65'),
    foundFullLegacyByteMatch:results.some(ref=>ref.legacyModel==='FULL_BYTES_MATCH'),
    results,
    immutableAssetMappingAccepted:false,
    legalOrRedistributionRightsApproved:false,
    humanMicrophoneAccepted:false,
  };
}

export type TextFetcher=(url:string)=>Promise<string|null>;
export async function fetchOfficialText(url:string):Promise<string|null>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(url,{
      signal:controller.signal,redirect:'error',
      headers:{Accept:'text/plain, application/json'},
    });
    if(response.status===404)return null;
    if(!response.ok)throw Error('Upstream responded with HTTP '+response.status);
    const max=2_000_000;
    const contentLength=Number(response.headers.get('content-length')??0);
    if(!Number.isFinite(contentLength)||contentLength>max)
      throw Error('Upstream metadata too large');
    const text=await response.text();
    if(text.length>max)throw Error('Upstream metadata too large');
    return text;
  }finally{clearTimeout(timeout);}
}

export async function auditOfficialMoonshineAssetRefs(
  getText:TextFetcher=fetchOfficialText,
):Promise<ImmutableAssetEvidence>{
  const text=await getText(REFS_URL);
  if(text===null)throw Error('Official model asset refs API unavailable');
  const refs=parseOfficialAssetRefs(JSON.parse(text) as unknown);
  if(!refs)throw Error('Malformed official model asset refs');
  const catalogs:Record<string,string|null>={};
  for(const sha of [...new Set(refs.map(ref=>ref.sha))]){
    catalogs[sha]=await getText(
      'https://huggingface.co/'+MODEL_REPOSITORY+'/raw/'+sha+'/TRANSFER_REPORT.tsv',
    );
  }
  return compareImmutableAssetRefs(refs,catalogs);
}

if(process.argv[1]?.replace(/\\/g,'/').endsWith('/audit-moonshine-upstream-refs.mts')){
  auditOfficialMoonshineAssetRefs().then(report=>{
    console.log(JSON.stringify(report,null,2));
    if(!report.officialLegacyTagPresent||!report.foundFullLegacyByteMatch)
      process.exitCode=2;
  }).catch(()=>{
    console.error('Could not complete immutable asset reference audit; release remains HOLD.');
    process.exitCode=2;
  });
}
