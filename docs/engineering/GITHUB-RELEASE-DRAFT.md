# Voxnelo GitHub 发行版与历史草稿

## 当前官方发行版（核对日期 2026-10-25）

- **[v1.0.3 官方免签名正式版](https://github.com/kunlong-luo/voxnelo/releases/tag/v1.0.3)**：公开、非 prerelease（`draft=false` / `prerelease=false`），Linux x64 DEB/AppImage、Windows x64 EXE、macOS ARM64 DMG 和三个 SHA-256 摘要清单共八个附件。2026-10-25 发布，安装包**未签名**、macOS **未公证**；维护者确认同轮人工测试通过，不能自动推断已有定量声学测评/完整独立审校/签名/全部 OS 原生 Moonshine。
- **v1.0.0/v1.0.1/v1.0.2**：历史公开正式版，原 Release、标签与二进制附件不覆盖。
- **v0.1.7**：包含 11 个附件的**未公开历史 Draft**，不是当前下载版本，也不应重新执行草稿或把其旧附件改为 v1.0.0。
- v0.1.5/v0.1.6：历史公开 Early Access，仍保留原标签与安装包。

## 已完成的一次性发布（全部退役）

历史的七份 v0.1.5–v1.0.3 发布/草稿工作流均已完成各自任务，2026-11-21 已从可执行 Actions 目录原样移至 [归档索引](../archive/README.md)。其原始版本曾没有 push 自动触发且前置作业已禁用；现在连手动 Actions 入口也已退役。完整历史源码与原有 CI/Release/标签/二进制附件保留，不允许重新执行或覆盖。

v1.0.0 公开发行真实 [Actions 运行](https://github.com/kunlong-luo/voxnelo/actions/runs/39974884072) 成功，三平台安装包、Linux apt 实装、版本与 SHA-256 等自动门禁通过；但不会自动形成五名用户、F001–F012、第三方模型权利或各设备麦克风测试的真实证据。

## v1.0.4 三平台免签名安装包的 Actions 验收产物（不是 Release）

现有 [v1.0.4 Review Installers](../../.github/workflows/v1.0.4-review-installers.yml) 只读评审构建：仅在该 workflow 文件于 `main` 发生变更或维护者手动执行时运行，**不对普通 main 提交自动反复打包**。当前工作流已对齐 Node 26 与 pnpm 12.22.0；新建安装包前进行与维护中工作流、锁文件、开发指南一致性的前置检查。它不创建标签、草稿或正式 GitHub Release，工作流 token 也没有发布权限。

- 三系统分别制作实际的 Linux x64 DEB/AppImage、Windows x64 NSIS EXE、macOS ARM64 DMG，生成 SHA-256；Linux DEB 做 apt 实装。
- 必须等待真正的三平台 Moonshine 原生 SDK/模型 + 打包后的 Worker/PCM 检查通过；然后核对所有安装包都属于本次源码 commit 与运行编号、且版本为 `1.0.4`。
- 成功后，在 [GitHub Actions 页面](https://github.com/kunlong-luo/voxnelo/actions) 找到 **Build v1.0.4 unsigned installer review artifacts (NOT a Release)** 运行记录，下载附件 `voxnelo-v1.0.4-unsigned-three-platform-REVIEW-NOT-RELEASE`（单个 ZIP，内含五个安装包及三个 SHA-256 清单，有效期 14 天）。工作流不上传模型或个人音频；中间证据 JSON 不属于用户安装包。
- 文件仅用于维护者核对和针对新原生引擎的验收，**不代表 v1.0.4 已公开发布**，也不等于具有代码签名、Apple 公证、真人 WER/端到端延迟或完成所有第三方许可审核。只有单独通过 `release-draft.yml`、确认发行文案与必要证据后，才考虑人工发布。

### 2026-11-23 基于最新 `main` 的候选包复验方案（非公开发布）

过去的 v1.0.4 Draft ID `428750217` 仍来自 `4aeb58e`，**不是**已合并 Python 3.12 全依赖 SHA-256 锁、原始 Wheel 许可证据及来源核查的当前 `main`。重新构建当前源码的审阅包时，只能使用上面的只读评审 workflow；先确认其前置 Node 26 / pnpm 12.22.0 检查与三平台真实 Moonshine SDK + 打包 Worker 通过，再要求 Linux DEB apt 实装、三系统安装包源提交/运行编号一致、每个平台 SHA256SUMS 逐项验证。仅在实际上传成功后，记录**新运行 ID、完整提交 SHA、精确 ZIP/安装包摘要和保留期限**。未实际生成的附件不能标记为存在，也不能把旧 Draft 的五个二进制视为最新源码。

成功获得审阅包也**不是发布批准**。仍须依照 [八文件模型不可变来源及许可证证据](MOONSHINE-V1.0.4-PROVENANCE-AND-NOTICES-2026-11-23.md)、[实际人声设备台账](../release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md) 以及新包 SHA 进行权利、真实麦克风、隐私和升级数据保持验收；不得覆盖现有 Draft，且不创建新的公开版本。

### 2026-11-23 首轮当前源码评审失败记录与跨平台换行修复

[Actions 45150623898](https://github.com/kunlong-luo/voxnelo/actions/runs/45150623898) 对最新当时的源码 `849c1ce587854b6058986ef51c0de3f298a81bb6` 执行**只读**三平台安装包评审。其 Linux/Windows/macOS 三个真实 Moonshine SDK/模型/打包后 Worker 测试均 **SUCCESS**；Linux 和 macOS 安装包制作/校验也 **SUCCESS**。**Windows 安装包矩阵在 `Typecheck and test` 阶段 FAILED**（17 个文本精确匹配或历史归档 Git blob SHA-1 检查失败）：Windows Git checkout 使用 CRLF 工作区文件，而该仓库原始 Git blob 是 LF。问题还影响 `scripts/moonshine-python-constraints.txt` 对照测试和 YAML 原样字符串判断。因为 Windows 失败，最终聚合评审 ZIP 正确标记为 `skipped`，**没有生成完整三平台新候选包**；不得把这一运行称为候选版验收成功。

修复方案：新增仓库级 `.gitattributes` 为工作流、历史归档 YAML、Python 固定约束、TypeScript/JSON/Python 维护文件强制 LF checkout，**不重写任何已归档的原始 Git blob 或历史 Release**；在日常必需 Windows 包装 CI 中针对七组与 LF/原始哈希相关的回归测试单独执行，另在只读评审流程的三平台任务中提前检查换行和工作区字节一致性。此修复若经 PR CI 全绿合并到 `main`，原有 scoped 触发器会发起**另一次独立的**最新版评审工作流。只在新运行真正成功、全部安装包 SHA-256 已验证时更新候选版本记录；不要从上次失败的工作流搬运 ZIP、复用旧 SHA 或回写 v1.0.4 Draft `428750217`。

## v1.0.4 私有 Release Draft 历史一次性准备（**不公开，工作流已退役**）

当时为减少维护者反复在 Actions 手动填写参数，曾新增 [已归档的一次性私有草稿入口](../archive/workflows/prepare-v1.0.4-private-draft-once.yml)。**首次经 PR 合并到 main 后**，仅因该文件的变更启动一次：复用原本经审查的 `release-draft.yml`，以固定 `version=1.0.4`、`confirmation=PREPARE_DRAFT_ONLY` 执行，不能发布公开版本；原有手动 `workflow_dispatch` 入口仍保留。

- 在 `main` 同一提交上重新执行固定依赖审计、三平台原生 Moonshine SDK/模型/Worker 验证、真实 Windows NSIS / macOS ARM64 DMG / Linux DEB+AppImage 打包和 Linux DEB apt 安装。
- 创建草稿之前还须核对三份清单：来源 SHA、workflow run 编号、精确文件名（Windows 是 `Voxnelo Setup 1.0.4.exe`）、安装包大小、SHA-256，以及未经批准的额外附件；遇到旧 tag/Release 必须拒绝覆盖。
- 全部成功时自动创建 **draft=true、prerelease=true 的私有 v1.0.4 Release Draft**，并只附带五个免签名安装包与三份摘要清单；不使用 `gh release publish`、`--latest` 或自动公开事件。
- 如果失败，先修复并再次通过 PR/CI；**不得修改旧版公开附件、跳过原生校验或用其他提交的 ZIP 冒充新提交候选**。若之后需要重新构建，手动启动原有工作流，且其拒绝覆盖已有 tag/Release。
- 本动作仅授权创建内部草稿供检查，**不表示模型/SDK 许可已通过法律复核**，也不能把合成 PCM 结果当作真人麦克风 WER、录音权限/拔插实测或完整 F001–F012 证据。是否公开发布由维护者另行明确决定；免签名风险需持续披露。

## v1.0.4 私有草稿已创建：历史校验修复记录（工作流已退役）

[Actions 41019525418](https://github.com/kunlong-luo/voxnelo/actions/runs/41019525418) 已在 2026-10-30 成功创建 v1.0.4 **未公开草稿**（Release ID `428750217`，8 个附件，来源 commit `4aeb58e`）。Linux/Windows/macOS 原生 Moonshine SDK/模型/Worker、三平台免签名安装包、Linux DEB apt 实装与候选字节 SHA-256 检查均通过。**这仍然不是公开发布批准**。

GitHub Release 上传时把 Windows 安装包 `Voxnelo Setup 1.0.4.exe` 自动显示为 `Voxnelo.Setup.1.0.4.exe`，但不会同步修改原本的 `SHA256SUMS-win32.txt` 内容。为避免用户拿到无法按文件名校验的清单，修复流程分两部分：

- 新版本私有草稿流程在上传前将 Windows 文件名规范化成与 GitHub 最终存储一致的点号，并从**已验证的原始字节**重新生成匹配的 Windows SHA-256 清单。
- 对已经生成的 v1.0.4 私有草稿，当时新增 [已归档的一次性校验修复入口](../archive/workflows/repair-v1.0.4-private-draft-win-checksum-once.yml)。首次尝试的 [Actions 41020523396](https://github.com/kunlong-luo/voxnelo/actions/runs/41020523396) 因为草稿**尚未有正式 Git tag**，通过 `releases/tags/v1.0.4` 查询返回 404，未触及任何附件。修正后的流程改用精确 Release ID `428750217` 读取草稿和各附件的 ID，再通过 GitHub Assets API 下载校验、临时上传新清单、替换原 Windows 清单；上传时只处理私有 Draft。只有核对 Release ID、源提交、仍为 Draft、全部 8 个预期附件且真实下载 EXE 的哈希与原始清单一致，才允许**只替换 `SHA256SUMS-win32.txt`**；不替换 EXE、不修改历史公开 Release，不创建/发布任何新版本。已修复时直接安全退出。工作流是否执行成功、更新后的清单是否通过验证，应以 Actions 与 GitHub Release API 的实际结果为准。

**2026-11-21 清理说明：**上述两个一次性写权限 workflow 已移出 `.github/workflows/` 并原样保存在 [归档索引](../archive/README.md)，不能再经 GitHub Actions 手动执行或因改动文件而自动执行。Git 历史、现存 v1.0.4 私有草稿及其八项附件均保留；本次仅核对其草稿状态与资产清单，不冒称重新核验了所有 SHA-256 或执行了许可/人工验收。需要新的草稿修复请重新审核新流程，不能复活旧的一次性修复脚本。

## 后续新版本、草稿和额外的签名通道

新版本应先以 PR 更新源码版本、锁文件、发行说明并通过 CI，再为**未使用的新版本号**建立独立的发布流程。`.github/workflows/release-draft.yml` 可通过 **Actions → Prepare GitHub release draft → Run workflow** 使用 `version` 及 `PREPARE_DRAFT_ONLY` 创建内部草稿；**已有 Draft/Release/tag 不允许覆盖**，草稿不会公开。

**2026-11-22 发布安全收口：** 当前 v1.0.4 私有 Draft（ID `428750217`）确实存在，GitHub 的 `GET /releases/tags/v1.0.4` 与 Git tag 查询却可同时返回 404，因为私有 Draft 尚未有公开可查询的标签。因此单独使用 `gh release view` 或按标签 API 的 404 **不能**证明版本号空闲。工作流已在任何原生模型下载和三平台安装包构建前，以只读 `contents: read` 权限遍历认证的 Release 列表（包含私有 Draft），再查询 Git tag。已有任意同名项、API 权限不足、异常响应或枚举超出上限都按失败处理；最终发布写操作前再复查一次。检测到占用将提前停止，不删除/替换旧私有草稿或公开发行资产。已经存在的 v1.0.4 Draft 仍是旧源码候选，不能当成新 `main` 的测试产物。

以后若维护者自愿采用 Authenticode 签名、Developer ID 公证和更严格的独立人工验收，可选用 [签名候选流程](SIGNED-CANDIDATE-SETUP.md) 与 [认证级门禁](STABLE-RELEASE-READINESS.md)。它们仍严格 fail closed，但不是已公开、明确披露 unsigned 风险的 v1.0.3（及历史 v1.0.0） 的先决条件。

**Publish release** 必须由授权维护者核对最终安装包、SHA-256、支持的系统与发行限制后明确操作。不能因 CI 绿灯就声称版权、独立审校、真实麦克风或所有 F001–F012 已通过。SHA-256 校验完整性，不能证明开发者身份或 Apple 公证。

详见 [发布运维](RELEASE-OPERATIONS.md)、[原始 PRD 验收矩阵](V0.1-ACCEPTANCE-MATRIX.md)、[用户指南](../USER-GUIDE.md)、[v1.0.3 发行说明](../release-notes/v1.0.3.md)。
