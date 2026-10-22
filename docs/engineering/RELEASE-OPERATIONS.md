# Voxnelo v0.1.6 Release 运维与平台安装包校验

## 当前发行范围

公开 GitHub `v0.1.6` 是 **Early Access / prerelease**，不是稳定版。发布包含：

- Linux x64：`Voxnelo.deb`、`voxnelo_0.1.6_amd64.deb`（字节相同）、`Voxnelo-0.1.6.AppImage`
- Windows：由 Windows GitHub Runner 构建的 NSIS `.exe`
- macOS：由 macOS GitHub Runner 构建的 `.dmg`（留意 DMG 对应的 CPU 架构）
- 校验：`SHA256SUMS-linux.txt`、`SHA256SUMS-win32.txt`、`SHA256SUMS-darwin.txt`

所有安装包 **未签名**，macOS **未公证**。Windows/macOS 的本机 Moonshine 推理**尚未经过原生移植验收**；Linux Moonshine 需要用户在模型管理页主动下载安装，绝不预埋模型或静默回退。

## 一次性公开流水线

仓库文件：`.github/workflows/publish-all-v0.1.6.yml`。只有这份工作流文件首次进入 `main` 才会触发，不能通过任意 push 或 tag 自动重复发行。

1. 预检查：`main`、源码版本 `0.1.6`、真实发行说明及现有 tag/Release 不冲突。
2. 构建矩阵：Linux（DEB/AppImage）、Windows（NSIS EXE）、macOS（DMG）；`pnpm typecheck`、`pnpm test`、`pnpm build`、ASR 模型有效性和 `check-desktop-package`；Linux 还做 apt 的实际安装。
3. 使用 `write-candidate-manifest.mts` 生成每个系统的候选审计文件和 SHA-256 清单。候选 JSON 记录 `candidateOnly=true`、`unsigned=true`、`publicReleaseApproved=false`，意思是**未完成稳定版审批**，不会放到公开 Release 中供用户误读。
4. 汇总三个独立的构建 artifact，在 Ubuntu 上逐个执行 `sha256sum -c`，核对两个 Linux DEB 字节相同，确认有至少一个 EXE 和 DMG，以及平台身份、大小、摘要格式。
5. 最后再次拒绝覆盖已有 tag/Release，然后通过 GitHub token 权限创建公开的 `v0.1.6 --prerelease`，上传安装文件和三个 SHA 清单。若任何前置步骤失败则不创建 Release。

## 用户下载安装后的实机回归

分别复核 Linux apt 升级、AppImage 可执行、Windows 安装/卸载与 SmartScreen 提示、macOS DMG 安装/Gatekeeper 限制。核对系统语音 TTS、麦克风授权和拒绝、录音回听、收藏历史重启、主题/缩放与中文字符。Linux 还需单独验证 Moonshine 点击安装、真正的增量字幕、安静/噪声 WER 与长时运行。**不要因 CI 通过就将未完成的实机测试标为通过。**

完整 P0 测试依然跟踪于 [V0.1 验收矩阵](V0.1-ACCEPTANCE-MATRIX.md)、[首批内容审校](V0.1-CONTENT-REVIEW.md)。保留更新日志、Release SHA 和必要的脱敏设备测试记录。发布后可按平台和版本标注 GitHub Issues；不能回写/覆盖已经发布的安装包内容。

## v0.1.5 历史

v0.1.5 是只提供 Linux 下载的公开 Early Access。保持既有标签、附件和下载完整性不变；新平台安装包在 v0.1.6 中独立发行，避免同一个版本号指向不同安装文件。

## v0.1.7 候选（尚未公开）

经 PR 审查与完整 CI 后，维护者可从 `main` 手动执行 `Prepare GitHub release draft`，输入 `version=0.1.7`、`confirmation=PREPARE_DRAFT_ONLY`。该流程会要求三平台构建、全部 pnpm High/Critical 依赖审计、安装包清单与 SHA-256 校验、Linux apt 安装，并创建**未发布的 Draft**。另外保留每周 Moonshine Python 严格审计、真实 Moonshine 推理和实际设备验收证据。人工确认前不得公开；如发布，必须标记为未签名的 Early Access prerelease，而非 Stable。保留 v0.1.6 原标签和安装包，待解决签名、公证、原生依赖授权、内容及 F001–F012 逐项验收。

## v0.1.7 一次性私有草稿自动准备

为避免重复要求维护者手动操作，新增 `.github/workflows/prepare-v0.1.7-draft-once.yml`，它**仅在该工作流文件首次合并进 main 时触发**，确认当前源码版本为 `0.1.7`，且没有同名 tag/Release 后，自动在 Linux、Windows、macOS 编译未签名安装包，执行严格 pnpm 审计、完整包及哈希校验和 Linux DEB 实装，再创建 **PRIVATE / prerelease Draft**。这一自动化不发布到公开下载页，也不代表证书、Apple 公证、真实麦克风、许可或 F001–F012 已通过。

如果自动草稿构建失败，应修复根因并进行独立 PR；已有同名 Release 或 tag 时绝不覆盖。为正式 Stable 提供签名后的新候选需遵循 [Stable readiness](STABLE-RELEASE-READINESS.md) 流程，绝不能直接公开此次 unsigned Draft。
