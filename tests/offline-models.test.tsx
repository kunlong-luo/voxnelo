// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../apps/web/src/App';
import { OfflineModelsView } from '../apps/web/src/OfflineModelsView';
import { useLiveDictation } from '../apps/web/src/useLiveDictation';

class FakeLocalSpeech {
  static available=vi.fn(async()=> 'downloadable');
  static install=vi.fn(async()=> true);
  processLocally=false;
  lang='';continuous=false;interimResults=false;
  onstart=null;onend=null;onerror=null;onresult=null;
  start=vi.fn();stop=vi.fn();abort=vi.fn();
}
function ModelHarness({onBack=()=>undefined}:{onBack?:()=>void}){
  const dictation=useLiveDictation('test-english');
  return <OfflineModelsView dictation={dictation} onBack={onBack}/>;
}
afterEach(()=>{
  cleanup();
  vi.unstubAllGlobals();
  FakeLocalSpeech.available.mockReset().mockResolvedValue('downloadable');
  FakeLocalSpeech.install.mockReset().mockResolvedValue(true);
});

describe('Dedicated offline ASR model management',()=>{
  it('starts personal Moonshine provisioning only after a direct Linux model-page click',async()=>{
    const installMoonshine=vi.fn(async()=>({ok:false,reason:'failed'}));
    const capabilities=vi.fn(async()=>({available:false,reason:'not-configured'}));
    const engines=vi.fn(async()=>({zipformer:true,moonshineMedium:false}));
    vi.stubGlobal('voxneloDesktop',{platform:'linux',asr:{capabilities,engines,installMoonshine}});
    render(<ModelHarness/>);
    const button=await screen.findByRole('button',{name:'安装或修复 Moonshine 离线模型'});
    expect(installMoonshine).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(()=>expect(installMoonshine).toHaveBeenCalledOnce());
    expect(screen.getByRole('alert').textContent).toContain('安装或校验失败');
    expect(screen.getByTestId('model-status').textContent).toContain('不可用');
    expect(engines).toHaveBeenCalled();
  });
  it('shows actual native install phases, filters none into percentages and unsubscribes on completion',async()=>{
    type Stage='environment'|'dependencies'|'model-download'|'model-verification'|'activation'|'complete';
    let sendStage:(stage:Stage)=>void=()=>undefined;
    let completeInstall:(result:{ok:true})=>void=()=>undefined;
    const unsubscribe=vi.fn();
    const installMoonshine=vi.fn(()=>new Promise<{ok:true}>(resolve=>{completeInstall=resolve;}));
    const onMoonshineInstallProgress=vi.fn((listener:(stage:Stage)=>void)=>{
      sendStage=listener;
      return unsubscribe;
    });
    vi.stubGlobal('voxneloDesktop',{platform:'linux',asr:{
      installMoonshine,onMoonshineInstallProgress,
      capabilities:vi.fn(async()=>({available:false,reason:'missing-model'})),
      engines:vi.fn(async()=>({zipformer:false,moonshineMedium:false})),
    }});
    render(<ModelHarness/>);
    const button=await screen.findByRole('button',{name:'安装或修复 Moonshine 离线模型'});
    expect(installMoonshine).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(()=>expect(onMoonshineInstallProgress).toHaveBeenCalledOnce());
    expect(screen.getByTestId('moonshine-install-stage').textContent).toContain('Python 环境');
    act(()=>sendStage('model-download'));
    expect(screen.getByTestId('moonshine-install-stage').textContent).toContain('下载英语离线模型');
    expect(screen.getByTestId('moonshine-install-stage').textContent).not.toMatch(/\\d+%/);
    act(()=>sendStage('model-verification'));
    expect(screen.getByTestId('moonshine-install-stage').textContent).toContain('SHA-256');
    await act(async()=>{completeInstall({ok:true});});
    await waitFor(()=>expect(unsubscribe).toHaveBeenCalledOnce());
    expect(screen.queryByTestId('moonshine-install-stage')).toBeNull();
    expect(installMoonshine).toHaveBeenCalledOnce();
  });
  it('downloads a browser language pack only after clicking within the manager',async()=>{
    vi.stubGlobal('voxneloDesktop',undefined);
    vi.stubGlobal('SpeechRecognition',FakeLocalSpeech);
    FakeLocalSpeech.available.mockImplementation(async()=>FakeLocalSpeech.install.mock.calls.length>0?'available':'downloadable');
    render(<ModelHarness/>);
    const download=await screen.findByRole('button',{name:'下载并安装英语模型'});
    expect(FakeLocalSpeech.install).not.toHaveBeenCalled();
    await act(async()=>{fireEvent.click(download);});
    expect(FakeLocalSpeech.install).toHaveBeenCalledOnce();
    expect(FakeLocalSpeech.install).toHaveBeenCalledWith({langs:['en-US'],processLocally:true});
    await waitFor(()=>expect(screen.getByTestId('model-status').textContent).toContain('已就绪'));
    expect(screen.queryByRole('button',{name:'下载并安装英语模型'})).toBeNull();
    expect(screen.getByText(/返回练习即可尝试实时听写/)).toBeTruthy();
  });

  it('refreshes model status without triggering installation',async()=>{
    vi.stubGlobal('voxneloDesktop',undefined);
    vi.stubGlobal('SpeechRecognition',FakeLocalSpeech);
    render(<ModelHarness/>);
    await screen.findByRole('button',{name:'下载并安装英语模型'});
    const before=FakeLocalSpeech.available.mock.calls.length;
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'重新检测'}));});
    expect(FakeLocalSpeech.available.mock.calls.length).toBeGreaterThan(before);
    expect(FakeLocalSpeech.install).not.toHaveBeenCalled();
  });

  it('shows an in-progress browser pack download without offering another install',async()=>{
    FakeLocalSpeech.available.mockResolvedValue('downloading');
    vi.stubGlobal('voxneloDesktop',undefined);
    vi.stubGlobal('SpeechRecognition',FakeLocalSpeech);
    render(<ModelHarness/>);
    await waitFor(()=>expect(screen.getByTestId('model-status').textContent).toContain('下载进行中'));
    expect(screen.getByText(/浏览器正在下载英语离线语言包/)).toBeTruthy();
    expect(screen.queryByRole('button',{name:'下载并安装英语模型'})).toBeNull();
    expect(FakeLocalSpeech.install).not.toHaveBeenCalled();
  });

  it('explains invalid Linux personal files and never loads a browser recognizer',async()=>{
    const capabilities=vi.fn(async()=>({available:false,reason:'invalid-personal-pack'}));
    vi.stubGlobal('voxneloDesktop',{platform:'linux',asr:{capabilities}});
    vi.stubGlobal('SpeechRecognition',FakeLocalSpeech);
    render(<ModelHarness/>);
    await waitFor(()=>expect(screen.getByText(/版本信息或完整性校验未通过/)).toBeTruthy());
    expect(screen.queryByRole('button',{name:'下载并安装英语模型'})).toBeNull();
    expect(FakeLocalSpeech.available).not.toHaveBeenCalled();
  });

  it('shows opt-in external-speaker capture only on desktop and never changes default silently',async()=>{
    const capabilities=vi.fn(async()=>({available:true,reason:'ready'}));
    vi.stubGlobal('voxneloDesktop',{platform:'linux',asr:{capabilities}});
    render(<ModelHarness/>);
    const normal=await screen.findByRole('button',{name:'日常讲话（降噪）'});
    const external=screen.getByRole('button',{name:'外放英语测试（实验）'});
    expect(normal.getAttribute('aria-pressed')).toBe('true');
    expect(external.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(external);
    expect(normal.getAttribute('aria-pressed')).toBe('false');
    expect(external.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText(/不能保证更准确/)).toBeTruthy();
    fireEvent.click(normal);
    expect(normal.getAttribute('aria-pressed')).toBe('true');
  });

  it('shows verified native desktop status but never presents an unsupported installer',async()=>{
    const capabilities=vi.fn(async()=>({available:false,reason:'missing-model'}));
    vi.stubGlobal('voxneloDesktop',{platform:'linux',asr:{capabilities}});
    vi.stubGlobal('SpeechRecognition',FakeLocalSpeech);
    render(<ModelHarness/>);
    await waitFor(()=>expect(screen.getByText(/Moonshine 尚未安装或未通过校验/)).toBeTruthy());
    expect(screen.queryByRole('button',{name:'安装或修复 Moonshine 离线模型'})).toBeNull();
    expect(screen.getByText(/原生依赖授权与更多设备兼容性仍待审查/)).toBeTruthy();
    expect(FakeLocalSpeech.available).not.toHaveBeenCalled();
    expect(FakeLocalSpeech.install).not.toHaveBeenCalled();
    await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'重新检测'}));});
    expect(capabilities).toHaveBeenCalled();
  });

  it('navigates from Settings to model management and back to practice',async()=>{
    vi.stubGlobal('voxneloDesktop',undefined);
    vi.stubGlobal('SpeechRecognition',undefined);
    render(<App/>);
    fireEvent.click(screen.getByRole('button',{name:'设置'}));
    fireEvent.click(screen.getByRole('button',{name:'管理离线模型'}));
    expect(screen.getByRole('heading',{name:'离线模型管理'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'返回练习'}));
    expect(screen.getByRole('button',{name:'开始实时听写'})).toBeTruthy();
    expect(screen.queryByRole('button',{name:'安装本地英语识别包'})).toBeNull();
  });
});
