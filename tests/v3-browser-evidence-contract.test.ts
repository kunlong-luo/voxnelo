import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const browser=readFileSync('scripts/check-responsive-browser.mts','utf8');
const deep=readFileSync('.github/workflows/quality-deep.yml','utf8');

describe('V3 primary dictation browser/desktop evidence contract',()=>{
  it('checks the measured 44px+ labeled action, not the former circular icon/idle halo',()=>{
    expect(browser).toContain('heroHeight>=44');
    expect(browser).toContain('heroAccessible&&m.heroInBounds');
    expect(browser).toContain('heroWidth<=m.dictationWidth');
    expect(browser).toContain("page:'idle-dictation-primary-semantics'");
    expect(browser).toContain("haloCount===0");
    expect(browser).not.toContain('heroRadius>=');
    expect(browser).not.toContain('dictationOffset<=');
    expect(browser).not.toContain('visible idle microphone halo is missing');
  });
  it('checks independent auxiliary disclosures and prevents artificial lesson stretch',()=>{
    expect(browser).toContain("page:'v31-auxiliary-disclosure'");
    expect(browser).toContain('disclosure.count,3');
    expect(browser).toContain('!m.columnIsStretching');
    expect(browser).toContain('expanded related phrases are not visible');
  });
  it('captures real responsive screenshots only when relevant UI sources change, or on manual dispatch',()=>{
    expect(deep).toContain('workflow_dispatch:');
    expect(deep).toContain('pull_request:');
    expect(deep).toContain('group: deep-ui-');
    expect(deep).toContain("cancel-in-progress: ${{ github.event_name == 'pull_request' }}");
    for(const path of [
      'apps/web/src/LiveDictationPanel.tsx',
      'apps/web/src/PracticeControlPanel.tsx',
      'apps/web/src/PracticeSidebarWidgets.tsx',
      'scripts/check-responsive-browser.mts',
      '.github/workflows/quality-deep.yml',
    ])expect(deep).toContain("      - '"+path+"'");
    expect(deep).toContain('scripts/check-responsive-browser.mts');
    expect(deep).toContain('scripts/check-electron-window.mts');
    expect(deep).toContain('browser-layout-evidence');
    expect(deep).toContain('linux-electron-evidence');
    expect(deep).not.toContain('contents: write');
  });
});
