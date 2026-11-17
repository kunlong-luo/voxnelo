// @vitest-environment jsdom
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { database } from '@voxnelo/storage';
import { BACKUP_FORMAT, BACKUP_VERSION } from '../packages/learning/backup';
import { LearningBackupPanel } from '../apps/web/src/LearningBackupPanel';
import { SettingsView } from '../apps/web/src/SettingsView';
import { I18nProvider } from '../apps/web/src/i18n';

beforeEach(async () => {
  await database.transaction('rw',database.states,database.events,async()=>{
    await database.states.clear();
    await database.events.clear();
  });
});
afterEach(() => {cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});

function ui(onRestored=vi.fn(async()=>undefined)) {
  return render(<I18nProvider locale="zh-CN"><LearningBackupPanel onRestored={onRestored}/></I18nProvider>);
}
const data=(id='s002')=>JSON.stringify({
  format:BACKUP_FORMAT,version:BACKUP_VERSION,exportedAt:Date.now(),
  states:[{sentenceId:id,seenCount:1,practicedCount:0,favorite:true,review:false,lastSeenAt:100}],
  events:[{sentenceId:id,at:100,type:'view'}],
});
function chooseFile(text:string) {
  const file = new File([text],'backup.json',{type:'application/json'});
  Object.defineProperty(file,'text',{value:()=>Promise.resolve(text)});
  fireEvent.change(screen.getByLabelText('选择 Voxnelo JSON 备份文件'),{target:{files:[file]}});
}

describe('F107 explicit in-app restore workflow',()=>{
  it('requires preview and explicit second confirmation before any replacement',async()=>{
    const onRestored=vi.fn(async()=>undefined);
    ui(onRestored);
    expect(screen.queryByRole('button',{name:'确认恢复学习数据'})).toBeNull();
    chooseFile(data());
    const region=await screen.findByRole('region',{name:'恢复预览'});
    expect(region.textContent).toContain('1 条学习状态');
    expect(region.textContent).toContain('1 条历史事件');
    expect(region.textContent).toContain('完整替换');
    const restore=screen.getByRole('button',{name:'确认恢复学习数据'});
    expect(restore.hasAttribute('disabled')).toBe(true);
    const consent=screen.getByRole('button',{name:'我理解：替换本机现有学习数据'});
    fireEvent.click(consent);
    expect(consent.getAttribute('aria-pressed')).toBe('true');
    expect(restore.hasAttribute('disabled')).toBe(false);
    fireEvent.click(restore);
    await waitFor(()=>expect(onRestored).toHaveBeenCalledOnce());
    expect((await database.states.toArray())[0]?.sentenceId).toBe('s002');
    expect(screen.getByRole('status').textContent).toContain('恢复成功');
    expect(screen.queryByRole('region',{name:'恢复预览'})).toBeNull();
  });

  it('fails closed on invalid file and does not retain an earlier approval',async()=>{
    ui();
    chooseFile(data());
    await screen.findByRole('region',{name:'恢复预览'});
    fireEvent.click(screen.getByRole('button',{name:'我理解：替换本机现有学习数据'}));
    chooseFile('{broken');
    await waitFor(()=>expect(screen.getByRole('status').textContent).toContain('不是有效'));
    expect(screen.queryByRole('region',{name:'恢复预览'})).toBeNull();
    expect(await database.states.count()).toBe(0);
  });

  it('provides local file export without remote requests',async()=>{
    const createObjectURL=vi.fn(()=> 'blob:voxnelo-test');
    const revokeObjectURL=vi.fn();
    vi.stubGlobal('URL',Object.assign(URL,{createObjectURL,revokeObjectURL}));
    const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>undefined);
    ui();
    fireEvent.click(screen.getByRole('button',{name:'导出学习数据'}));
    await waitFor(()=>expect(click).toHaveBeenCalledOnce());
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(screen.getByRole('status').textContent).toContain('已请求浏览器下载');
    expect(screen.getByText(/不上传服务器/)).toBeTruthy();
  });

  it('places backup controls in the localized Settings screen',()=>{
    render(<I18nProvider locale="zh-CN"><SettingsView speed="normal" showIpa appearance="nordic"
      onChangeAppearance={()=>undefined} onToggleSpeed={()=>undefined}
      onToggleIpa={()=>undefined} onBackToPractice={()=>undefined}/></I18nProvider>);
    expect(screen.getByRole('heading',{name:'本地学习数据备份与恢复'})).toBeTruthy();
    expect(screen.getByRole('button',{name:'选择备份文件'})).toBeTruthy();
  });
});
