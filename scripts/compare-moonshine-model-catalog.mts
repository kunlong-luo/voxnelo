#!/usr/bin/env node
/** Offline, read-only comparison of a supplied Moonshine publisher SHA-256 TSV.
 *
 * This tool NEVER supplies the upstream source's authenticity, release revision,
 * copyright permission, human microphone acceptance or release approval.
 * The caller must independently verify the URL + immutable upstream revision.
 */
import {readFileSync} from 'node:fs';
import {PINNED_MOONSHINE_MEDIUM_FILES}
  from '../apps/desktop/moonshineIntegrity.ts';

type Verdict='FULL_BYTES_MATCH'|'PARTIAL_OR_DIFFERENT'|'INVALID_CATALOG';
export interface ModelCatalogComparison {
  verdict:Verdict;
  modelPath:string;
  matched:string[];
  mismatched:string[];
  missing:string[];
  unexpected:string[];
  upstreamRevisionVerified:false;
  redistributionRightsApproved:false;
  humanMicrophoneAcceptance:false;
}
const prefixPattern=/^model\/medium-streaming-en\/quantized(?:_[0-9]{2}_[0-9]{2}_[0-9]{2})?$/;
const shaPattern=/^[a-f0-9]{64}$/;

export function compareMoonshineModelCatalog(
  text:string,modelPath:string,
  expected:Readonly<Record<string,string>>=PINNED_MOONSHINE_MEDIUM_FILES,
):ModelCatalogComparison{
  const report:ModelCatalogComparison={
    verdict:'INVALID_CATALOG',modelPath,matched:[],mismatched:[],
    missing:[],unexpected:[],upstreamRevisionVerified:false,
    redistributionRightsApproved:false,humanMicrophoneAcceptance:false,
  };
  if(!prefixPattern.test(modelPath)||
    Object.keys(expected).length!==8||
    !Object.values(expected).every(d=>shaPattern.test(d)))return report;
  const lines=text.trimEnd().split(/\r?\n/);
  if(lines[0]!=='path\tsize_bytes\tsha256')return report;
  const seen=new Map<string,string>();
  for(const line of lines.slice(1)){
    const fields=line.split('\t');
    if(fields.length!==3||!fields[0]||
      !/^[0-9]+$/.test(fields[1]??'')||
      !shaPattern.test(fields[2]??''))return report;
    const filename=fields[0]!;
    if(filename.includes('\\')||filename.startsWith('/')||filename.split('/').includes('..'))
      return report;
    if(!filename.startsWith(modelPath+'/'))continue;
    const basename=filename.slice(modelPath.length+1);
    if(!/^[a-z0-9_.-]+$/.test(basename)||seen.has(basename))
      return report;
    seen.set(basename,fields[2]!);
  }
  for(const [filename,digest] of Object.entries(expected)){
    const published=seen.get(filename);
    if(published===undefined)report.missing.push(filename);
    else if(published===digest)report.matched.push(filename);
    else report.mismatched.push(filename);
  }
  report.unexpected=[...seen.keys()].filter(name=>!Object.hasOwn(expected,name));
  report.verdict=report.matched.length===8&&report.missing.length===0&&
    report.mismatched.length===0&&report.unexpected.length===0
    ?'FULL_BYTES_MATCH':'PARTIAL_OR_DIFFERENT';
  // Even an eight-of-eight byte match does not authenticate the supplied TSV
  // or its immutable revision; those are separate manual release gates.
  return report;
}

if(process.argv[1]?.replace(/\\/g,'/').endsWith('/compare-moonshine-model-catalog.mts')){
  const args=process.argv.slice(2);
  if(args.length!==2){
    console.error('Usage: node --experimental-strip-types scripts/compare-moonshine-model-catalog.mts <trusted-local-transfer-report.tsv> <exact-model-path>');
    process.exitCode=2;
  }else{
    try{
      const [input,prefix]=args as [string,string];
      const report=compareMoonshineModelCatalog(readFileSync(input,'utf8'),prefix);
      console.log(JSON.stringify(report,null,2));
      if(report.verdict!=='FULL_BYTES_MATCH')process.exitCode=2;
    }catch{
      console.error('Cannot read model catalog; upstream provenance remains unverified.');
      process.exitCode=2;
    }
  }
}
