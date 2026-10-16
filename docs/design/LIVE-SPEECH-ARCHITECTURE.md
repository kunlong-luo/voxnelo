# Voxnelo 实时听写与语音对话：架构基线

状态：2026-10-16 **实时听写 Web 能力与桌面离线 ASR 接口准备中，不等于桌面实时对话已经交付**。该设计文档位于 `docs/design`，禁止修改冻结产品文档。

## 交互优先级

1. 主练习卡的 **实时英语听写** 替换纯装饰波形。用户主动开始监听，`interimResults` 即时显示临时词句，`isFinal` 则累积最终文本。当前英文教材仍常驻可见，未来再加入差异高亮及不依赖虚假发音分数的反馈。
2. **录制回听** 保留为从属操作，手动开始/停止，用户自主控制；不会偷偷后台录音。TTS、录音、听写三者互斥，活动期间禁止换句/切页，卸载及换句立即终止识别。
3. **双向实时 AI 对话** 需要 ASR→对话状态机→受控语义模型→TTS 的真实事件回路。现阶段没有聊天模型、实时轮次、VAD/打断能力，**严禁将单向转写称为双向对话**。

## 引擎与数据安全

- 真实生产桌面端必须接入独立离线流式识别引擎（可评估 sherpa-onnx / whisper.cpp 的本地安装包，确认真实延迟、内存、CPU/GPU、跨平台二进制签名、模型授权及再分发条款后选型）。运行在 **Electron 主进程管理的受限子进程/worker**，渲染层经预加载暴露最小 IPC；不要让 webview 直接调用 filesystem/exec 或远程模型接口。
- 本期 Web 识别 `useLiveDictation` 在 **本地识别** 模式强制 `SpeechRecognition.processLocally=true` 且需先通过 `SpeechRecognition.available({langs:['en-US'],processLocally:true})`。无引擎或语言包时明确展示不可用/需要下载安装；只能在用户直接点击后触发 `install()`。
- 浏览器在线识别必须由用户显式选择，本次会话生效、不自动持久化、绝不由本地模式静默回落到线上。在 Electron 上禁用浏览器在线识别路径，原因是 Chromium/Electron Web Speech 服务兼容性不可靠。注意某些浏览器 `SpeechRecognition` 可能上传麦克风音频给浏览器厂商，必须在文案明确告知，不能保证其云端保存政策。
- Electron `voxnelo://app` 的 CSP/权限策略、preload sandbox、contextIsolation、页面导航拦截保持不变。未实际集成并验收桌面离线 ASR 前，不得在 UI 或发布说明宣称全平台已经支持实时听写。
- **已提交**的本地录音采集 `getUserMedia` 请求 `noiseSuppression:true`、`echoCancellation:true`、`autoGainControl:true`、`channelCount:1`：这是偏好约束，不保证所有设备生效，可用 `MediaStreamTrack.getSettings()` 验证。尤其 Web Speech 浏览器独立获取麦克风音频，**无法保证其使用这条处理后的 MediaStream**，未来独立离线 ASR 必须消费实际降噪处理后的 PCM，才能对实时听写的降噪负责。
- 录音数据为当前会话的本地 Blob，用于回听；实时识别文本为会话状态，切换句子即清除。本期不自动生成伪发音评分，不自动保存到学习数据库，更不默默上传开发者服务器。

## 发布门槛

- 真正 Electron 桌面实时听写交付之前必须：在三系统完成离线流式引擎的完整语音端到端测试（含真实麦克风）、独立降噪链、设备断开/权限失败处理、非英语/噪声误识别处理、静音无声不伪造结果、性能预算、声音禁止后台监听、离线断网证明。
- 开发阶段的浏览器模拟识别事件只用于测试状态机；CI 的 Xvfb 虚拟 Electron 窗口不是真实物理麦克风测试，不能因此宣称真实 ASR 已可用。
- 保留 800×610 最小窗口、左侧导航全高、五个辅助音频入口及 125%/150% 高 DPI 几何检查；新增主听写 CTA 必须仍在第一屏。仅使用 Tailwind 4 语义 Token 与 Base UI，尊重 reduced-motion。

## Bundle 预算变更记录

- 以前独立组件重构后的 JavaScript gzip 上限为 164 KiB；新增真实听写事件处理 + 本地语言包探测后 CI 实测 165.4 KiB（并没有引入 Whisper、Vosk、ONNX 或其它大型前端 SDK）。预算谨慎调整到 **168 KiB**（约 +2.4%），CSS 24 KiB、整站 240 KiB 均不变。CI 仍执行强制预算，超出继续失败。
- 此预算只代表渲染器 JS 体积，不等于离线模型的内存或推理性能；真正桌面本地模型需另测加载时间、内存、CPU 和流式延迟，不能以这个数代替。

## Electron 本地流式 ASR 垂直切片（后续阶段）

本分支新增**真实 PCM→独立 Worker→sherpa-onnx OnlineRecognizer→实时结果 IPC**通道，不将浏览器 Web Speech 当作桌面引擎。模型二进制与原生 addon **没有随包发布**，所以公开构建默认明确显示不可用，绝不回退线上。仅供开发者使用本地安装的模型进行端到端试运行。

### 开发机手动配置（实验性）

