// @vitest-environment jsdom
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {I18nProvider} from '../apps/web/src/i18n';
import {LiveDictationPanel} from '../apps/web/src/LiveDictationPanel';
import type {useLiveDictation} from '../apps/web/src/useLiveDictation';

const local=()=>({
  status:'idle',
  supported:true,
  browserModeAvailable:false,
  localPack:'available',
  mode:'local',
  desktopReason:'ready',
  finalText:'',
  interimText:'',
  inputLevel:null,
  noiseReduction:'unknown',
  error:'',
  stop:vi.fn(),
  chooseMode:vi.fn(),
}) as unknown as ReturnType<typeof useLiveDictation>;
const panel=(dictation:ReturnType<typeof useLiveDictation>, blocked=false, manage=vi.fn(), start=vi.fn())=>{
  const ui=render(<I18nProvider locale="zh-CN">
    <LiveDictationPanel dictation={dictation} blocked={blocked} onStart={start} onManageModels={manage}/>
  </I18nProvider>);
  return { ...ui, manage, start };
};

afterEach(()=>{cleanup();vi.unstubAllGlobals();});

describe('V3 dictation-first UI without changing ASR or recorder behavior',()=>{
  it('makes dictation an explicit labeled primary action and shows the empty transcript hint',()=>{
    vi.stubGlobal('voxneloDesktop',undefined);
    const {start}=panel(local());
    const main=screen.getByTestId('dictation-workspace');
    expect(main.getAttribute('data-state')).toBe('ready');
    const action=screen.getByRole('button',{name:'开始实时听写'});
    expect(action.textContent).toContain('开始实时听写');
    expect(action.className).toContain('min-h-12');
    expect(action.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByTestId('dictation-empty-hint').textContent).toContain('识别的英语');
    fireEvent.click(action);
    expect(start).toHaveBeenCalledOnce();
  });
  it('keeps stop enabled even when secondary recording blocks starting a new session',()=>{
    vi.stubGlobal('voxneloDesktop',undefined);
    const dictation=Object.assign(local(),{
      status:'listening',
      inputLevel:0.8,
      interimText:'THIS IS THE CURRENT PHRASE',
      finalText:'PREVIOUS PHRASES HAVE BEEN COMPLETED',
    });
    const {start}=panel(dictation,true);
    const stop=screen.getByRole('button',{name:'停止听写'});
    expect(stop.hasAttribute('disabled')).toBe(false);
    expect(stop.textContent).toContain('停止听写');
    expect(stop.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('dictation-workspace').getAttribute('data-state')).toBe('listening');
    expect(screen.getByRole('img',{name:'实时麦克风输入音量'})).toBeTruthy();
    const preview=screen.getByTestId('live-transcript');
    expect(preview.textContent).toContain('This is the current phrase');
    expect(preview.textContent).not.toContain('Previous phrases');
    fireEvent.click(screen.getByRole('button',{name:'查看历史'}));
    expect(screen.getByTestId('dictation-history').textContent).toContain('Previous phrases');
    fireEvent.click(stop);
    expect(dictation.stop).toHaveBeenCalledOnce();
    expect(start).not.toHaveBeenCalled();
  });
  it('keeps offline model recovery and guidance available at compact heights',()=>{
    vi.stubGlobal('voxneloDesktop',{platform:'linux'});
    const dictation=Object.assign(local(),{
      status:'idle',
      supported:false,
      desktopReason:'missing-model',
    });
    const {manage}=panel(dictation);
    const status=screen.getByTestId('dictation-workspace');
    expect(status.getAttribute('data-state')).toBe('unavailable');
    expect(status.textContent).toContain('离线英语模型尚未就绪');
    const action=screen.getByRole('button',{name:'打开模型管理'});
    expect(action.className).not.toContain('hidden');
    fireEvent.click(action);
    expect(manage).toHaveBeenCalledOnce();
    const help=screen.getByRole('link',{name:'查看听写帮助与反馈'});
    expect(help.className).not.toContain('hidden');
  });
  it('keeps browser online audio warning and explicit opt-in choice',()=>{
    vi.stubGlobal('voxneloDesktop',undefined);
    const chooseMode=vi.fn();
    const dictation=Object.assign(local(),{
      browserModeAvailable:true,
      mode:'browser',
      chooseMode,
    });
    panel(dictation);
    expect(screen.getByTestId('dictation-workspace').textContent).toContain('本次会话的语音可能由浏览器服务处理');
    fireEvent.click(screen.getAllByRole('button',{name:'返回本地识别'})[0]!);
    expect(chooseMode).toHaveBeenCalledWith('local');
  });
});
