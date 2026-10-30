# Voxnelo GitHub 发行版与历史草稿

## 当前官方发行版（核对日期 2026-10-25）

- **[v1.0.3 官方免签名正式版](https://github.com/kunlong-luo/voxnelo/releases/tag/v1.0.3)**：公开、非 prerelease（`draft=false` / `prerelease=false`），Linux x64 DEB/AppImage、Windows x64 EXE、macOS ARM64 DMG 和三个 SHA-256 摘要清单共八个附件。2026-10-25 发布，安装包**未签名**、macOS **未公证**；维护者确认同轮人工测试通过，不能自动推断已有定量声学测评/完整独立审校/签名/全部 OS 原生 Moonshine。
- **v1.0.0/v1.0.1/v1.0.2**：历史公开正式版，原 Release、标签与二进制附件不覆盖。
- **v0.1.7**：包含 11 个附件的**未公开历史 Draft**，不是当前下载版本，也不应重新执行草稿或把其旧附件改为 v1.0.0。
- v0.1.5/v0.1.6：历史公开 Early Access，仍保留原标签与安装包。

## 已完成的一次性发布（全部退役）

历史的 `publish-linux-v0.1.5.yml`、`publish-all-v0.1.6.yml`、`prepare-v0.1.7-draft-once.yml` 、`publish-all-v1.0.0.yml`、`publish-all-v1.0.1.yml`、`publish-all-v1.0.2.yml` 和 `publish-all-v1.0.3.yml` 均已完成各自任务。它们保留审计用脚本，但**不再监听任何 push**，其前置作业永久 `if: false`。不允许 Dependabot 修改触发重跑，也不可重建或覆盖已有标签、Release 或二进制附件。

v1.0.0 公开发行真实 [Actions 运行](https://github.com/kunlong-luo/voxnelo/actions/runs/39974884072) 成功，三平台安装包、Linux apt 实装、版本与 SHA-256 等自动门禁通过；但不会自动形成五名用户、F001–F012、第三方模型权利或各设备麦克风测试的真实证据。

## v1.0.4 三平台免签名安装包的 Actions 验收产物（不是 Release）

新增 [v1.0.4 Review Installers](../../.github/workflows/v1.0.4-review-installers.yml) 独立一次性验收构建：该 workflow 自身首次合并进 `main` 时自动触发，以后仅能通过手动 Actions 调度或再次修改该文件触发，不会在每次代码提交后反复打包。它不创建标签、草稿或正式 GitHub Release，工作流 token 也没有发布权限。

- 三系统分别制作实际的 Linux x64 DEB/AppImage、Windows x64 NSIS EXE、macOS ARM64 DMG，生成 SHA-256；Linux DEB 做 apt 实装。
- 必须等待真正的三平台 Moonshine 原生 SDK/模型 + 打包后的 Worker/PCM 检查通过；然后核对所有安装包都属于本次源码 commit 与运行编号、且版本为 `1.0.4`。
- 成功后，在 [GitHub Actions 页面](https://github.com/kunlong-luo/voxnelo/actions) 找到 **Build v1.0.4 unsigned installer review artifacts (NOT a Release)** 运行记录，下载附件 `voxnelo-v1.0.4-unsigned-three-platform-REVIEW-NOT-RELEASE`（单个 ZIP，内含五个安装包及三个 SHA-256 清单，有效期 14 天）。工作流不上传模型或个人音频；中间证据 JSON 不属于用户安装包。
- 文件仅用于维护者核对和针对新原生引擎的验收，**不代表 v1.0.4 已公开发布**，也不等于具有代码签名、Apple 公证、真人 WER/端到端延迟或完成所有第三方许可审核。只有单独通过 `release-draft.yml`、确认发行文案与必要证据后，才考虑人工发布。

## v1.0.4 私有 Release Draft 一次性准备（**不公开**）

为了减少反复要求维护者进入 Actions 手动填写参数，新增 [一次性私有草稿入口](../../.github/workflows/prepare-v1.0.4-private-draft-once.yml)。**首次经 PR 合并到 main 后**，仅因该文件的变更启动一次：复用原本经审查的 `release-draft.yml`，以固定 `version=1.0.4`、`confirmation=PREPARE_DRAFT_ONLY` 执行，不能发布公开版本；原有手动 `workflow_dispatch` 入口仍保留。

- 在 `main` 同一提交上重新执行固定依赖审计、三平台原生 Moonshine SDK/模型/Worker 验证、真实 Windows NSIS / macOS ARM64 DMG / Linux DEB+AppImage 打包和 Linux DEB apt 安装。
- 创建草稿之前还须核对三份清单：来源 SHA、workflow run 编号、精确文件名（Windows 是 `Voxnelo Setup 1.0.4.exe`）、安装包大小、SHA-256，以及未经批准的额外附件；遇到旧 tag/Release 必须拒绝覆盖。
- 全部成功时自动创建 **draft=true、prerelease=true 的私有 v1.0.4 Release Draft**，并只附带五个免签名安装包与三份摘要清单；不使用 `gh release publish`、`--latest` 或自动公开事件。
- 如果失败，先修复并再次通过 PR/CI；**不得修改旧版公开附件、跳过原生校验或用其他提交的 ZIP 冒充新提交候选**。若之后需要重新构建，手动启动原有工作流，且其拒绝覆盖已有 tag/Release。
- 本动作仅授权创建内部草稿供检查，**不表示模型/SDK 许可已通过法律复核**，也不能把合成 PCM 结果当作真人麦克风 WER、录音权限/拔插实测或完整 F001–F012 证据。是否公开发布由维护者另行明确决定；免签名风险需持续披露。

## v1.0.4 私有草稿已创建：修复 GitHub 附件文件名差异

[Actions 41019525418](https://github.com/kunlong-luo/voxnelo/actions/runs/41019525418) 已在 2026-10-30 成功创建 v1.0.4 **未公开草稿**（Release ID `428750217`，8 个附件，来源 commit `4aeb58e`）。Linux/Windows/macOS 原生 Moonshine SDK/模型/Worker、三平台免签名安装包、Linux DEB apt 实装与候选字节 SHA-256 检查均通过。**这仍然不是公开发布批准**。

GitHub Release 上传时把 Windows 安装包 `Voxnelo Setup 1.0.4.exe` 自动显示为 `Voxnelo.Setup.1.0.4.exe`，但不会同步修改原本的 `SHA256SUMS-win32.txt` 内容。为避免用户拿到无法按文件名校验的清单，修复流程分两部分：

- 新版本私有草稿流程在上传前将 Windows 文件名规范化成与 GitHub 最终存储一致的点号，并从**已验证的原始字节**重新生成匹配的 Windows SHA-256 清单。
- 对已经生成的 v1.0.4 私有草稿，新增 [一次性校验修复入口](../../.github/workflows/repair-v1.0.4-private-draft-win-checksum-once.yml)。只有核对 Release ID、源提交、仍为 Draft、全部 8 个预期附件且真实下载 EXE 的哈希与原始清单一致，才允许**只替换 `SHA256SUMS-win32.txt`**；不替换 EXE、不修改历史公开 Release，不创建/发布任何新版本。已修复时直接安全退出。工作流是否执行成功、更新后的清单是否通过验证，应以 Actions 与 GitHub Release API 的实际结果为准。

## 后续新版本、草稿和额外的签名通道

新版本应先以 PR 更新源码版本、锁文件、发行说明并通过 CI，再为**未使用的新版本号**建立独立的发布流程。`.github/workflows/release-draft.yml` 可通过 **Actions → Prepare GitHub release draft → Run workflow** 使用 `version` 及 `PREPARE_DRAFT_ONLY` 创建内部草稿；**已有 Draft/Release/tag 不允许覆盖**，草稿不会公开。

以后若维护者自愿采用 Authenticode 签名、Developer ID 公证和更严格的独立人工验收，可选用 [签名候选流程](SIGNED-CANDIDATE-SETUP.md) 与 [认证级门禁](STABLE-RELEASE-READINESS.md)。它们仍严格 fail closed，但不是已公开、明确披露 unsigned 风险的 v1.0.3（及历史 v1.0.0） 的先决条件。

**Publish release** 必须由授权维护者核对最终安装包、SHA-256、支持的系统与发行限制后明确操作。不能因 CI 绿灯就声称版权、独立审校、真实麦克风或所有 F001–F012 已通过。SHA-256 校验完整性，不能证明开发者身份或 Apple 公证。

详见 [发布运维](RELEASE-OPERATIONS.md)、[原始 PRD 验收矩阵](V0.1-ACCEPTANCE-MATRIX.md)、[用户指南](../USER-GUIDE.md)、[v1.0.3 发行说明](../release-notes/v1.0.3.md)。
