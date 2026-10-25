# Voxnelo

**从一句英语开始，练习自信开口。**

[English](README.md) · **简体中文**

Voxnelo 是一款开源、本地优先的英语口语跟读桌面应用。听一句、自己读一句，再回听录音；不需要注册账号。

**源码版本：** `1.0.3` · **发行状态：** 正式免签名桌面发行版（已知限制详见下文） · **开发者：** Leo Luo · **许可证：** [MIT](LICENSE)

## 已实现的基础功能

- **40 条英语短句**：包含中文翻译、话题、难度，以及可切换显示的 IPA 音标。
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
| Windows | NSIS `.exe` | **未数字签名**，SmartScreen 可能弹出警告；不代表原生 Moonshine 听写已在 Windows 支持 |
| macOS | `.dmg` | **未签名、未通过苹果公证**，Gatekeeper 可能阻止启动；确认 DMG 与 Mac 芯片架构兼容 |

发布页提供 `SHA256SUMS-linux.txt`、`SHA256SUMS-win32.txt`、`SHA256SUMS-darwin.txt`。下载后请核对哈希；**SHA-256 只验证文件完整性，不替代开发者代码签名**。不要使用来路不明的第三方安装包。

Linux 已安装用户可正常升级，无需先卸载或清空学习记录：

```bash
sudo apt install ./Voxnelo.deb
```

更多操作步骤及 Windows/macOS 已知限制见 [用户帮助](docs/USER-GUIDE.md) 与 [1.0.3 发行说明](docs/release-notes/v1.0.3.md)。

## 实时听写与隐私

**Linux 默认使用 Moonshine Medium Streaming 进行本地实时英语听写。** Windows 和 macOS 目前只保证基础学习、录音回听及相应打包检查；**不承诺**这两个平台已接入 Moonshine 本机推理。 标准安装包不内置第三方模型或原生推理 SDK。首次使用请在应用「离线模型管理」页主动点击「安装 Moonshine 离线识别模型」，由应用下载安装固定版本的本机 SDK/模型并校验 SHA-256。首次安装需要网络、Python 3 + venv、足够磁盘空间和 Linux x64 环境；之后在本机识别，不自动切换回 Zipformer。真实设备的不同口音、背景噪声、精确延迟仍需更多验收。当前**没有自动发音评分或逐词纠音**。详见 [Moonshine 安装说明](docs/engineering/MOONSHINE-LINUX-INSTALLATION.md)。

学习记录和收藏保存在当前设备上，没有 Voxnelo 账号及跨设备同步。只有在授权后才会使用麦克风；录音仅供当前句子临时回听，Voxnelo 不会上传跟读录音。如果在网页中尝试语音识别，浏览器提供的服务可能具有不同的联网和隐私行为。

## 开发与反馈

项目使用 Electron、React、TypeScript、Rsbuild 和 IndexedDB。源码运行、测试、打包请查看 [开发指南](docs/DEVELOPMENT.md)。

- [用户帮助](docs/USER-GUIDE.md)
- [隐私说明（仍待独立复核）](docs/PRIVACY.md)
- [更新记录](CHANGELOG.md)
- [反馈问题或建议](https://github.com/kunlong-luo/voxnelo/issues)

提交公开 Issue 时请遮盖个人信息，不要上传私人语音录音。

> **发行范围：** 本次是免签名的正式桌面发行版，Windows/macOS 可能出现安全警告或阻止安装；Linux 离线听写的模型/SDK 需要用户主动安装，不随包内置。仓库尚未归档全部实机、课程版权及初学者验收证据；“正式发行”不等于外部认证。
