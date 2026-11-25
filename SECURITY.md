# Security Policy

## 支持的版本

| 版本 | 支持状态 |
| --- | --- |
| 1.0.x（当前正式免签名版） | 优先处理安全问题，无修复时间 SLA |
| 0.1.x（历史 Early Access） | 历史下载保留，安全修复不保证回移植；建议升级当前发行版 |

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
- **当前 v1.0.3 是正式公开但未签名的桌面发行版**：Linux DEB/AppImage、Windows NSIS EXE、macOS ARM64 DMG 均未签名，macOS 未公证。官方发布不代表取得外部安全认证或设备全面兼容认证；SmartScreen、Gatekeeper 等可能警告或阻止安装。请仅使用项目官方 [v1.0.3 Release](https://github.com/kunlong-luo/voxnelo/releases/tag/v1.0.3) 并核对 SHA-256；摘要不能替代发布者数字签名。v1.0.0/v1.0.1/v1.0.2 已作为历史正式版本保留；v0.1.5/v0.1.6 属历史预览版，v0.1.7 仍是私有草稿。
- 学习记录为本机明文存储，设备共享/丢失场景下无额外保护。

## 录音设备异常清理

录音默认保留在当前练习会话的临时 Blob URL 中。若麦克风在切句、
权限异常或窗口卸载期间断开，程序应停止媒体音轨并丢弃过期的
MediaRecorder 回调；不生成旧句录音或记为已完成。对应自动化用例：
`tests/use-recorder.test.tsx`。这些测试不替代真实设备拔插与权限验收。

## 依赖安全审计

`.github/workflows/security-dependency-audit.yml` 会在 Python 安装器或
pnpm 锁文件变更的 PR，以及每周定时任务中执行安全告警扫描。生产和开发／测试依赖的 High/Critical 告警均会阻断 CI；[Issue #138](https://github.com/kunlong-luo/voxnelo/issues/138) 记录了将 Vitest 3 升级至 Vitest 4、修复历史 tinypool/glob 高危依赖的过程。Python
侧固定 Moonshine SDK 版本后实际解析其传递依赖，再用 pip-audit 检查
公开漏洞数据库；JavaScript 侧用 pnpm audit 检查锁文件。扫描有结果不代表
原生 wheel 的完整来源、所有许可或恶意代码风险已得到认证。发现告警后
需保留日志、升级和回归测试，不可仅通过忽略告警来合并。

## 报告漏洞

请通过项目的安全报告渠道或 GitHub Issues 报告问题，附复现步骤与影响范围；不要在公开 Issue 附上令牌、私人录音、完整设备标识或可利用的敏感信息。公开披露前请预留合理修复时间。


## GitHub Actions direct dependency pinning — 2026-11-25

Reviewed all 14 live workflow files at source `a4f1e4faec9bff23e14b2a64b35e701a64ea6afd`. Found 26 direct external uses entries in 13 files referring to mutable major-version tags. Resolved each of the five tags through its official GitHub repository refs API to a commit object (not a tag object). Proposed replacement uses the exact 40-character commit, retaining the previous major version as a comment:

| Action / prior tag | Resolved official commit |
| --- | --- |
| actions/upload-artifact@v7 | [cf430e030ddbb5b0abf93d22962f4752f3646cd9](https://github.com/actions/upload-artifact/commit/cf430e030ddbb5b0abf93d22962f4752f3646cd9) |
| actions/download-artifact@v8 | [9000827ccba6bdab643e8b6fd33ac0654aef8333](https://github.com/actions/download-artifact/commit/9000827ccba6bdab643e8b6fd33ac0654aef8333) |
| actions/configure-pages@v6 | [45bfe0192ca1faeb007ade9deae92b16b8254a0d](https://github.com/actions/configure-pages/commit/45bfe0192ca1faeb007ade9deae92b16b8254a0d) |
| actions/upload-pages-artifact@v5 | [fc324d3547104276b827a68afc52ff2a11cc49c9](https://github.com/actions/upload-pages-artifact/commit/fc324d3547104276b827a68afc52ff2a11cc49c9) |
| actions/deploy-pages@v5 | [368f82528645a54fb793d4d04e342629a3f51346](https://github.com/actions/deploy-pages/commit/368f82528645a54fb793d4d04e342629a3f51346) |

The other direct external entries already used full commit hashes; local reusable workflows remain local. Reviewed actual upload-pages-artifact action.yml at the pinned commit: its nested upload-artifact reference is itself pinned (bbbca2ddaa5d8feaa63e36b76fdaad77386f024f, v7.0.0). This is not an exhaustive transitive action/runner/download audit or a claim that pinned code is vulnerability-free. The regression scans direct uses entries in the active YAML files using the repository's current block-style convention, not a full YAML parser. Archived historical workflows are intentionally unchanged. No triggers, token permissions, build commands, release flags, dependencies or production runtime changed; existing scoped workflow triggers may run the relevant security/native checks because their own files changed. Manual release writers remain manual only. Do not rebuild or publish the selected installer solely because of this change.


最近一次已核实的 main 定时供应链审计 [45257208260](https://github.com/kunlong-luo/voxnelo/actions/runs/45257208260)（2026-11-23）成功；另核实 [45395086206](https://github.com/kunlong-luo/voxnelo/actions/runs/45395086206) 的 Python 版本告警扫描及 pnpm 生产/完整依赖 High/Critical 门禁步骤均成功。历史通过不证明今日无新告警；本轮固定 Action 引用的 PR 尚待自身 CI。Python 安全扫描使用约束解析的实际环境，不等同于三平台原始 Wheel 哈希及全部原生库 CVE/许可审核。
