import {describe,expect,it} from 'vitest';
import {PINNED_MOONSHINE_MEDIUM_FILES}
  from '../apps/desktop/moonshineIntegrity.ts';
import {compareMoonshineModelCatalog}
  from '../scripts/compare-moonshine-model-catalog.mts';

/** Published upstream main TRANSFER_REPORT.tsv rows on 2026-11-23.
 * This is an 8-line excerpt from the dated quantized_26_07_30 directory,
 * NOT an immutable upstream revision, v0.0.65 attestation, or legal approval.
 * Source: https://huggingface.co/moonshine-ai/moonshine-voice-assets/raw/main/TRANSFER_REPORT.tsv
 */
const officialDatedEntries:Readonly<Record<string,string>>={
  'adapter.ort':'3f2a287def57cc094367a0eec3c4f5fc36a32ec420e86764b696920991b20281',
  'cross_kv.ort':'642f6e21cd305be79342207c6f9e6b681d469d55bc48c72b27b84846fb71fd1e',
  'decoder_kv.ort':'193bb366492b74fc4ad338c6778e8d8eb916aaa11b5aa264f9057f4db7759486',
  'decoder_kv_with_attention.ort':'b5de4b5639b4155fb7956161e43196eb27a26db293f11c1d245effaf6b738118',
  'encoder.ort':'12915e76ebac7dd287c5ea63965d06103a53ba1ce242a4a34f318f3958c60c37',
  'frontend.ort':'100a4cbc1e96f4f5586330ff60d5f6240813dbb399a0b9c6a187a9491ab716cc',
  'streaming_config.json':'28e83b7a28e91472692a035e0dae3116422ae43aeb2bef5ed822c44ce89b88af',
  'tokenizer.bin':'6884b35fd6377d4c4d32336a0bc152f36b64d1e45b6503683cdc238250a8472d',
};
const prefix='model/medium-streaming-en/quantized_26_07_30';
const tsv=(items:Readonly<Record<string,string>>,target=prefix)=>
  'path\tsize_bytes\tsha256\n'+Object.entries(items).map(
    ([name,digest])=>target+'/'+name+'\t123\t'+digest,
  ).join('\n')+'\n';

describe('Moonshine upstream model-byte catalog review is strictly fail-closed',()=>{
  it('records the observed 2/8 partial match to dated upstream model assets',()=>{
    const x=compareMoonshineModelCatalog(tsv(officialDatedEntries),prefix);
    expect(x.verdict).toBe('PARTIAL_OR_DIFFERENT');
    expect(x.matched.sort()).toEqual(['streaming_config.json','tokenizer.bin']);
    expect(x.mismatched).toHaveLength(6);
    expect(x.missing).toEqual([]);
    expect(x.unexpected).toEqual([]);
    expect(x.upstreamRevisionVerified).toBe(false);
    expect(x.redistributionRightsApproved).toBe(false);
    expect(x.humanMicrophoneAcceptance).toBe(false);
  });
  it('full byte match of a synthetic test fixture is not source provenance approval',()=>{
    const x=compareMoonshineModelCatalog(
      tsv(PINNED_MOONSHINE_MEDIUM_FILES),
      prefix,
    );
    expect(x.verdict).toBe('FULL_BYTES_MATCH');
    expect(x.matched).toHaveLength(8);
    expect(x.upstreamRevisionVerified).toBe(false);
    expect(x.redistributionRightsApproved).toBe(false);
  });
  it('requires exact 8 model entries under one supported full path, not basename matching',()=>{
    const x=compareMoonshineModelCatalog(
      tsv(PINNED_MOONSHINE_MEDIUM_FILES,'model/small-streaming-en/quantized_26_07_30'),
      prefix,
    );
    expect(x.missing).toHaveLength(8);
    expect(x.verdict).toBe('PARTIAL_OR_DIFFERENT');
    const mixed={...PINNED_MOONSHINE_MEDIUM_FILES};
    delete (mixed as Record<string,string>)['adapter.ort'];
    const incomplete=compareMoonshineModelCatalog(tsv(mixed),prefix);
    expect(incomplete.missing).toEqual(['adapter.ort']);
    expect(incomplete.verdict).not.toBe('FULL_BYTES_MATCH');
  });
  it('rejects duplicate, unexpected, malformed or unversioned unsafe catalog claims',()=>{
    const source=tsv(PINNED_MOONSHINE_MEDIUM_FILES);
    const firstLine=source.split('\n')[1]!;
    expect(compareMoonshineModelCatalog(source+firstLine+'\n',prefix).verdict)
      .toBe('INVALID_CATALOG');
    expect(compareMoonshineModelCatalog(source,'model/medium-streaming-en/quantized_../').verdict)
      .toBe('INVALID_CATALOG');
    expect(compareMoonshineModelCatalog(source+'model/medium-streaming-en/quantized_26_07_30/new.ort\t3\t'+
      'f'.repeat(64)+'\n',prefix).unexpected).toEqual(['new.ort']);
    expect(compareMoonshineModelCatalog(source.replace('path\tsize_bytes\tsha256','path\tmd5'),prefix).verdict)
      .toBe('INVALID_CATALOG');
    expect(compareMoonshineModelCatalog(source.replace('123\t','abc\t'),prefix).verdict)
      .toBe('INVALID_CATALOG');
  });
});
