# ADR-0002：图标、签名与更新策略

- Status: Accepted
- Date: 2026-10-15

## Context

V0.1 打包配置（`package.json` 的 `build` 段）此前无图标、无签名、无更新机制；
`docs/12-工程实施与交付边界.md` 要求发布前完成“来源许可、图标、应用签名”复核。
现状约束：开发机为 Linux，无 Apple Developer 证书与 Windows 代码签名证书，
无 `.icns`/`.ico` 转换工具链，无更新服务器。

## Decision

1. **图标**：`build/icon.png`（512x512，深底白 V，与主题色 `#0d121d` 一致）作为
   Linux 图标并接线到 electron-builder；mac（`.icns`）与 Windows（`.ico`）图标
   待在对应平台生成后补齐，不虚配不存在的文件。
2. **签名**：V0.1 不签名。mac 公证（notarization）与 Windows 签名需在发版机上
   持有证书后配置，届时以新的 ADR 修订；未签名包仅用于内部验证分发。
3. **更新**：V0.1 不接入 `electron-updater`（无更新服务器可指）。V1.0 公开分发前
   评估自建更新源或平台商店方案，另立 ADR。

## Consequences

- `pnpm pack:linux` 产物带图标；mac/Windows 包仍为默认图标且未签名，不得公开分发。
- 无自动更新意味着安全补丁只能靠用户手动下载新包——`SECURITY.md` 已据此写明。

## 2026-10-22 发布策略补充（Early Access 例外，不改变稳定版要求）

v0.1.5 已作为公开 Linux Early Access 提供未签名安装件。v0.1.6 进一步在项目 GitHub Releases 明确以 **公开预览版（Early Access / prerelease）** 分发 Linux、Windows 和 macOS 未签名安装包，macOS 也未公证。以上均在下载页/发行说明中明示风险，附 SHA-256 校验清单，并不声称开发者身份经签名认证，也不属于已通过所有 F001–F012 验收的稳定发行版。此前“未签名包仅内部验证”的约束继续适用于**稳定/受认证发行**，对已经明确披露风险的自愿 Early Access 进行例外管理。

稳定公开版仍以 Windows 代码签名、Apple 签名/公证、系统权限实测、隐私与依赖许可复核为上线要求；没有证书或人工验收记录时不得宣传已达成。
