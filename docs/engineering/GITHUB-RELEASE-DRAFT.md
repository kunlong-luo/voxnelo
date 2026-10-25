# Voxnelo GitHub 发行版与历史草稿

## 当前官方发行版（核对日期 2026-10-25）

- **[v1.0.3 官方免签名正式版](https://github.com/kunlong-luo/voxnelo/releases/tag/v1.0.3)**：公开、非 prerelease（`draft=false` / `prerelease=false`），Linux x64 DEB/AppImage、Windows x64 EXE、macOS ARM64 DMG 和三个 SHA-256 摘要清单共八个附件。2026-10-25 发布，安装包**未签名**、macOS **未公证**；维护者确认同轮人工测试通过，不能自动推断已有定量声学测评/完整独立审校/签名/全部 OS 原生 Moonshine。
- **v1.0.0/v1.0.1/v1.0.2**：历史公开正式版，原 Release、标签与二进制附件不覆盖。
- **v0.1.7**：包含 11 个附件的**未公开历史 Draft**，不是当前下载版本，也不应重新执行草稿或把其旧附件改为 v1.0.0。
- v0.1.5/v0.1.6：历史公开 Early Access，仍保留原标签与安装包。

## 已完成的一次性发布（全部退役）

历史的 `publish-linux-v0.1.5.yml`、`publish-all-v0.1.6.yml`、`prepare-v0.1.7-draft-once.yml` 、`publish-all-v1.0.0.yml`、`publish-all-v1.0.1.yml`、`publish-all-v1.0.2.yml` 和 `publish-all-v1.0.3.yml` 均已完成各自任务。它们保留审计用脚本，但**不再监听任何 push**，其前置作业永久 `if: false`。不允许 Dependabot 修改触发重跑，也不可重建或覆盖已有标签、Release 或二进制附件。

v1.0.0 公开发行真实 [Actions 运行](https://github.com/kunlong-luo/voxnelo/actions/runs/39974884072) 成功，三平台安装包、Linux apt 实装、版本与 SHA-256 等自动门禁通过；但不会自动形成五名用户、F001–F012、第三方模型权利或各设备麦克风测试的真实证据。

## 后续新版本、草稿和额外的签名通道

新版本应先以 PR 更新源码版本、锁文件、发行说明并通过 CI，再为**未使用的新版本号**建立独立的发布流程。`.github/workflows/release-draft.yml` 可通过 **Actions → Prepare GitHub release draft → Run workflow** 使用 `version` 及 `PREPARE_DRAFT_ONLY` 创建内部草稿；**已有 Draft/Release/tag 不允许覆盖**，草稿不会公开。

以后若维护者自愿采用 Authenticode 签名、Developer ID 公证和更严格的独立人工验收，可选用 [签名候选流程](SIGNED-CANDIDATE-SETUP.md) 与 [认证级门禁](STABLE-RELEASE-READINESS.md)。它们仍严格 fail closed，但不是已公开、明确披露 unsigned 风险的 v1.0.3（及历史 v1.0.0） 的先决条件。

**Publish release** 必须由授权维护者核对最终安装包、SHA-256、支持的系统与发行限制后明确操作。不能因 CI 绿灯就声称版权、独立审校、真实麦克风或所有 F001–F012 已通过。SHA-256 校验完整性，不能证明开发者身份或 Apple 公证。

详见 [发布运维](RELEASE-OPERATIONS.md)、[原始 PRD 验收矩阵](V0.1-ACCEPTANCE-MATRIX.md)、[用户指南](../USER-GUIDE.md)、[v1.0.3 发行说明](../release-notes/v1.0.3.md)。
