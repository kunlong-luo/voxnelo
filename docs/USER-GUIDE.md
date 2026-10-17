# Voxnelo · 用户帮助（0.1 Early Access）

Voxnelo 是免费、本地优先的英语口语练习应用。无需注册即可练习。项目开源地址：<https://github.com/kunlong-luo/voxnelo>。

## 从第一句开始

1. 打开「练习」，点击「播放示范」听当前英语句子。朗读依赖系统提供的英语语音引擎。
2. 点击「开口跟读」并允许麦克风权限，再次点击结束录音。随后可以回听自己的录音。
3. 「换一句」进入下一条；「收藏」「复习」方便以后找回短句。
4. 「历史」和学习标记保存在当前设备上，无需账号。

## 实时听写的可用性

实时听写是实验性入口，**并非所有桌面安装包都有离线英语识别引擎**。当设置缺少引擎或语言模型时，会提示不可用；这时仍可使用「录制回听」。不要把自评或录音次数理解为自动发音评分。

## 常见问题

- **听不到示范**：检查系统音量、输出设备与英语语音引擎。
- **无法录音**：在系统权限设置中允许 Voxnelo 使用麦克风，检查设备连接，退出其他占用麦克风的应用。
- **未显示旧录音**：本版本的录音仅供当前练习临时回听，切换句子后会清理；收藏与学习历史会继续保存在本机。
- **无法实时听写**：当前安装包可能不包含本地 ASR 引擎／模型。这与麦克风是否正常是不同的问题。
- **Linux 安装和软件中心显示问题**：可在终端运行 `pnpm diagnose:linux`（需要项目源码和本地 DEB），把错误文字整理后提交 Issue。不要上传个人录音。

## 帮助与反馈

- [报告软件问题](https://github.com/kunlong-luo/voxnelo/issues/new?template=bug_report.yml)
- [提出功能建议](https://github.com/kunlong-luo/voxnelo/issues/new?template=feature_request.yml)
- [查看开源仓库](https://github.com/kunlong-luo/voxnelo)
- [MIT 许可证](https://github.com/kunlong-luo/voxnelo/blob/main/LICENSE)

提交 GitHub Issue 通常需要 GitHub 账户。**Issue 是公开页面**，发布截图和日志前请遮盖姓名、账号、私人文件路径、令牌和其他敏感信息，不要上传自己的语音录音。打开这些链接需要网络，但 Voxnelo 的基本学习操作不依赖反馈服务器。

## 软件信息

版本号在「设置 → 关于 Voxnelo」展示，V0.1 当前标注为 Early Access。版本号并不代表具备所有规划中的语音识别功能。
