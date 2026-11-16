# Voxnelo 用户帮助（持续维护；区分公开版本与开发版本）

Voxnelo 是一款免费、本地优先的英语口语练习桌面应用，无需注册即可开始使用。**这是公开发行的免签名桌面版，系统安全限制和跨平台验证边界仍需注意。** 维护者：Leo Luo。

## 版本与支持边界

本指南覆盖公开版基本学习流程及后续开发候选的说明。仓库 `package.json` 为 1.0.4 **不表示** v1.0.4 已公开发布。请在 [GitHub Releases](https://github.com/kunlong-luo/voxnelo/releases) 区分已发布 Release 与 Draft；以下 v1.0.0 链接是历史公开版，不应当作最新下载入口。不同安装包的 Moonshine 能力可能不同，以对应版本发布说明为准。

## 安装与升级

到 [GitHub Releases](https://github.com/kunlong-luo/voxnelo/releases) 选择**已发布**且与你的系统兼容的安装包，优先检查发布页的 SHA-256 校验文件：

- **Linux x64**：Debian、Ubuntu、Pop!_OS 推荐 `Voxnelo.deb`（与 `voxnelo_1.0.0_amd64.deb` 相同）；其他兼容系统可尝试 `.AppImage`。升级通常不需卸载旧版。DEB 会通过包管理器安装所需系统依赖。
- **Windows**：下载 NSIS `.exe` 并正常安装。安装包暂未进行数字签名；SmartScreen 警告要如实对待并先确认来源，不要将其当成经认证的稳定应用。
- **macOS**：下载 `.dmg`，核对 DMG 架构兼容性，按系统流程安装。安装器未签名、未公证，Gatekeeper 可能阻止打开；若不愿接受此限制，请暂不安装这一免签名正式版。

## 第一条英语练习

1. 打开「练习」，选择一条短句，点击播放示范（取决于系统英语 TTS 语音包）。
2. 点击录音按钮、授权麦克风、说英语，再次点击停止后即可回听。等待系统权限授权时，可以点击同一录音按钮「取消录音授权请求」；此操作取消 Voxnelo 本次录音请求，不一定会关闭系统权限弹窗。取消后即使系统随后授予权限，也不会自动开始录音；如需录音，请主动重新点击。
3. 「换一句」切换短句；收藏、复习和历史保存在当前设备上。
4. 界面可切换中文/英文、Nordic/Sunset 主题、IPA 和减少动效设置。

## 离线实时英语听写（Moonshine：按版本和平台核实）

Linux x64 已有 Moonshine Voice Medium Streaming 使用记录；后续源码也包含 Windows x64 和 macOS 15+ Apple Silicon 的试验性原生接入。具体可用性取决于安装包版本、系统、架构和运行时，**模型与 Python 运行时不会随安装包自动下载**。打开「离线模型管理」并点击「安装 Moonshine 离线识别模型」，在你主动同意后才下载官方 SDK 与模型。首次需要网络、Python 3 的 `venv` 支持和可用磁盘空间；校验 SDK 版本及模型文件哈希通过后才会启用本机推理，缺失时不会静默切回旧引擎。识别后如需断网使用，应先确保模型已完整安装。

**Windows x64** 的候选原生运行时需要 Python 3.10+（可由 Python Launcher 或 PATH 找到）；**macOS** 候选仅针对 macOS 15+ Apple Silicon，并需 Python 3/venv；**Linux x64** 需 Python 3/venv。Windows ARM64、Intel Mac、macOS 14 等不能从三平台打包成功推断 Moonshine 可用。首次安装模型需联网，之后识别在本机执行。三平台构建通过不等于每种麦克风和设备均已验收。没有自动发音评分或音素级纠音。参见 [跨平台试验说明](engineering/MOONSHINE-CROSS-PLATFORM-PILOT.md)。更完整的模型目录与安装说明见 [Moonshine Linux 指南](engineering/MOONSHINE-LINUX-INSTALLATION.md)。

## 首次使用检查（Windows / macOS / Linux）

1. 从已发布的 Release 选择匹配操作系统和 CPU 架构的安装包，核对官方提供的 SHA-256；哈希不是发行者签名。
2. 打开练习页，无需账号即可选择短句、听系统 TTS 示例、录音回听、收藏或标记复习。
3. 需要听写时，先进入独立的「离线模型管理」页；只在用户主动选择安装后下载 SDK 和模型。等待校验成功后再启动听写。
4. 授予麦克风权限，检查输入设备和系统音量；先用短句测试，再尝试连续讲话。字幕可能有延迟，识别文本不等于发音评分。
5. 断网复测已安装模型；若安装或权限失败，保留课程学习功能并参考下面的故障排查。不要公开上传私人录音或本机路径。

## 常见问题

- **示范没有声音**：核对系统音量、输出设备、英语 TTS 引擎及其语音包。
- **无法录音或听写**：核对系统麦克风权限、输入设备连接、设备是否被其他软件占用；Linux 检查模型管理页是否显示 Moonshine 已校验。
- **Moonshine 下载失败**：检查 Python 3/venv、网络、磁盘容量和依赖环境；安装失败不代表模型可用，也不会切换到未验证模型。
- **无法播放上一句的录音**：本版本的录音只在当前练习中临时回听；换句后旧音频会清理。本机历史、收藏和复习记录会保留。
- **Windows SmartScreen / macOS Gatekeeper 警告**：当前公开安装包尚未进行发行者数字签名或 macOS 公证；SHA-256 不等于身份认证。
- **安装失败**：记录安装包文件名、版本、系统版本、操作步骤及脱敏错误提示，到 [GitHub Issues](https://github.com/kunlong-luo/voxnelo/issues) 反馈。不要公开上传私人麦克风录音、系统序列号或私有文件路径。

## 隐私与边界

无需账号、学习记录本地保存。录音在用户同意使用麦克风后才开始，本地 Moonshine 识别不需要向 Voxnelo 服务器上传录音；浏览器体验版如果使用系统 Web Speech 服务则可能受浏览器提供商不同的联网/隐私政策影响。课程文本、TTS 及第三方运行时授权和跨设备实测仍在持续审核。参见 [文档索引](README.md)、[隐私说明](PRIVACY.md) 和对应版本的发布说明。
