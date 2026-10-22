# Security Policy

## 支持的版本

| 版本                  | 支持状态                 |
| --------------------- | ------------------------ |
| 0.1.x（Early Access） | 接受安全问题报告，无 SLA |

## 架构假设（与实现一致）

- 本地优先、无账号、无后端、无遥测：学习记录存于本机 IndexedDB（明文），
  录音为临时 Blob URL，切句即销毁，不上传。
- 渲染进程加固：`sandbox: true`、`contextIsolation: true`、`nodeIntegration: false`、
  `webSecurity: true`；`voxnelo://app` 自定义协议带目录穿越守卫，仅放行受信导航；
  麦克风权限仅音频且仅受信源（见 `apps/desktop/main.ts` 与单测 `tests/security.test.ts`）。
- preload 暴露经类型限定的可信桌面能力（包括麦克风 ASR 会话/显式 Moonshine 安装 IPC），不会直接向渲染进程暴露 ipcRenderer、任意文件系统或 shell 命令接口。

## 已知限制

- **无自动更新**：安全补丁依赖用户手动下载新包（决策见
  `docs/ADR/ADR-0002-release-signing-update.md`）。请勿长期停留在旧版本。
- **公开的 Early Access 构建仍未签名**：v0.1.6 在 GitHub Releases 提供 Linux DEB/AppImage、Windows NSIS EXE、macOS DMG，全部未签名且 macOS 未公证。它们是明确标识的公开预览件，不是已完成安全审计或正式数字签名的稳定发行包。请仅使用项目官方 Releases 并核对 SHA-256；摘要不能替代开发者身份签名。
- 学习记录为本机明文存储，设备共享/丢失场景下无额外保护。

## 依赖安全审计

`.github/workflows/security-dependency-audit.yml` 会在 Python 安装器或
pnpm 锁文件变更的 PR，以及每周定时任务中执行安全告警扫描。生产依赖 High/Critical 报警会阻断检查；测试/开发工具中的已知告警仍作为显式警告保留，并由 [Issue #138](https://github.com/kunlong-luo/voxnelo/issues/138) 跟进，尚未完成修复。Python
侧固定 Moonshine SDK 版本后实际解析其传递依赖，再用 pip-audit 检查
公开漏洞数据库；JavaScript 侧用 pnpm audit 检查锁文件。扫描有结果不代表
原生 wheel 的完整来源、所有许可或恶意代码风险已得到认证。发现告警后
需保留日志、升级和回归测试，不可仅通过忽略告警来合并。

## 报告漏洞

请通过项目的安全报告渠道或 GitHub Issues 报告问题，附复现步骤与影响范围；不要在公开 Issue 附上令牌、私人录音、完整设备标识或可利用的敏感信息。公开披露前请预留合理修复时间。
