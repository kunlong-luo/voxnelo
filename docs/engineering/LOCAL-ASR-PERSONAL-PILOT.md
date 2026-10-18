# Voxnelo Linux · 用户自行安装离线英语听写内测引擎

> 这不是正式发布的离线 ASR，也**不会**将模型、原生二进制或用户音频添加至 GitHub 公开包。公开 DEB/AppImage 不内置 ASR 模型和原生依赖；**未自行安装个人引擎的用户**无法使用离线听写。已按本文自愿安装并通过字节验证的 Linux 用户可以开启实验性实时听写。这一步需要用户主动执行并自行审阅上游许可。录音回放与 ASR 是独立功能。

> V0.1 候选版生成和 SHA-256 清单见 `docs/engineering/V0.1-RC-PLAYBOOK.md`。个人安装成功也不构成 #45 正式三平台流式识别验收证据；不可据此把已公开发行状态标为通过。

## 在 Pop!_OS / Ubuntu 上启用本地内测

1. 将 Voxnelo 原位升级到 **0.1.5** 的 DEB（`apt install ./voxnelo_0.1.5_amd64.deb`，无需先卸载），并**完全退出** Voxnelo。
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
- 再次运行安装命令：**已安装且完整性验证通过时直接复用，不重复下载模型，也不覆盖旧文件**。如果旧文件存在但校验失败，脚本会明确拒绝覆盖并提示寻求修复帮助；请勿直接删除未知个人数据。
- 按钮仍不可用：确认完全退出应用后重新启动，确认 `personal-install.json` 和 `manifest.json` 位于上面的用户路径（不是仓库 `build` 目录）。
- 按钮解锁但启动失败：不能视为功能验收成功，可能是动态库、原生 ABI、权限或模型推理失败；保留终端/应用日志用于排查。不要把自己的原始麦克风音频公开上传到 issue。

## 正式发行与真实麦克风验证

参照 [0.1.5 本机验收记录模板](V0.1.5-LOCAL-DEVICE-QA.md) 单独验证 KDE Discover 品牌元数据、麦克风连续增量识别和降噪表现。完整发布门禁见 `docs/engineering/V0.1-ASR-PACKAGED-PILOT.md`。公开安装包仍须通过模型/原生依赖再分发审核、跨平台测试和真实学习者准确率门槛。用户自行安装的个人内测资源不构成公开授权或对正式交付的保证。
