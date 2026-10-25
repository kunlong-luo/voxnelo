# Voxnelo — 多平台原生 Moonshine 试验

## Windows/macOS Moonshine 原生离线识别试验性接入（main，未随 v1.0.3 发布）

正在把 Linux 已验证的同一 Moonshine 0.0.65 Python IPC 接入 **Windows x64** 和 **macOS 15+ ARM64**；这是 **下一次维护版的代码候选**，已发布的 v1.0.3 Windows/macOS 安装包**不包含此功能**，不能将单纯完成安装等同于这些系统上已通过真人麦克风验收。当前 Linux x64 已验证的默认模型与升级路径不变。

- 完全独立的“离线模型管理”页必须在用户点击后才执行本地 Python 3 虚拟环境、固定版本 wheel 和英语 Medium Streaming 模型的安装/校验；应用启动或查询状态时不联网。安装失败、缺 Python 或校验不符则保持不可用，不切换到在线识别或虚假的 Zipformer 结果。
- 仅允许官方目前提供 wheel 的目标：Windows x64、macOS 15+ Apple Silicon 及 Linux x64。macOS 14/Intel、Windows ARM64 等不提供没有真实原生 wheel 的安装操作。
- 已发布用户数据、录音、收藏、本机 Python 模型均不动；个人数据位于各操作系统应用配置目录 `voxnelo/moonshine`，不写入仓库或打包进入公共安装件。
- Windows 需提前装好 **Python 3.10+** 并配置 Python Launcher（`py -3`）或 `python` 到 PATH；macOS 需有 `python3` 和 venv。首次安装 SDK/模型需要网络，真正推理阶段在本机执行且默认不上传音频。首次安装可能下载数百 MB 内容。
- 校验范围：OS 架构与 macOS 系统版本、Python 0.0.65 SDK 版本、八个模型文件的 SHA-256、真实 Worker 的 PCM/字幕/finish 协议、三系统构建。模型 wheel 上游二进制源码与分发许可不等于发行者签名认证。
- 官方 Moonshine 0.0.65 wheel 详情：https://pypi.org/project/moonshine-voice/0.0.65/ 。真正的三系统本地推理测试和设备麦克风确认应独立于合成 PCM CI，不能凭测试通过宣称识别质量达标。
