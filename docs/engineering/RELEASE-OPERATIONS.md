# Voxnelo 当前发布运维与历史平台包校验

## 当前公开发行（v1.0.2）

最新官方版是 [v1.0.2 免签名正式维护版](https://github.com/kunlong-luo/voxnelo/releases/tag/v1.0.2)，已于 2026-10-24 公开，`draft=false`、`prerelease=false`，也是 GitHub Latest Release。其 [正式发布流水线](https://github.com/kunlong-luo/voxnelo/actions/runs/40103037891) 全部成功：同一源码提交 `4926829094ea67b8a233bd3c41cb393719ee8aaf` 在 Linux/Windows/macOS 原生 Runner 构建，执行严格依赖审计、版本/测试/包校验与 SHA-256，Linux DEB 完成实际 apt 安装。公开发布页有 5 个安装包（含两个字节一致的 DEB 别名）和 3 个 SHA-256 清单，共 8 个附件。

**发行范围：** Linux x64 DEB/AppImage、Windows x64 NSIS EXE、macOS ARM64 DMG。**全部未签名，macOS 未公证**；SmartScreen / Smart App Control 或 Gatekeeper 可能阻止运行。Linux Moonshine 需要用户主动单独安装模型，Windows/macOS 不承诺相同离线引擎。F001–F012 实体设备、模型/内容权利和至少五位初学者独立审核还没有完整通过证据。详见 [v1.0.2 发行说明](../release-notes/v1.0.2.md) 和 [发行者免签名决定](../release/UNSIGNED-V1-OWNER-DECISION.md)。

## 不可变的已发布版本

- v1.0.2：**当前公开正式版**，禁止重新创建、覆盖或换掉原有安装包/标签。
- v1.0.1：历史正式维护版，原标签、8 个已发布附件与 SHA-256 均保留，不覆盖。[原始成功发行流水线](https://github.com/kunlong-luo/voxnelo/actions/runs/40071198560) 及原发行源码提交 `3404f5d2893939e2dba2ef71cbed13f948f85c4c` 保持可追溯。
- v1.0.0：历史正式版，继续保留原标签与安装包；不做原位覆盖。
- v0.1.7：旧版本的**私有 Draft**，11 个附件，**尚未公开**，不是当前下载版。
- v0.1.5/v0.1.6：原 Early Access 公开历史版，不覆盖原有标签或安装件。

已完成的一次性 workflow `publish-linux-v0.1.5.yml`、`publish-all-v0.1.6.yml`、`prepare-v0.1.7-draft-once.yml`、`publish-all-v1.0.0.yml`、`publish-all-v1.0.1.yml`、`publish-all-v1.0.2.yml` 均退役为仅保留代码的历史记录：没有 push 自动触发，首个实际作业永远禁用（`if: false`）。防止 GitHub Actions 依赖更新后重新触发旧版本、制造红色运行或越权覆盖发行附件。

## 未来发布需要做的验证

1. 新版本号和发行说明经 PR 审核，固定源码提交，在 Linux/Windows/macOS Runner 构建，验证产品版本、实际安装器大小和 SHA-256。
2. 使用相同的来源版本验证 Linux DEB apt 安装、Windows NSIS 安装卸载以及 macOS DMG 架构与系统限制，确保保留旧学习数据。
3. 真实设备测试系统麦克风请求/拒绝、录音停止/回听、切句与拔插、重启后的收藏历史、TTS、主题与 125%/150% DPI；Linux 另外测 Moonshine 安装和安静/噪音条件下的识别表现。不得用 mock CI 冒充真实 QA。
4. 按 [F001–F012 验收矩阵](V0.1-ACCEPTANCE-MATRIX.md)、[内容审校](V0.1-CONTENT-REVIEW.md) 和 [ASR 权利门禁](ASR-PUBLIC-RELEASE-GATE.md) 填写真正的脱敏审核证据。
5. 若选择未来发布真实签名、公证且完整审校的增强版本，再执行额外的 [认证级签名门禁](STABLE-RELEASE-READINESS.md)。这一**可选额外门禁不是 v1.0.x 免签名官方发布的历史先决条件**。

完整安装/使用说明见 [用户指南](../USER-GUIDE.md)，操作历史和旧版本发布纪律见 [GitHub Release 指南](GITHUB-RELEASE-DRAFT.md)。
