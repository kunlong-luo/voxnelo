# Voxnelo Linux · 用户自行安装离线英语听写内测引擎

> 这不是正式发布的离线 ASR，也**不会**将模型、原生二进制或用户音频添加至 GitHub 公开包。当前公开 DEB/AppImage 仍是 README-only ASR（听写不可用）。这一步需要用户主动执行并自行审阅上游许可。录音回放与 ASR 是独立功能。

## 在 Pop!_OS / Ubuntu 上启用本地内测

1. 安装包含此改动的 Voxnelo DEB 并**退出** Voxnelo。
2. 在 Voxnelo 仓库根目录运行：

   ```bash
   git pull --ff-only origin main
   pnpm install --frozen-lockfile
   pnpm asr:personal:install
   ```

   命令会明确从锁定修订的 Hugging Face 模型（`csukuangfj/sherpa-onnx-streaming-zipformer-en-2023-02-21` / `bfbb11950302dad9955f8ede01f0e768595e4fba`）下载、校验模型 SHA-256，再用 npm 安装固定版本的 `sherpa-onnx-node@1.13.8` 原生程序。只有在本机用户亲自运行命令时才会访问网络；**运行 Voxnelo 进行识别时不需联网，也不上传音频**。所需下载及磁盘空间明显超过 130 MB，请先留足空间。
3. 完成后，Linux 个人引擎目录为 `${XDG_CONFIG_HOME:-$HOME/.config}/voxnelo/offline-asr`，与仓库 `build/offline-asr` 及公共安装包完全分开。重新启动已安装的 Voxnelo，实时听写按钮仅在原生模块和模型都能找到时解锁。
4. 主动点击实时听写按钮并允许麦克风权限，对着设备读一句英语；只应显示真正由本地引擎推理得到的增量文字，停止后应完成最终文字。请测试多句、长时间、嘈杂环境、权限拒绝和设备切换。

**限制：** 个人目录内的 `manifest.json` 会标记 `releaseReady:false`，不能绕过公开发行的授权门禁。功能尚未通过真实学习者 WER、Linux/Windows/macOS 物理麦克风与噪音处理验收；自动反馈或语音评分未实现。此流程现在只开放 Linux，不应告诉 Windows/macOS 用户同一命令已受支持。个人模型安装后不会自动切换至云识别。

## 失败排查

- `npm install` 失败：检查网络和 npm 输出，并核对平台是 Linux x64。
- `Existing local ASR data found`：脚本不会覆盖已有个人引擎，以免误删或破坏验证过的用户文件；先手动备份/检查相关文件。
- 按钮仍不可用：确认完全退出应用后重新启动，确认 `personal-install.json` 和 `manifest.json` 位于上面的用户路径（不是仓库 `build` 目录）。
- 按钮解锁但启动失败：不能视为功能验收成功，可能是动态库、原生 ABI、权限或模型推理失败；保留终端/应用日志用于排查。不要把自己的原始麦克风音频公开上传到 issue。

## 正式发行与真实麦克风验证

见 `docs/engineering/V0.1-ASR-PACKAGED-PILOT.md`。公开安装包仍须通过模型/原生依赖再分发审核、跨平台测试和真实学习者准确率门槛。用户自行安装的个人内测资源不构成公开授权或对正式交付的保证。
