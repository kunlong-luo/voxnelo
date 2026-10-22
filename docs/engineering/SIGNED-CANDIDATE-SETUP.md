# Voxnelo — 真实签名候选构建（默认 BLOCKED）

本流程仅供未来**尚未使用的新版本**制作签名候选，不替换已存在的 `v0.1.7` 未签名私有 Draft。流程 `.github/workflows/signed-candidate.yml` 仅由仓库维护者手动运行，在 GitHub Actions 上传短期 QA 附件，不创建标签、Draft、公开发布或 Stable。其源代码/版本必须匹配手动指定的完整 40 位 `main` 提交 SHA。

## 1. 发布者必须亲自完成 GitHub 环境保护

打开仓库 **Settings → Environments**，创建 `stable-signing`。限制可部署的分支为 `main`，设置 **Required reviewers**，确保签名密钥只有在维护者批准后才交给原生 GitHub Runner。还需核对执行环境所需的组织权限和配额。本环境是否存在、证书是否已就绪均**尚未被证实**；不要在未配置保护规则时执行工作流。

配置仅属于该环境的 **Environment secrets**（不能发到聊天、Issue、仓库、CI 日志）：

- `WIN_CSC_LINK`：合法可导出的 Windows OV PFX 文件的 base64；`WIN_CSC_KEY_PASSWORD`：对应密码。使用 EV 硬件令牌或企业 HSM 时不可导出私钥，本 PFX 流程**不适用**，应单独审核签名服务集成。
- `MAC_CSC_LINK`：Apple Developer ID Application 签名证书的 p12 base64；`MAC_CSC_KEY_PASSWORD`：对应密码。
- `APPLE_ID`：用于 Apple Developer Program 的 Apple ID；`APPLE_APP_SPECIFIC_PASSWORD`：其**应用专用密码**（不是账号登录密码）。

配置经审核的 **Environment variables**（可公开的身份信息，不是密钥）：

- `STABLE_WIN_CERT_SHA1`：真实签名证书的 40 位大写 SHA-1 thumbprint。
- `STABLE_APPLE_TEAM_ID`：真实 Apple Developer 的 10 位 Team ID。

只有取得合法证书、真实发布者权限与上述环境配置后，才可运行 `Actions → Signed QA candidates (never publish) → Run workflow`。填写尚未被 GitHub Release/tag 使用的新版本、与 `main` 一致的完整 `expected_commit`、确认语 `BUILD_SIGNED_QA_ONLY`。已有 `v0.1.7` Draft 必须保持原样，不能重复签名或覆盖该标签。

## 2. 运行后自动执行的安全验证

- Windows x64：强制 frozen lockfile、安全审计（含开发依赖）、typecheck、单元测试、ASR staging 检查。使用环境证书签 NSIS；对最终 EXE 执行 Windows `Get-AuthenticodeSignature`，状态必须 `Valid`，证书指纹一致且带时间戳；最后重新计算 SHA-256。
- macOS arm64：同样执行安全检查，在 Hardened Runtime 下签名，采用仅限此签名流程的 JIT/麦克风 entitlements。electron-builder 26 完成 App notarization 后验证 `codesign`、`stapler`、`spctl`、Team ID、Bundle ID；对**最终 DMG**另外执行 `xcrun notarytool submit --wait` 并 `stapler staple`，之后才计算 SHA-256。若 Apple 拒绝公证就失败，不允许回退为 unsigned。
- 上传经原生签名验证的安装包及摘要到私有控制下的 **Actions Artifacts（7 天）**，不得把单次成功说成跨平台实机验收，也不得在没有正式批准时公开分发。

## 3. 从签名候选走向 Stable

这些仅是**签名/公证候选构建能力**。下一步应在**同一源码提交与版本**下准备 Linux 经验证安装包，并由审核人归档所有 F001–F012、课程内容/音频/模型再分发许可、真机麦克风与断连测试、五名初学者体验及升级历史。仅在最终字节正确归档到独立**私有 signed Draft** 并符合 `docs/release/stable-approval/vX.Y.Z.json` 后，才运行只读 `stable-readiness.yml`。任何缺失继续阻断公开 Stable。

**重要：** 当前这些证书、真实设备和法律验收并未获得验证。增加流程不意味着已经成功签名或公证。macOS entitlements 仍须在真实设备上验证麦克风/系统对话可用性；如果发生签名 API 变更，应先在安全隔离候选环境调试，不要在未审核的 PR 环境暴露证书。

文档依据 electron-builder **v26** 的 [macOS notarization](https://www.electron.build/v26/docs/notarization/) 与 [Windows signing](https://www.electron.build/v26/docs/features/code-signing/code-signing-win/)。
