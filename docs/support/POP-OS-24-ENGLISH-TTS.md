# Pop!_OS 24 / Linux 英语朗读故障排查

适用：Voxnelo 桌面版无法播放短句，显示「未检测到英语语音包」。问题不等同于麦克风权限故障；录音和朗读属于两条独立音频链路。

## 原因

早期版本仅通过 Chromium 的 `speechSynthesis.getVoices()` 寻找 `en-US` / `en-*`，Linux Electron 有可能返回空列表；这无法证明系统没有安装语音引擎。Linux 的 Speech Dispatcher / eSpeak 与 Chromium 的 voice 枚举不总是同步。

## 新版本的应用内修复

- 先使用已列出的浏览器英语 TTS。
- 如当前没有英语语音，Linux **Electron 桌面版**通过受信任的预加载桥调用本机的 `espeak-ng`，缺失时再检查 `espeak`。
- 引擎只处理当前打包课程的**真实英语短句**；主进程按窗口和来源授权，调用 `spawn` 时设置 `shell:false`；不暴露任意 shell 命令、网络调用或文件读写接口。
- 合成得到的 WAV 通过受限 IPC 送回渲染层，使用应用内 HTML Audio 播放，避免 Linux 命令行引擎音频输出与 PipeWire/PulseAudio 设备不兼容。
- 每次切句、开始录音时停止之前的语音生成/播放，不允许异步返回的旧短句覆盖新操作；生成设有大小及时间限制。
- eSpeak 是**本地离线语音引擎**，音质偏机械，暂不能等同于专业录音或母语播音。

## 你现在就可以在 Pop!_OS 24 上检查

先在终端运行：

```bash
command -v espeak-ng || command -v espeak
```

如没有输出，或当前 Voxnelo 检测不到引擎，可安装：

```bash
sudo apt update
sudo apt install espeak-ng speech-dispatcher speech-dispatcher-espeak-ng
```

验证本地引擎可生成英文声音：

```bash
espeak-ng -v en-us "Hello, how are you?"
```

如果以上命令没有声音，但 `espeak-ng` 已安装，尝试输出 WAV：

```bash
espeak-ng --stdout -v en-us "Hello, how are you?" > /tmp/voxnelo-english-test.wav
```

用系统音频播放器打开 `/tmp/voxnelo-english-test.wav`。如果 WAV 可以播放，更新后的 Voxnelo 可以直接使用相同合成方式，不依赖 Chromium 能否列出语音。若 WAV 也无法在系统播放器发声，请检查 Pop!_OS 声音设置中的输出设备及应用音量。

**注意**：现在已经安装在电脑里的旧 Voxnelo 版本不会自动得到本次代码修复，需重新构建/安装合入修复后的桌面应用。单独运行 `sudo apt install` 可能改善旧浏览器语音环境，但不能保证旧版 Electron 枚举到英语语音。

## 验收步骤

- [ ] 仅安装 `espeak-ng`，Chrome/Electron `getVoices()=[]` 时能播放打包的英文短句。
- [ ] 慢速模式语速确实降低，点击下一句/开始录音停止旧语音。
- [ ] eSpeak 不存在时显示具体安装建议，不展示泛泛的“系统不支持”。
- [ ] 输出音量/设备失效时提示是播放失败而非没有语音包。
- [ ] 同时保留 Windows/macOS 既有 Web Speech 行为，Web 浏览器版在没有 Linux 桌面桥时不给虚假的本地 TTS 承诺。
- [ ] 实机 Pop!_OS 24 + PipeWire 听音验证仍需运行，GitHub Actions 的 Ubuntu 构建不能替代实际听音测试。

## 本轮修改范围

`apps/desktop/linuxSpeech.ts`、`apps/desktop/main.ts`、`apps/desktop/preload.ts`、`packages/audio/speech.ts`、`packages/learning/service.ts`、`apps/web/src/App.tsx` 及相关测试。冻结产品文档 `docs/Voxnelo-Product-Docs-v1.0/` 不变。
