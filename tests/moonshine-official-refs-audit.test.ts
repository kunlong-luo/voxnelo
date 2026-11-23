import {describe,expect,it} from 'vitest';
import {PINNED_MOONSHINE_MEDIUM_FILES}
  from '../apps/desktop/moonshineIntegrity.ts';
import {
  auditOfficialMoonshineAssetRefs,
  compareImmutableAssetRefs,
  parseOfficialAssetRefs,
} from '../scripts/audit-moonshine-upstream-refs.mts';

const shaA='7e08470c1127726f026f0205867c3055d602fe8c';
const shaB='964a20c89aea67d0aca90dd0f85d533a9a05efe2';
const shaMain='e318117203f245fda2ca0142db6b8c057d86671c';
const refs={
  tags:[
    {name:'v0.1.5',targetCommit:shaA},
    {name:'v0.1.6',targetCommit:shaB},
  ],
  branches:[{name:'main',targetCommit:shaMain}],
};
const sourcePrefix='model/medium-streaming-en/';
const tsv=(name:string,digests:Readonly<Record<string,string>>)=>
  'path\tsize_bytes\tsha256\n'+Object.entries(digests)
    .map(([file,hash])=>sourcePrefix+name+'/'+file+'\t123\t'+hash)
    .join('\n')+'\n';
const officialDated:Readonly<Record<string,string>>={
  ...PINNED_MOONSHINE_MEDIUM_FILES,
  'adapter.ort':'3f2a287def57cc094367a0eec3c4f5fc36a32ec420e86764b696920991b20281',
  'cross_kv.ort':'642f6e21cd305be79342207c6f9e6b681d469d55bc48c72b27b84846fb71fd1e',
  'decoder_kv.ort':'193bb366492b74fc4ad338c6778e8d8eb916aaa11b5aa264f9057f4db7759486',
  'decoder_kv_with_attention.ort':'b5de4b5639b4155fb7956161e43196eb27a26db293f11c1d245effaf6b738118',
  'encoder.ort':'12915e76ebac7dd287c5ea63965d06103a53ba1ce242a4a34f318f3958c60c37',
  'frontend.ort':'100a4cbc1e96f4f5586330ff60d5f6240813dbb399a0b9c6a187a9491ab716cc',
};

describe('official immutable Hugging Face revision audit remains release-closed',()=>{
  it('reads only pinned-sha exact-ref names, and records missing v0.0.65 tag',()=>{
    const parsed=parseOfficialAssetRefs(refs);
    expect(parsed).toHaveLength(3);
    expect(parsed?.some(r=>r.name==='v0.0.65')).toBe(false);
    const evidence=compareImmutableAssetRefs(parsed??[],{
      [shaA]:tsv('quantized_26_08_21',officialDated),
      [shaB]:tsv('quantized_26_08_21',officialDated),
      [shaMain]:tsv('quantized_26_07_30',officialDated),
    });
    expect(evidence.officialLegacyTagPresent).toBe(false);
    expect(evidence.foundFullLegacyByteMatch).toBe(false);
    expect(evidence.results.find(r=>r.name==='main')?.legacyMatchedCount).toBe(0);
    expect(evidence.results.find(r=>r.name==='main')?.datedMatchedCount).toBe(2);
    expect(evidence.immutableAssetMappingAccepted).toBe(false);
    expect(evidence.legalOrRedistributionRightsApproved).toBe(false);
    expect(evidence.humanMicrophoneAccepted).toBe(false);
  });
  it('even an all-eight immutable bytes match never auto-approves rights',()=>{
    const legacy=tsv('quantized',PINNED_MOONSHINE_MEDIUM_FILES);
    const evidence=compareImmutableAssetRefs([
      {name:'v0.0.65',kind:'tag',sha:shaA},
      {name:'main',kind:'main',sha:shaMain},
    ],{[shaA]:legacy,[shaMain]:null});
    expect(evidence.officialLegacyTagPresent).toBe(true);
    expect(evidence.foundFullLegacyByteMatch).toBe(true);
    expect(evidence.immutableAssetMappingAccepted).toBe(false);
    expect(evidence.legalOrRedistributionRightsApproved).toBe(false);
    expect(evidence.results[1]?.legacyModel).toBe('CATALOG_UNAVAILABLE');
  });
  it('rejects falsified ref revisions, duplicates, and missing main',()=>{
    expect(parseOfficialAssetRefs({tags:[],branches:[]})).toBeNull();
    expect(parseOfficialAssetRefs({
      tags:[{name:'v0.0.65',targetCommit:'not-a-sha'}],branches:refs.branches,
    })).toBeNull();
    expect(parseOfficialAssetRefs({
      tags:[refs.tags[0],refs.tags[0]],branches:refs.branches,
    })).toBeNull();
    expect(parseOfficialAssetRefs({
      tags:refs.tags,branches:[{name:'master',targetCommit:shaMain}],
    })).toBeNull();
  });
  it('fetches only official asset API and immutable commit-specific text paths',async()=>{
    const requested:string[]=[];
    const result=await auditOfficialMoonshineAssetRefs(async url=>{
      requested.push(url);
      if(url.endsWith('/refs'))return JSON.stringify(refs);
      if(url.includes('/raw/'+shaMain+'/'))return tsv('quantized_26_07_30',officialDated);
      return null;
    });
    expect(requested[0]).toBe(
      'https://huggingface.co/api/models/moonshine-ai/moonshine-voice-assets/refs',
    );
    expect(requested.slice(1).sort()).toEqual([shaA,shaB,shaMain].map(sha=>
      'https://huggingface.co/moonshine-ai/moonshine-voice-assets/raw/'+
      sha+'/TRANSFER_REPORT.tsv').sort());
    expect(result.officialLegacyTagPresent).toBe(false);
    expect(result.foundFullLegacyByteMatch).toBe(false);
  });
  it('does not translate an unavailable API into a false absent-tag conclusion',async()=>{
    await expect(auditOfficialMoonshineAssetRefs(async()=>null))
      .rejects.toThrow('unavailable');
    await expect(auditOfficialMoonshineAssetRefs(async()=>'{"tags":[]}'))
      .rejects.toThrow('Malformed');
  });
});
