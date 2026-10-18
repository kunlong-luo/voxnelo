# Voxnelo — GitHub Release 草稿准备流程（当前 0.1.5）

此流程用于**准备待人工审核的 GitHub Release 草稿和真实安装包附件**，不是自动批准公开发布。

## 当前事实

- 源码版本：`0.1.5`，有通过的 `main` CI；仓库此前尚未创建公开 GitHub Release。
- `.github/workflows/release.yml` 的 `Desktop release candidate` 只产生 Actions Artifacts，不创建 GitHub Release，权限为 `contents: read`。
- 新增 `.github/workflows/release-draft.yml` 可从 `main` 手动生成 Linux DEB/AppImage、Windows NSIS EXE、macOS DMG，验证原始字节和 SHA-256，并在同一次运行中生成 **Draft + prerelease** GitHub Release。
- 所有安装包是**未签名候选件**，不是已完成设备验收的正式安装器。工作流只允许人工触发，无 tag/push 自动发布路径。

## 如何先生成仅供内部验证的候选包（不创建 tag / Release）

仓库 → **Actions → Desktop release candidate → Run workflow**，选择 `main`。成功后分别下载 Linux/Windows/macOS 的候选 artifacts，按 `SHA256SUMS-<platform>.txt` 核对。Artifacts 有过期时间，这一流程不改变公开 Release 页面。

## 如何准备 GitHub Release 私有草稿

1. 确认 `main` CI 绿色、没有尚未合并的发布修复，`package.json` 与 `docs/release-notes/v0.1.5.md` 版本一致。
2. 在 **Actions → Prepare GitHub release draft → Run workflow**，选择 **main**，填入：
   - `version`：`0.1.5`
   - `confirmation`：`PREPARE_DRAFT_ONLY`
3. 工作流独立构建三个操作系统的候选安装器，分别完成 TypeScript 类型检查、单测、打包校验。Linux 还进行实际 `apt` 安装；产物 SHA-256 与候选清单必须全部校验通过。
4. 成功后，在 **Releases → Draft** 中检查 Linux `Voxnelo.deb`、标准版本 DEB、AppImage、Windows EXE、macOS DMG 和三平台校验文件。只有 Draft 编辑者能查看草稿附件；**不要当成用户现已可下载的公开版本**。
5. 工作流使用 `gh release create --draft --prerelease`，因此可能创建公共可见的版本 tag；虽然 Release 草稿并不公开，若不希望出现 tag，应只运行上一节的 candidate workflow。
6. 若 `v0.1.5` 的 Release 或 tag 已存在，流程会拒绝覆盖；不要删除现有 tag/Release 来强制重试，先人工调查。

## 草稿转为公开 Early Access 的人工门禁

在发布页点击 **Publish release** **之前**，必须根据项目冻结 PRD 留存：

- F001–F012 的实际验收证据，包括真实麦克风录音回听、权限拒绝、切句清理、数据重启持久化以及可访问性；不允许以模拟 CI 测试替代。
- 40 条短句的人工教学审校、文本/音频来源和再分发许可审查结果。
- 主要对外支持的桌面平台上真实安装包启动/音频/权限结果；macOS、Windows 未签名的限制须如实说明，不能自动声称官方签名。
- 至少 5 位目标英语初学者完成核心跟读闭环的反馈记录、隐私及品牌确认。
- 若仍未捆绑经过审核的 ASR 原生引擎，公开说明标准包的实时听写不可用，不能宣称自带 AI 识别或专业发音评分。

上述仍有阻断项时**保持 Draft，不向外部发布**。这条工作流不会自行点击 Publish，也不会把 Release Draft 直接变为公开正式版。

## 安装包和文案一致性

README 与每个版本对应的 `docs/release-notes/v<version>.md` 必须只描述**当前版本已实现**的功能；新增功能必须先有源码与测试。发布新版本时更新这些内容，再触发草稿工作流。具体版本号不是由 GitHub Release UI 猜测，而是来自 `package.json` 和 `docs/release-notes/v<version>.md` 的严格一致性门禁。

相关文档：[V0.1 验收追踪矩阵](V0.1-ACCEPTANCE-MATRIX.md)、[候选构建操作手册](V0.1-RC-PLAYBOOK.md)、[0.1.5 Linux 实测清单](V0.1.5-LOCAL-DEVICE-QA.md)。