1. 从 sherpa-onnx 官方项目选用**适配 streaming transducer 的英语 Zipformer 模型**，核实授权/模型内容，再将 encoder/decoder/joiner/tokens 放在单独的用户私有目录。将文件分别命名 `encoder.onnx`、`decoder.onnx`、`joiner.onnx`、`tokens.txt`，不得添加未知脚本或下载到源码仓库。
2. 在开发机另外安装同操作系统、同 CPU 架构可正常加载的 `sherpa-onnx-node` 原生 addon，先用 Node 22 确认运行环境 ABI/动态库匹配。不要将安装文件、模型参数或麦克风录音提交 GitHub。
3. 启动 Electron 开发构建时设置 `VOXNELO_ASR_MODEL_DIR` 为模型目录绝对路径、`VOXNELO_ASR_ADDON_PATH` 为 addon 的**绝对包目录路径**（可作为 Node require 的目录）；生产打包版强制关闭开发者覆盖，不能借环境变量打开未经审核的原生模块。
4. 只在用户主动点击「实时听写」后获取麦克风。Electron `AudioContext({sampleRate:16000})` + AudioWorklet 以每 100 ms / 1600 个 Float32 样本将**已请求 NS/AEC/AGC 的麦克风音轨**传往 IPC；主进程验证窗口/来源/会话标识、长度、数值边界，worker 运行推理/端点切句，文本仅返回当前窗口，不自动上传/持久化。
5. 完成真实跨平台、真实声卡、离线断网、设备失联、噪音、实时延迟、CPU/内存和 125/150% DPI 的集成验收前，不得将这套实验配置当作用户即装即用的 ASR 功能；也不得把基于音量的活动检测假称可靠的语音 VAD。

官方 streaming 参考：https://k2-fsa.github.io/sherpa/onnx/javascript-api/examples/streaming_asr.html

### 安全边界

- Native inference 永不在渲染器线程执行，开发 addon 只能从开发者配置的本机绝对路径加载。生产包和网页都不会获得 Node require、通用进程执行或任意磁盘访问。
- IPC 输入仅接受 16 kHz 单声道浮点 PCM 的 1–3200 样本音频块，且每个值必须是有限的 [-1,1] 数值；识别会话只属于创建它的 Voxnelo 主窗口。窗口关闭立即终止 worker。
- 真实识别仅来自 addon 模型结果。测试可以使用模仿 worker 的固定事件验证协议，但不能把该测试称为真实语音准确性测试。
- 音频采集不发往云端；浏览器的在线识别选项仍需单独显式同意。真实降噪效果要通过 `track.getSettings().noiseSuppression` 和噪声条件实测，Web Speech 路径不能自动共享 AudioWorklet 音频流。

## 实测模型选择与许可证门槛（2026-10-16）

官方 sherpa-onnx 示例确认 `OnlineRecognizer` 支持增量解码、`isEndpoint`、`inputFinished`。目前可供实验比较的英语流式模型之一为 `sherpa-onnx-streaming-zipformer-en-2023-06-26`，但**不能据此认定已经获得权重再分发许可**：模型镜像的卡片标注 Apache-2.0，而上游训练权重的许可证来源仍有待厘清（见 https://github.com/k2-fsa/icefall/issues/2102 ）。正式将模型写入 Windows/macOS/Linux 安装包前，必须核对原始权重、模型卡、作者授权、第三方数据及构建产物许可；不能只根据下载页面标签进行商业分发。

新增纯本地开发工具 `scripts/benchmark-offline-asr.mjs`，开发者可使用经过授权且已部署的英语模型进行真实基准测试，无任何自动下载和云端上传。

```bash
pnpm build:electron
VOXNELO_ASR_MODEL_DIR=/absolute/english-stream-model \
VOXNELO_ASR_ADDON_PATH=/absolute/sherpa-onnx-node \
node scripts/benchmark-offline-asr.mjs \
  --wav /absolute/english-16khz-mono-pcm16.wav \
  --expect "How are you today"
```

结果输出真实模型推理耗时、输入音频时长、实时系数（RTF）、最终文字与可选英语词错误率（WER）；注意**单条音频的 WER 并不代表总体英语口音识别水平**。应建立多口音、语速、安静/噪音条件的获许可语料测试集，并以 P50/P95 词延迟、CPU、内存、掉帧、误触发和端点准确性作为发布门槛。默认 CI 只做隔离 Worker 的模拟协议测试，真实模型需在已授权的专门开发/发布机器上运行。

### 稳定性加固

- 主进程只接受所属窗口及当前会话的有效 16 kHz `Float32Array`，限制队列最大 **20 × 100ms ≈ 2 秒**；worker 每解码一块返回 `drained`。过载时明确报错并立即结束会话，不会无声丢失学习者的话。
- 系统麦克风轨道发出 `ended` 时立即停止监听并释放音轨、`AudioContext`、IPC 会话，同时提示设备不可用。
- `MediaStreamTrack.getSettings().noiseSuppression===true` 时才能报告“设备已开启降噪”，否则显示“已请求降噪，效果未确认”。即使其值为 true，仍不保证能隔离邻近人的声音；不得把采集配置冒充经实测的降噪品质。
- 单元测试覆盖真实 UI Hook 的模拟设备断开、音轨采集的 NS 标记、正确清理，及主进程的无界积压防护、恶意 PCM 拒绝、非会话所有者 IPC 拒绝和句尾 flush。
