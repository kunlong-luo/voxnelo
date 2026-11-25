# Voxnelo

**从一句英语开始，练习自信开口。**

[English](README.md) · **简体中文**

Voxnelo 是一款开源、本地优先的英语口语跟读桌面应用。听一句、自己读一句，再回听录音；不需要注册账号。

**源码版本：** `1.0.4`（尚未发布的候选源码） · **最新公开发行：** `v1.0.3` 正式免签名版 · **开发者：** Leo Luo · **许可证：** [MIT](LICENSE)

**维护者审核专用：** v1.0.4 仍处于发布冻结（HOLD）。当前选定的未签名审核构建为 [run 45578438677](https://github.com/kunlong-luo/voxnelo/actions/runs/45578438677)，源码 `e35cc3a`，不是公开发行版，也不是旧私有 Draft。当前门禁与精确候选实机测试步骤见[发布冻结页](docs/release/V1.0.4-RELEASE-FREEZE.md)和[实机证据台账](docs/release/V1.0.4-PHYSICAL-DEVICE-EVIDENCE.md)。旧版本基础使用确认不能替代本批安装文件验收。普通用户仍应从公开 Releases 页面下载。

## 已实现的基础功能

- **40 条入门短句 + 240 条待审校扩展草稿**：入门句包含中文翻译、话题、难度及 IPA 教学参考；扩展语料分场景提供文本/翻译，但标记为待审核、暂不提供未经核验的 IPA。总计 280 条，不应视为全部通过语言学或版权审核。
- **听示范、跟读**：使用系统英语语音（TTS）朗读，支持正常速度与慢速播放。
- **录音回听**：授权麦克风后录制自己的跟读，停止后可在当前练习中回听。
- **自由练习**：随时切换句子，或通过可搜索、按场景筛选的短句目录选择内容。
- **学习记录**：在本机查看练习历史、收藏和待复习标记；仅浏览句子不会被算作录音练习。
- **个性化界面**：支持中英文切换、北欧和日落双主题、音标显示及减少动态效果设置。

## 开始练习

1. 打开「练习」，播放当前英语短句的示范朗读。
2. 点击录音按钮，允许麦克风权限，朗读后停止并回听。
3. 换一句继续练习，或通过「收藏」「历史」「复习」找回短句。

示范朗读来自**操作系统的文字转语音（TTS）**，不是专业配音。能否朗读及能否离线播放取决于系统语音包。

## 全平台下载与安装

**正式公开的桌面安装包仍为免签名发行版，不表示经过发行者签名或 Apple 公证。** 从 [GitHub Releases 最新正式版](https://github.com/kunlong-luo/voxnelo/releases/latest) 下载，提供 Linux、Windows、macOS 的真正安装文件和独立的 SHA-256 清单。

| 平台 | 安装包 | 重要说明 |
| --- | --- | --- |
| Linux x64 | `Voxnelo.deb` / `voxnelo_1.0.3_amd64.deb`（内容相同）、`Voxnelo-1.0.3.AppImage` | Debian/Ubuntu/Pop!_OS 优先使用 DEB，AppImage 需相应的系统依赖 |
| Windows | NSIS `.exe` | **未数字签名**，SmartScreen 可能弹出警告；公开 v1.0.3 没有 Windows 原生 Moonshine 听写 |
| macOS | `.dmg` | **未签名、未通过苹果公证**，Gatekeeper 可能阻止启动；确认 DMG 与 Mac 芯片架构兼容 |

发布页提供 `SHA256SUMS-linux.txt`、`SHA256SUMS-win32.txt`、`SHA256SUMS-darwin.txt`。下载后请核对哈希；**SHA-256 只验证文件完整性，不替代开发者代码签名**。不要使用来路不明的第三方安装包。

Linux 已安装用户可正常升级，无需先卸载或清空学习记录：

```bash
sudo apt install ./Voxnelo.deb
```

更多操作步骤及 Windows/macOS 已知限制见 [用户帮助](docs/USER-GUIDE.md) 与 [1.0.3 发行说明](docs/release-notes/v1.0.3.md)。

## 实时听写与隐私

**Linux 默认使用 Moonshine Medium Streaming 进行本地实时英语听写。** 公开的 v1.0.3 在 Windows 和 macOS 只承诺基础学习、录音回听及相应打包检查；公开的 v1.0.3 **尚未接入**这两个平台的 Moonshine 本机推理。待发布 v1.0.4 源码已增加 Windows x64 / macOS 15+ Apple Silicon 的用户主动下载安装与本地推理能力，但不等于已有真人麦克风声学验收。 标准安装包不内置第三方模型或原生推理 SDK。首次使用请在应用「离线模型管理」页主动点击「安装 Moonshine 离线识别模型」，由应用下载安装固定版本的本机 SDK/模型并校验 SHA-256。首次安装需要网络、Python 3 + venv 和足够磁盘空间；公开 v1.0.3 仅支持 Linux x64，v1.0.4 候选源码另外面向 Windows x64 和 macOS 15+ ARM64；之后在本机识别，不自动切换回 Zipformer。维护者于 2026-10-25 确认的是历史版本的基础使用；最新 v1.0.4 精确候选的真人麦克风验收仍待完成，不同口音、噪声下的可复算 WER 与可见字幕延迟尚无完整证据。当前**没有自动发音评分或逐词纠音**。详见 [Moonshine 安装说明](docs/engineering/MOONSHINE-LINUX-INSTALLATION.md)。

学习记录和收藏保存在当前设备上，没有 Voxnelo 账号及跨设备同步。只有在授权后才会使用麦克风；录音仅供当前句子临时回听，Voxnelo 不会上传跟读录音。如果在网页中尝试语音识别，浏览器提供的服务可能具有不同的联网和隐私行为。

有关下一轮跨平台本地识别试验与设备要求，见 [Moonshine 多平台试验说明](docs/engineering/MOONSHINE-CROSS-PLATFORM-PILOT.md)；这不改变已发布的 v1.0.3 能力边界。


## 仓库目录说明（保留与清理规则）

| 目录 | 用途与保留规则 |
| --- | --- |
| [`.github/`](.github/) | 现役 GitHub Actions、Issue/PR 模板；必须保留。 |
| [`apps/desktop/`](apps/desktop/) | Electron 主进程、预加载、原生听写与系统集成；生产源码。 |
| [`apps/web/`](apps/web/) | React 共享渲染层、桌面 UI、网页预览和无障碍；生产源码。 |
| [`packages/core/`](packages/core/) | 共享类型和领域基础逻辑。 |
| [`packages/content/`](packages/content/) | 英语语料与教学数据。 |
| [`packages/audio/`](packages/audio/) | 音频、语音和 PCM 工具。 |
| [`packages/learning/`](packages/learning/) | 学习服务与练习流程。 |
| [`packages/storage/`](packages/storage/) | IndexedDB 本地数据、表结构及迁移。 |
| [`assets/audio/`](assets/audio/) | 已审核音频清单；当前等待审核而为空，仍由内容检查使用。 |
| [`build/`](build/) | **版本控制中的打包输入**：图标、系统元数据、签名配置、离线 ASR 说明及第三方声明。保留跟踪文件；生成清单和暂存二进制不是源码。 |
| [`public/brand/`](public/brand/) | 应用和网页预览品牌资源。 |
| [`scripts/`](scripts/) | 构建、内容、安全、听写与发布脚本，包含随包分发的 Python Worker。 |
| [`tests/`](tests/) | 回归测试及打包、发布门禁。 |
| [`docs/`](docs/README.md) | 现役文档、产品基线、必须保留的历史及许可证据；详见文档目录图。 |

**可重新生成、不提交 Git：** `node_modules/`、`dist/`、`dist-electron/`、`release/`、`coverage/`。不要误删作为打包输入的 `build/`。根目录保留 pnpm 锁文件与 workspace 配置、构建/测试配置、LICENSE、SECURITY、CHANGELOG、AGENTS；`.npmrc` 是 pnpm 兼容配置，不代表使用 npm 命令。删除跟踪文件前需核查动态引用、打包、脚本、测试与文档；已淘汰内容从现役文件树删除，Git 历史可查。不要把用户设备的模型、录音和学习记录当成仓库垃圾清理。

## 开发与反馈

项目使用 Electron、React、TypeScript、Rsbuild 和 IndexedDB，JavaScript 包管理统一使用 pnpm。源码运行、测试、打包请查看 [开发指南](docs/DEVELOPMENT.md) 与 [工具链规范](docs/engineering/NODE26-LTS-MIGRATION.md)。普通桌面安装包用户不需要自行安装 Node.js 或 pnpm。依赖归档来源与许可证证据见 [构建依赖审核](docs/engineering/BUILD-LICENSE-INVENTORY.md)。

- [用户帮助](docs/USER-GUIDE.md)
- [隐私说明（仍待独立复核）](docs/PRIVACY.md)
- [更新记录](CHANGELOG.md)
- [反馈问题或建议](https://github.com/kunlong-luo/voxnelo/issues)

提交公开 Issue 时请遮盖个人信息，不要上传私人语音录音。

> **发行范围：** 本次是免签名的正式桌面发行版，Windows/macOS 可能出现安全警告或阻止安装；公开 v1.0.3 的 Linux 离线听写模型/SDK 需要用户主动安装，不随包内置。仓库尚未归档全部实机、课程版权及初学者验收证据；“正式发行”不等于外部认证。
