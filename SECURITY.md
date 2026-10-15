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
- preload 仅暴露只读平台信息，不暴露 ipcRenderer、文件系统与 shell。

## 已知限制

- **无自动更新**：安全补丁依赖用户手动下载新包（决策见
  `docs/ADR/ADR-0002-release-signing-update.md`）。请勿长期停留在旧版本。
- **构建未签名**：当前产物无 Apple/Windows 签名与公证，仅用于内部验证，
  不得作为公开分发包。请从可信来源获取，并建议核对发布渠道。
- 学习记录为本机明文存储，设备共享/丢失场景下无额外保护。

## 报告漏洞

在项目仓库公开后，请通过 Issues 报告安全问题，附复现步骤与影响范围；
公开披露前请预留合理修复时间。仓库公开前，可通过项目维护者既有联系方式报告。
