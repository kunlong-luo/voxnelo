# Voxnelo

**从一句英语开始，练习自信开口。**

[English](README.md) · **简体中文**

Voxnelo 是一款开源、本地优先的英语口语跟读桌面应用。听一句、自己读一句，再回听录音；不需要注册账号。

**当前版本：** `0.1.5` · **阶段：** Early Access（测试阶段） · **开发者：** Leo Luo · **许可证：** [MIT](LICENSE)

## 0.1.5 已实现的功能

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

## 下载安装与测试

**0.1.5 仍是测试构建，不是正式稳定版。** 当前尚未发布该版本的公开 GitHub Release。需要试用时，可前往 [CI 运行记录](https://github.com/kunlong-luo/voxnelo/actions/workflows/ci.yml?query=branch%3Amain)，打开 `main` 分支成功的构建，并在 Artifacts 中下载测试安装包。下载可能需要登录 GitHub，且附件会过期。

| 平台 | 当前安装包情况 |
| --- | --- |
| Linux（x64） | 提供测试用 `.deb` 和 `.AppImage`；Linux CI 附件包含内容一致的 `Voxnelo.deb` 和 `voxnelo_0.1.5_amd64.deb`。 |
| Windows | 已有未签名的 NSIS 安装程序构建流程，尚未作为公开 Release 附件提供。 |
| macOS | 已有未签名、未公证的 DMG 构建流程，尚未作为公开 Release 附件提供。 |

使用 Debian 系 Linux 时，先解压 CI 附件，然后可以双击 `Voxnelo.deb` 通过图形安装器打开，或在版本号安装包所在目录执行：

```bash
sudo apt install ./voxnelo_0.1.5_amd64.deb
```

旧版可直接升级，无需先卸载。详细限制见 [安装与候选版验收说明](docs/engineering/V0.1-RC-PLAYBOOK.md)。日后公开的安装包会放在 [GitHub Releases](https://github.com/kunlong-luo/voxnelo/releases)。

## 实时听写与隐私

**实时听写目前只是实验性入口，不是标准桌面安装包开箱即用的功能。** 标准安装包**不包含第三方离线语音识别引擎或模型**。Linux 用户可以自行选择配置 [个人 ASR 内测引擎](docs/engineering/LOCAL-ASR-PERSONAL-PILOT.md)，但真实设备识别准确率和降噪效果尚未完成发布验收。当前**没有自动发音评分或逐词纠音**功能。

学习记录和收藏保存在当前设备上，没有 Voxnelo 账号及跨设备同步。只有在授权后才会使用麦克风；录音仅供当前句子临时回听，Voxnelo 不会上传跟读录音。如果在网页中尝试语音识别，浏览器提供的服务可能具有不同的联网和隐私行为。

## 开发与反馈

项目使用 Electron、React、TypeScript、Rsbuild 和 IndexedDB。源码运行、测试、打包请查看 [开发指南](docs/DEVELOPMENT.md)。

- [用户帮助](docs/USER-GUIDE.md)
- [隐私说明（发布前待复核）](docs/PRIVACY.md)
- [更新记录](CHANGELOG.md)
- [反馈问题或建议](https://github.com/kunlong-luo/voxnelo/issues)

提交公开 Issue 时请遮盖个人信息，不要上传私人语音录音。

> **发布状态：** 自动化 CI 通过不代表真实麦克风、首批课程内容及第三方分发授权已经完成验收，相关工作仍在进行。
