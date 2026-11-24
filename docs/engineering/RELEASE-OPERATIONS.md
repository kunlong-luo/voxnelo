# Voxnelo 当前发布运维与历史平台包校验

## 当前公开发行（v1.0.3）

最新官方版是 [v1.0.3 免签名正式维护版](https://github.com/kunlong-luo/voxnelo/releases/tag/v1.0.3)，已于 2026-10-25 公开，`draft=false`、`prerelease=false`，也是 GitHub Latest Release。其 [正式发布流水线](https://github.com/kunlong-luo/voxnelo/actions/runs/40146532392) 全部成功：同一源码提交 `06d60289988ea8b0dd9bf06067726d7d15b47fca` 在 Linux/Windows/macOS 原生 Runner 构建，执行严格依赖审计、版本/测试/包校验与 SHA-256，Linux DEB 完成实际 apt 安装。公开发布页有 5 个安装包（含两个字节一致的 DEB 别名）和 3 个 SHA-256 清单，共 8 个附件。

维护者 2026-10-25 已明确确认所需人工测试通过，记录于 [人工测试状态](MANUAL-QA-OWNER-2026-10-25.md)；不重复要求进行同一轮人工测试。尚无逐设备、定量 WER 和独立多审核人可公开核验的完整证据，仍应单独区分。

**发行范围：** Linux x64 DEB/AppImage、Windows x64 NSIS EXE、macOS ARM64 DMG。**全部未签名，macOS 未公证**；SmartScreen / Smart App Control 或 Gatekeeper 可能阻止运行。Linux Moonshine 需要用户主动单独安装模型，Windows/macOS 不承诺相同离线引擎。F001–F012、模型/内容权利和至少五位初学者独立审核尚无完整公开可核验证据，但维护者确认所需人工操作测试已通过。详见 [v1.0.3 发行说明](../release-notes/v1.0.3.md) 和 [发行者免签名决定](../release/UNSIGNED-V1-OWNER-DECISION.md)。

## 不可变的已发布版本

- v1.0.3：**当前公开正式版**，禁止重新创建、覆盖或换掉原有安装包/标签。
- v1.0.2：历史正式维护版，原标签与 8 个附件保留。[成功发行流水线](https://github.com/kunlong-luo/voxnelo/actions/runs/40103037891) 以及原发行源码提交 `4926829094ea67b8a233bd3c41cb393719ee8aaf` 保持可追溯。
- v1.0.1：历史正式维护版，原标签、8 个已发布附件与 SHA-256 均保留，不覆盖。[原始成功发行流水线](https://github.com/kunlong-luo/voxnelo/actions/runs/40071198560) 及原发行源码提交 `3404f5d2893939e2dba2ef71cbed13f948f85c4c` 保持可追溯。
- v1.0.0：历史正式版，继续保留原标签与安装包；不做原位覆盖。
- v0.1.7：旧版本的**私有 Draft**，11 个附件，**尚未公开**，不是当前下载版。
- v0.1.5/v0.1.6：原 Early Access 公开历史版，不覆盖原有标签或安装件。

上述七份已完成的一次性发布/草稿工作流（v0.1.5 至 v1.0.3）原本已移除 push 触发且首个作业禁用（`if: false`）；2026-11-21 进一步从可执行 `.github/workflows/` 目录**原样移至** [历史工作流归档](../archive/README.md)。历史来源代码、发布记录和标签仍可追溯，但不能再从 Actions 手动触发旧发布作业，避免错误复用带 `contents: write` 权限的旧流程。

历史 v1.0.4 一次性草稿创建和 Windows 清单修复入口已于 2026-11-21 移出可执行 Actions 目录，源码保存在 [归档](../archive/README.md)；已存在的私有 Draft 和资产未更动。新修复须重新走独立审查，不再复用一次性写权限工作流。后续手动 `release-draft.yml` 已新增**构建之前**的受权 Release 列表（含私有 Draft）和 tag 防重检查，避免误将草稿按标签查询的 404 当作不存在，并在真正组装草稿前重复校验；查询不可靠时直接拒绝继续，不改变现有发行资产。

## 未来发布需要做的验证

1. 新版本号和发行说明经 PR 审核，固定源码提交，在 Linux/Windows/macOS Runner 构建，验证产品版本、实际安装器大小和 SHA-256。
2. 使用相同的来源版本验证 Linux DEB apt 安装、Windows NSIS 安装卸载以及 macOS DMG 架构与系统限制，确保保留旧学习数据。
3. 真实设备测试系统麦克风请求/拒绝、录音停止/回听、切句与拔插、重启后的收藏历史、TTS、主题与 125%/150% DPI；Linux 另外测 Moonshine 安装和安静/噪音条件下的识别表现。不得用 mock CI 冒充真实 QA。
4. 按 [F001–F012 验收矩阵](V0.1-ACCEPTANCE-MATRIX.md)、[内容审校](V0.1-CONTENT-REVIEW.md) 和 [ASR 权利门禁](ASR-PUBLIC-RELEASE-GATE.md) 填写真正的脱敏审核证据。
5. 若选择未来发布真实签名、公证且完整审校的增强版本，再执行额外的 [认证级签名门禁](STABLE-RELEASE-READINESS.md)。这一**可选额外门禁不是 v1.0.x 免签名官方发布的历史先决条件**。

完整安装/使用说明见 [用户指南](../USER-GUIDE.md)，操作历史和旧版本发布纪律见 [GitHub Release 指南](GITHUB-RELEASE-DRAFT.md)。

## Scoped deep UI / desktop QA (updated 2026-11-23)

To keep normal PR feedback fast, the CPU-heavy Chromium responsive screenshots, Linux Electron native-window/restart/DPI checks and renderer size budget live in `.github/workflows/quality-deep.yml`, outside the mandatory `check` aggregate. Since [PR #264](https://github.com/kunlong-luo/voxnelo/pull/264), the deep workflow runs **automatically on pull requests touching the specifically listed practice UI, visual tokens, visual scripts or V3 design-spec paths**; unrelated PRs do not trigger it. Manual `workflow_dispatch` remains available for release-candidate review. Skipped runs must be marked **not run**, never PASS.

For the V3 UI change, [scoped run #45166540586](https://github.com/kunlong-luo/voxnelo/actions/runs/45166540586) completed successfully against PR head `ac784b148cdc3dc380af3f8654089d6f340f8869`, with Chromium responsive and Linux virtual Electron QA. Following squash merge, [main CI run #45168751524](https://github.com/kunlong-luo/voxnelo/actions/runs/45168751524) succeeded on `9fb2e428cb25bfb6c94d7f502b190c5e5d584a1c`. This is **automated visual/packaging evidence for those exact commits**, not human screen-reader, Windows/macOS native GUI, microphone WER/latency, legal approval or release acceptance. Before preparing any future desktop release, manually run deep QA against the **intended release source** and inspect its artifacts; do not reuse older candidate installers or assume the PR run covers later commits.

Core typechecking, lint, dependency architecture, UI architecture, content/audio safety gates, unit coverage, build and offline worker/protocol checks run in the independent `quality` job. The required `check` status is a small **aggregate gate** that waits for `quality` and the full Linux/Windows/macOS `desktop-package` matrix. Although the GitHub main Ruleset still explicitly lists only `check`, Windows and macOS, this dependency means a Linux failure or unfinished Linux package job prevents the required `check` status from passing. The original checks continue in parallel; the required status waits for all results. Do not disable security checks or alter release blockers to shorten PR time. A direct Linux Ruleset entry remains optional and needs repository administration permission; it is **not implied** by this workflow change. No CI pass constitutes native microphone, linguistic or signed release approval.

## v1.0.4 private Wheel legal-text reviewer handoff (2026-11-24)

After an explicitly opted-in Python 3.12 Wheel download and exact PyPI/committed-snapshot SHA verification, the [local-only legal text handoff](MOONSHINE-PRIVATE-LICENSE-TEXT-REVIEW-2026-11-24.md) can extract the original license/NOTICE plus METADATA **bytes** to a newly created private directory **outside this Git repository**. It does not touch the desktop installer, run any native Wheel payload, upload raw text to CI, or set any legal/release status to PASS. Actual third-party notices, runtime linkages, model provenance and privacy/human-microphone evidence remain separately PENDING. Old v1.0.4 Draft assets are unchanged.

## v1.0.4 private hardware-evidence intake (2026-11-23)

For the **unpublished** v1.0.4 source candidate, use the [physical human-microphone ledger](../release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md) and its blank JSON template. `pnpm asr:mic:evidence:audit <private-file.json>` is an **opt-in local-only completeness checker** (schema 2) for self-reported counts, source/installer SHA, the pinned Moonshine 0.0.65 runtime with Python 3.12, expected per-platform SDK Wheel and eight local model SHA-256 digests, and visible-UI latency. It does not independently inspect devices, audio, model bytes or source rights. A structurally complete summary is **not** an acceptance verdict, and the release owner must retain the actual underlying evidence privately and separately approve every release gate. As checked on 2026-11-23, all three new-native-ASR physical-human-mic rows remain **PENDING**, along with the 0.0.65 model provenance and NOTICE review. Nothing in this intake changes the old Draft Release #428750217, its eight prior assets or public v1.0.3.
