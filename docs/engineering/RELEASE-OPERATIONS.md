# Voxnelo 当前发布运维与历史平台包校验

## 当前公开发行（v1.0.3）

最新官方版是 [v1.0.3 免签名正式维护版](https://github.com/kunlong-luo/voxnelo/releases/tag/v1.0.3)，已于 2026-10-25 公开，`draft=false`、`prerelease=false`，也是 GitHub Latest Release。其 [正式发布流水线](https://github.com/kunlong-luo/voxnelo/actions/runs/40146532392) 全部成功：同一源码提交 `06d60289988ea8b0dd9bf06067726d7d15b47fca` 在 Linux/Windows/macOS 原生 Runner 构建，执行严格依赖审计、版本/测试/包校验与 SHA-256，Linux DEB 完成实际 apt 安装。公开发布页有 5 个安装包（含两个字节一致的 DEB 别名）和 3 个 SHA-256 清单，共 8 个附件。

维护者 2026-10-25 已明确确认所需人工测试通过，记录于 [人工测试状态](MANUAL-QA-OWNER-2026-10-25.md)；不重复要求进行同一轮人工测试。尚无逐设备、定量 WER 和独立多审核人可公开核验的完整证据，仍应单独区分。

**发行范围：** Linux x64 DEB/AppImage、Windows x64 NSIS EXE、macOS ARM64 DMG。**全部未签名，macOS 未公证**；SmartScreen / Smart App Control 或 Gatekeeper 可能阻止运行。Linux Moonshine 需要用户主动单独安装模型，Windows/macOS 不承诺相同离线引擎。F001–F012、模型/内容权利和至少五位初学者独立审核尚无完整公开可核验证据，但维护者确认所需人工操作测试已通过。详见 [v1.0.3 发行说明](../release-notes/v1.0.3.md) 和 [发行者免签名决定](../release/UNSIGNED-V1-OWNER-DECISION.md)。

## v1.0.4 发布冲刺（2026-11-24）

维护者同意进入发布收尾阶段，保留 HOLD。只处理阻塞项、验收与文档；见 [发布冻结和有序验收清单](../release/V1.0.4-RELEASE-FREEZE.md)。不升级 1.0.5、不创建标签、不替换历史 Draft，也不公开发行，直到全部适用门禁通过并取得明确发布授权。

## JavaScript 工具链与发布审核（2026-11-24）

- 统一采用固定版本 pnpm，源码安装使用冻结锁文件；开发环境准备参阅 [开发指南](../DEVELOPMENT.md)，版本约束参阅 [工具链规范](NODE26-LTS-MIGRATION.md)。
- [PR #287](https://github.com/kunlong-luo/voxnelo/pull/287) 跟踪隔离原生 ASR 环境的 pnpm 迁移，需通过对应 CI 后合并；既有已发布版本和旧候选包的记录保持原样。
- [构建依赖许可证审核](BUILD-LICENSE-INVENTORY.md) 将 pnpm 锁文件完整性与上游 Registry 归档验证区分开来；不调用其他包管理 CLI，不代表更换上游发行源，也不代表第三方许可获批。

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

## Voxnelo first-party MIT notice in desktop installer (2026-11-24)

The repository has a root [MIT LICENSE](../../LICENSE), which requires inclusion of its copyright and permission notice with copies/substantial portions. An audit of the explicit Electron `build.files` and `extraResources` configuration found **no guaranteed readable copy of that root file in the native installer resources**. The current source candidate now declares `extraResources: { from: "LICENSE", to: "LICENSE" }` in `package.json`; `scripts/check-desktop-package.mts` reads the **actual packaged** `resources/LICENSE` and compares the bytes exactly against the checked-in `LICENSE` on Linux, Windows and macOS, failing the package check if omitted or changed. `tests/first-party-license-packaging.test.ts` also guards the configuration and source notice. This is an engineering packaging correction **for future rebuilt candidates**, not retroactive proof that the already-existing v1.0.4 Draft installers contain that file.

**Linux installed-package evidence (2026-11-24):** Checking an `electron-builder --dir` output alone does not establish that the bytes survived into the installed Debian package. The additional read-only `scripts/check-installed-linux-license.mts` runs **after `apt-get install`**, queries `dpkg -L voxnelo` to locate one package-owned `resources/LICENSE` and checks the *installed file bytes* against the tracked root `LICENSE`. It is now used by the main CI, current v1.0.4 review installers, generic unsigned candidate, and manual private draft build workflows. Unit tests cover missing/duplicate/noncanonical paths and byte tampering. Windows NSIS and macOS DMG checks still inspect the native unpacked app created alongside each installer; they do **not** claim a real human GUI installation, actual installer extraction/mount, or public distribution approval. This adds no new package build and does not modify any existing Draft asset. The installed Linux check itself must pass CI before claiming that gate is satisfied.

**Scope separation:** the shipped `resources/LICENSE` covers **Voxnelo's own MIT notice only**. It does not claim that the Electron runtime, bundled npm modules, any user-initiated Python Wheels, ONNX Runtime / OpenBLAS / PortAudio native libraries, or eight historical Moonshine model bytes have complete or approved license notices. Exact third-party SBOM / license obligations, versioned model rights and human physical-mic QA remain **PENDING**. The old v1.0.4 Draft (ID `428750217`) and its eight assets must stay unchanged; no release approval is created by passing this byte comparison.

### Windows LICENSE CRLF in scoped review builder (2026-11-24)

A fresh v1.0.4 read-only three-OS review workflow [run #45317355055](https://github.com/kunlong-luo/voxnelo/actions/runs/45317355055) exposed a **confirmed Windows checkout regression**, not a third-party rights determination: `tests/first-party-license-packaging.test.ts` expected the checked-in MIT notice to start with an LF but Git converted root `LICENSE` to CRLF. The Windows `Typecheck and test` step failed (1 of 616 cases) although regular CI package integrity had previously passed. Add a dedicated `LICENSE text eol=lf` Git attribute, assert root LICENSE byte stability in Windows regression tests, and run the focused first-party notice test in the scoped review workflow **before** the costly full build. The original failed run is **NOT** a complete three-platform review ZIP or public release. A new, exact-source review run must pass before using its candidate artifacts as hardware QA inputs.

### Exact-source Windows CRLF recheck and private installer handoff

The repaired first-party LICENSE LF checkout fix is merged via [PR #278](https://github.com/kunlong-luo/voxnelo/pull/278), commit `be89e098a0c9593f1f87ff8ea6baba2ef9c107ea`. Its [normal main CI](https://github.com/kunlong-luo/voxnelo/actions/runs/45318769778) succeeded, but **normal CI is not the separate three-platform v1.0.4 private installer bundle**. New read-only [review run #45318769948](https://github.com/kunlong-luo/voxnelo/actions/runs/45318769948) must reach overall success, including the Linux apt test and final combined ZIP, before assigning a full candidate status. The [source- and artifact-SHA-bound handoff](../release/V1.0.4-REVIEW-ARTIFACT-HANDOFF-2026-11-24.md) records the Windows failure, initial replay observation and exact instructions for private real-device QA. The old Draft assets and all legal/human-mic blockers remain unchanged.

## v1.0.4 Moonshine model migration decision (2026-11-24)

Current source remains pinned to `moonshine-voice==0.0.65` and its earlier eight `quantized/` model hashes; neither native runtime nor public Draft assets are upgraded. The read-only [upstream v0.1.6 version/format review](MOONSHINE-VERSION-MIGRATION-DECISION-2026-11-24.md) records materially different `quantized_26_11_02` weights, split `frontend.model.ort` and `frontend.weights.ort` filenames, and optional attention-decoder contents, plus upstream-only Windows/VAD changes. A separate, explicitly scoped and signed-off migration would require fresh pinned runtime/Wheel/model hashes and licenses, separate CI/packaging checks and real device human microphone evidence; **do not silently switch the default or treat upstream metrics as Voxnelo results**. The [publisher evidence request remains UNSENT](MOONSHINE-UPSTREAM-EVIDENCE-REQUEST-2026-11-23.md).

## v1.0.4 private Wheel legal-text reviewer handoff (2026-11-24)

After an explicitly opted-in Python 3.12 Wheel download and exact PyPI/committed-snapshot SHA verification, the [local-only legal text handoff](MOONSHINE-PRIVATE-LICENSE-TEXT-REVIEW-2026-11-24.md) can extract the original license/NOTICE plus METADATA **bytes** to a newly created private directory **outside this Git repository**. It separately verifies original core `METADATA` bytes, rechecks whole-Wheel integrity after local text extraction, refuses symlinked or Windows-junction private-output ancestors, requires the **repository-tracked Python 3.12 Wheel SHA snapshot** as the CLI input, and rejects executable/model-looking ZIP members that masquerade as legal files. A manually supplied alternate snapshot or such an ambiguous member must be investigated; never infer legal approval from a successful run. It does not touch the desktop installer, run any native Wheel payload, upload raw text to CI, or set any legal/release status to PASS. Actual third-party notices, runtime linkages, model provenance and privacy/human-microphone evidence remain separately PENDING. Old v1.0.4 Draft assets are unchanged.

## v1.0.4 private hardware-evidence intake (updated 2026-11-24)

Each OS needs at least 10 **quiet + 10 noisy direct-human-microphone trials**, and **both first-visible interim and final-visible subtitle timing sample counts must equal the sum of those trials**, not just one good run and not extraneous samples. The read-only schema-2 intake validator rejects undercounted/overcounted latency samples, unsafe WER edit totals, future-dated reports and summary files over 256 KiB; it does not echo unexpected private JSON property names; absent subtitle events must be recorded as failures for human review, not omitted to produce flattering percentiles. This does not invent human microphone observations or change v1.0.4's release gate.


For the **unpublished** v1.0.4 source candidate, use the [physical human-microphone ledger](../release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md) and its blank JSON template. `pnpm asr:mic:evidence:audit <private-file.json>` is an **opt-in local-only completeness checker** (schema 2) for self-reported counts, source/installer SHA, the pinned Moonshine 0.0.65 runtime with Python 3.12, expected per-platform SDK Wheel and eight local model SHA-256 digests, and visible-UI latency. It does not independently inspect devices, audio, model bytes or source rights. A structurally complete summary is **not** an acceptance verdict, and the release owner must retain the actual underlying evidence privately and separately approve every release gate. As checked on 2026-11-23, all three new-native-ASR physical-human-mic rows remain **PENDING**, along with the 0.0.65 model provenance and NOTICE review. Nothing in this intake changes the old Draft Release #428750217, its eight prior assets or public v1.0.3.

## Supplemental native framework notices — proposed packaging correction (2026-11-24)

Review run `45318769948` is the historical pre-correction candidate, not evidence for a corrected installer. The macOS notice coverage finding is tracked in [PR #280](https://github.com/kunlong-luo/voxnelo/pull/280) and the [ASR release gate](ASR-PUBLIC-RELEASE-GATE.md). Four original legal texts are now checked in under `build/third-party-notices/`, from the exact dependency commits declared in [Electron v45.4.1 DEPS](https://github.com/electron/electron/blob/v45.4.1/DEPS).

| Text | Immutable upstream source | Git blob SHA-1 |
| --- | --- | --- |
| Squirrel.txt | [LICENSE](https://github.com/Squirrel/Squirrel.Mac/blob/fffea30e4a339a7f7d69a3391314b72548d209bd/LICENSE) | `5947a9ffe98ba34011ae42b2851e6fdf050b3ddd` |
| ReactiveObjC.txt | [LICENSE.md](https://github.com/ReactiveCocoa/ReactiveObjC/blob/74ab5baccc6f7202c8ac69a8d1e152c29dc1ea76/LICENSE.md) | `49bc37468d432900e63a13929c4ca0bdf39f04cc` |
| Mantle.txt | [LICENSE.md](https://github.com/Mantle/Mantle/blob/2a8e2123a3931038179ee06105c9e6ec336b12ea/LICENSE.md) | `4e9825ac272bdbab7e56f9bc5b27fb583144dfc7` |
| Sparkle.txt | [LICENSE](https://github.com/sparkle-project/Sparkle/blob/79bc9e872948e47877e76f194cb0c8e0412b0b90/LICENSE) | `abe6e04c37e0b94e3a25078b6fd4abdafc299af4` |

All four committed blobs were read back and match upstream. Preserve LF and original legal text. Electron-builder copies this supplemental set into `resources/THIRD-PARTY-NOTICES/` (macOS `Contents/Resources/THIRD-PARTY-NOTICES/`) without replacing existing Electron notices. The package integrity checker requires Electron 45.4.1, pinned source blob identities and identical packaged bytes. Future Electron upgrades require refreshing reviewed pins. This is not an exhaustive legal inventory.

CI and corrected installer inspection remain pending. The checker examines unpacked app resources, not every final installer. Verify corrected NSIS, DMG, DEB and AppImage individually. AppImage native libraries, Windows bootstrapper, renderer dependencies/assets, Python and model rights remain pending. Generate a fresh exact-source review-only build after packaging changes, independently hash its installers and collect physical microphone evidence bound to those new bytes. No old draft replacement or publication. **v1.0.4 HOLD.**

### Supplemental notice CI and installed-DEB follow-up — 2026-11-24

The initial [PR #281 CI run 45323113667](https://github.com/kunlong-luo/voxnelo/actions/runs/45323113667) at head `3ae36def5353ec7e91b71714d613a3c6e6f4f592` passed all five jobs. Logs from the Linux, Windows and macOS jobs explicitly report the new pinned third-party notice check passing on unpacked native bundles. Linux also passed its actual apt install check, which at that head checked only the first-party MIT LICENSE. Audit PR #280 merged to main as `3680e25b308d453781b37d421eb0ab315eaa3568`; the attempted #281 merge was refused by the repository's required-check rule despite the earlier green run. Do not bypass the rule.

The follow-up extends `scripts/check-installed-linux-license.mts` to require each of the four supplemental notice paths in the actual DEB package-owned file list, under the same resources directory as the installed first-party LICENSE, reject nonregular notice files, and compare installed bytes to the tracked original notice texts. New unit cases cover resource mapping, missing/duplicate/wrong-directory entries and altered bytes. These changes are submitted, **not yet verified by their own CI run**. Passing earlier checks is not evidence for the new head. This strengthens actual installed-file evidence only; the fresh exact-source installer build, independent final payload inspection, SHA-256, legal review and human physical-device testing remain pending. Keep v1.0.4 HOLD and the historical draft unchanged.

### Installed supplemental notice validation and branch synchronization — 2026-11-24

The subsequent [PR #281 CI run 45323570903](https://github.com/kunlong-luo/voxnelo/actions/runs/45323570903) at head `a7f27e59e4a85f60be322f0fa7ecb6bd5073e6ed` completed all five jobs successfully. The [Linux job 138207634957](https://github.com/kunlong-luo/voxnelo/actions/runs/45323570903/job/138207634957) explicitly logged both exact first-party MIT LICENSE verification and all four exact pinned supplemental notices after actual DEB installation, with legal approval still pending. This supersedes the earlier pending installed-DEB observation for that head only.

A subsequent merge attempt was refused by required status checks. The raw PR metadata reported `mergeable_state: behind`. To preserve branch protection, synchronize the PR with main at `3680e25b308d453781b37d421eb0ab315eaa3568`, using the inspected GitHub merge-result tree, retain all nine intended PR files and rerun required checks for the synchronized head. Do not waive checks or claim the previous green run certifies the new head. The fresh final review-only build, installer-level notice inspection, independently measured SHA-256 values, AppImage/NSIS provenance, model rights, and physical human microphone acceptance remain separately pending. **HOLD; no publication.**

## 发布冲刺复验记录

PR #287、#289 已合并，旧 Zipformer 原生工程测试三平台复验通过；两次真实上游归档审核的脱敏 JSON 字节相同。仍不得替代最终候选安装包的法律审核和物理麦克风验收。详见 [发布冲刺清单](../release/V1.0.4-RELEASE-FREEZE.md) 与 [审核评分](../release/V1.0.4-REGISTRY-AUDIT.md)。HOLD。

## Linux x64 原生补丁构建要求（v1.0.4，待 CI 验证）

Linux 本地打包统一使用 `pnpm pack:linux`。构建机需要 Python 3.10+、curl、7z（Ubuntu/Debian 的 p7zip-full）、dpkg-deb 和 squashfs-tools（unsquashfs）；它们仅是构建工具，不是新增的用户运行依赖。同版本 AppImage 已存在时，请先移动到 `release/` 之外保存，再重新构建；脚本不会覆盖旧文件。不要直接调用 electron-builder 的 Linux AppImage 目标绕过补丁准备。脚本检查已审计的 electron-builder 26.18.0、固定历史工具集和官方修复版 DEB 的哈希，使用临时工具集和独占版权声明文件，完成后清理；输入缺失、哈希不符或最终 AppImage 载荷不符直接失败，不回退到旧库。构建后由 `check-desktop-package.mts` 再次检查成品。CI、ASR 候选、通用发行候选、私有草稿及 v1.0.4 审核流水线均接入同一路径。当前改动待 CI，旧候选与旧 Draft 不能作为补丁集成通过的证据；重新生成完整三平台候选及完成权利、真实设备验收后方可发布。详见 [发布审核台账](../release/V1.0.4-REGISTRY-AUDIT.md)。

## v1.0.4 审核包 ASAR 许可门禁（待验证）

拟将现有审核工作流中的 Registry 核对移到 Linux DEB 实际安装之后：确认 dpkg 所属的 /opt/Voxnelo/resources/app.asar 是普通文件，与 release/linux-unpacked/resources/app.asar 完整字节一致，再运行 pnpm license:audit:registry --compare-notices --packaged-asar，传入实际安装的文件路径。缺失、符号链接、字节不匹配、上游归档或许可证错误均须使任务失败，禁止跳过。保留原两个 JSON 证据文件与候选清单，仍只有一次 Registry 在线核查。合并工作流变更会触发现有 main 审核构建，不创建 Release 或标签。必须在新源码候选完成后复核报告、归档和安装文件哈希；不能用旧候选的物理验收替代新字节证据。当前变更尚待 CI 与实际审核构建验证。完整原生库、模型、安装器法律义务与真人验收仍待完成，保持 HOLD。

## 安装后 ASAR 门禁验证结果（2026-11-25）

#306 已合并；新审核构建 45578438677 八项任务全部通过，实际 DEB 所属 ASAR 与打包目录字节一致，18 个依赖包及 19 份根许可证自动核对成功。独立下载的报告及三个分平台安装包已经复算，详见[审核台账](../release/V1.0.4-REGISTRY-AUDIT.md)。仅文档更新不重新生成候选；当前以该次构建的精确源码及安装文件哈希为准。法律与真人设备验收仍待完成。HOLD。

## 最新 v1.0.4 实机验收入口与候选绑定（待 CI）

[实机验收台账](../release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md)集中列出审核 run 45578438677 的三平台下载、实际安装文件 SHA-256、各系统本地复算命令及真人验收流程。拟强化现有本地 schema 2 检查器，要求源码等于 e35cc3a 的完整 SHA，并匹配对应平台的最新安装文件固定哈希；旧候选、错平台和未知摘要直接拒绝，Linux 两种格式均可使用。不修改空白证据模板，不复制预期值冒充实测，不新增工作流或触发候选重建。结构检查始终无法替代真人、法律或发布批准。新候选必须先独立核对真实文件字节，再明确更新固定值与回归测试。当前尚待本次 CI。HOLD。
