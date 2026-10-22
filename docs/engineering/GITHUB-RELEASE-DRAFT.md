# Voxnelo GitHub 发布流程：草稿、公开预览与稳定版

**当前公开版本：v0.1.6 Early Access（Linux / Windows / macOS，全部安装包未签名，macOS 未公证）。** 请查看 [最新 Release](https://github.com/kunlong-luo/voxnelo/releases/tag/v0.1.6) 和 [当前 Release 运维说明](RELEASE-OPERATIONS.md)。此前 v0.1.5 只公开了 Linux 安装包，其标签和历史附件保持不变。

## 自动发布 Early Access

一次性的 `.github/workflows/publish-all-v0.1.6.yml` 只有当该工作流文件首次合并到 `main` 时才会触发，不监听常规 tag 或源码提交。它分别在 Ubuntu、Windows、macOS 生成安装包、校验身份/版本/真实文件大小及三个 SHA-256 清单，并在 Ubuntu 通过 apt 实际安装。所有 job 通过、复核公开发布说明且确认没有同名 tag 或 Release 后，才执行公开 `--prerelease`。已存在的发行版或标签不得覆盖。

## 仅供内部审核的手动草稿

`.github/workflows/release-draft.yml` 仍然保留 **Actions → Prepare GitHub release draft → Run workflow** 的 `workflow_dispatch` 流程。它使用 `version` 和 `PREPARE_DRAFT_ONLY` 明确表示**只生成 Draft**，自动安装包不会因此公开。草稿本身可能创建同名 tag，所以已有正式公开版本（例如 v0.1.6）绝不可重复用此流程覆盖；若需要更新版本，先更新源码版本、AppStream、发行说明和验收门槛后再触发。

**Publish release** 是明确的维护者公开发布动作，不能用 CI 绿灯自动声称完成 F001–F012、内容授权、真实麦克风及 Windows/macOS 实机验收。

## 下载和安全告知

v0.1.6 发布页的 Linux `.deb` / `.AppImage`、Windows NSIS `.exe`、macOS `.dmg` 必须全部来自同一个 `main` 合并 SHA，所有文件与 `SHA256SUMS-linux.txt` / `-win32.txt` / `-darwin.txt` 匹配。该构建是 unsigned candidate 的公开 Early Access 分发，尚无 Apple 公证或受信任的数字签名。**SHA-256 完整性不能证明代码签名或受法律认证。** Mac/Windows 离线 Moonshine 原生支持尚不能据此宣称可用。

详见 [发布运维细则](RELEASE-OPERATIONS.md)、[V0.1 验收矩阵](V0.1-ACCEPTANCE-MATRIX.md)、[用户指南](../USER-GUIDE.md)。
