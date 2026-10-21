import {describe,it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {inspectMoonshineMediumModel,MOONSHINE_MODEL_FILES} from '../apps/desktop/moonshineModel';

describe('Moonshine candidate inventory preflight',()=>{
  it('rejects absent and untrusted paths',()=>{
    expect(inspectMoonshineMediumModel(null).structurallyComplete).toBe(false);
    expect(inspectMoonshineMediumModel('relative/path').structurallyComplete).toBe(false);
  });
  it('requires all model pieces and rejects symlinked components and roots',()=>{
    const root=mkdtempSync(path.join(tmpdir(),'voxnelo-moonshine-'));
    try{
      const model=path.join(root,'model');mkdirSync(model);
      for(const name of [...MOONSHINE_MODEL_FILES,'frontend.ort'])
        writeFileSync(path.join(model,name),'test bytes');
      expect(inspectMoonshineMediumModel(model).structurallyComplete).toBe(true);
      rmSync(path.join(model,'encoder.ort'));
      expect(inspectMoonshineMediumModel(model).structurallyComplete).toBe(false);
      symlinkSync(path.join(model,'adapter.ort'),path.join(model,'encoder.ort'));
      expect(inspectMoonshineMediumModel(model).structurallyComplete).toBe(false);
      symlinkSync(model,path.join(root,'link'));
      expect(inspectMoonshineMediumModel(path.join(root,'link')).structurallyComplete).toBe(false);
    }finally{rmSync(root,{recursive:true,force:true});}
  });
});
