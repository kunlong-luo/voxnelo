# Voxnelo 可选签名/认证级发布门禁（默认 BLOCKED）

**当前最新公开版是 [v1.0.3 免签名正式版](https://github.com/kunlong-luo/voxnelo/releases/tag/v1.0.3)**（2026-10-25 已公开，`draft=false` / `prerelease=false`；历史 v1.0.0 仍完整保留）。安装包未签名、macOS 未公证；这是维护者明确授权的官方免签名发行决定，**不是**经过数字签名、外部安全认证、教学审校或所有真实硬件验收的发行版。详见 [发行者决定](../release/UNSIGNED-V1-OWNER-DECISION.md)。

以下 `stable-readiness.yml` 是未来**选择实施受信任签名与公证、并有完整真实审批证据时**额外使用的认证级门禁；不会倒推否认已经真实发布的 unsigned v1.0.0。其自身签名/验收要求继续严格 fail closed，不得伪造任何人工审校结果。

## 两层必须独立满足的条件

1. 人工与许可：依照示例 docs/release/stable-evidence.example.json，在 docs/release/stable-approval/vX.Y.Z.json 为 F001–F012、内容与参考音频版权、麦克风隐私、Linux/Windows/macOS 真机、Moonshine 许可和噪声精度、UI/无障碍、升级数据保留、发布者签名身份分别提供独立审核人、日期和 HTTPS 证据。至少五位不同的英语初学者完成闭环测试。绝不上传私密录音、密钥、个人路径或设备 ID。
2. 包与原生签名：先建立包含真正签名且已公证附件的私有 Release Draft（当前 release-draft 流水线生成的 unsigned 安装件不能替代）。签名之后重算三个 SHA256SUMS 清单，并记录最终字节 SHA256。审核记录还必须包含 `signingIdentity.windowsCertificateSha1`（受信任发布证书的 40 位 SHA-1 指纹，不是私钥）与 `signingIdentity.appleTeamId`（Apple 10 位 Team ID）。stable-readiness.yml 先通过 GitHub API 读取**未发布 Draft 的 `target_commitish` 完整 SHA**，与审核记录 `sourceCommit` 精确比对并要求该提交在 `main` 历史中；如果提前存在同名 Git tag，还会核验 tag 指向相同的源码提交。GitHub Draft 在正式发布前可能尚无真实 tag，不能因此错误阻断或擅自提前发布。通过这一步后才只读下载实际附件并复核 SHA-256。Windows Runner **再次核对重新下载 EXE 的 SHA-256**，再确认 Get-AuthenticodeSignature 为 Valid、受信任时间戳及证书指纹一致；macOS Runner **再次核对重新下载 DMG 的 SHA-256**，再检查 DMG 与 App stapler、严格 codesign、spctl Gatekeeper、指定 Team ID 以及真实 bundle ID `app.voxnelo.desktop`。即使 Draft 在审核与原生 Runner 执行之间被更换，也不能通过。Linux 发行包亦必须与证据及摘要一致。
3. GitHub Actions 选择 Validate Stable readiness (NEVER publish)，在 main 输入版本及 VERIFY_STABLE_READINESS_ONLY。找不到审核记录、未签名、公证失败或哈希不一致，就失败。该工作流绝不创建、更改、发布或覆盖任何 GitHub Release。

## 需要发布者提供而不能由程序凭空完成

- 合法 Windows Authenticode 证书/受信任签名服务及私钥保管。
- Apple Developer ID 证书、Hardened Runtime/entitlements、notarytool 公证与 stapler。
- 全部 F001–F012 实机验收、五位用户独立测试、教学内容/音频/模型权利来源审查。
- 为 Issue #38、#45、#55、#123、#141 补充脱敏证据并逐条完成验收。原始冻结 PRD 不被修改。
- 发布前由维护者再审核这一批真实证据，单独批准公开 Stable 发布。测试脚本的合成通过 fixture 不构成实际验收。

现阶段签名及认证级 Stable 审批证据缺失；维护者已于 2026-10-25 确认所需人工测试通过，但这不等于已通过多名独立审核、签名与公证或可公开复算的声学指标。它不等于已公开免签名 v1.0.3（及历史 v1.0.0）尚未发行。
