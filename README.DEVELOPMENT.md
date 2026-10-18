# Voxnelo · V0.1 桌面项目（开发说明）

> 这是可供启动与继续开发的源码工程，不代表 Windows / macOS / Linux 的安装包已通过实机验收。
> Voxnelo / 声语跃动目前为工作品牌，正式公开使用前仍须核验商标、应用名称和域名。

## 依赖环境

- Node.js 22 或更新的受支持 LTS 版本
- Corepack（随常见 Node.js 安装提供）与 pnpm 12（与 package.json 的 packageManager 字段一致）
- Linux 的图形桌面环境，以及可用的音频输出/麦克风

## 在用户指定目录安装

如果你已把文档放在 `/home/spark/Projects/github/voxnelo/`，请不要删除原目录。先把项目 ZIP **解压并合并**到这个目录，保留已有文档。

```bash
cd /home/spark/Projects/github/voxnelo
corepack enable
corepack prepare pnpm@12.11.2 --activate
pnpm install
pnpm dev
```

如果 Linux 上执行 `corepack enable` 遇到权限问题，可用 `corepack pnpm install` 和 `corepack pnpm dev` 替代（确保 Corepack 正常启用）。

## Pop!_OS 24 / Linux：任务栏显示 Voxnelo 图标

Voxnelo 的**网页左上角 Logo**、**运行中窗口图标**、**桌面启动器图标**是三个不同的入口。项目已有 `build/icon.png` 品牌图标；修复后开发版 Electron `BrowserWindow.icon` 会加载这张图，deb / AppImage 打包会将同一图片复制到安装资源中。Linux 的 X11/Wayland 窗口标识与 `.desktop` 文件名同步为 `app.voxnelo.desktop`，让任务栏更容易把窗口关联到正确的应用图标。

### 从源码开发（`pnpm dev`）

先拉取代码并**完全关闭旧 Electron 窗口**，再重新启动（只刷新 Web 页面不会更新窗口图标）：

```bash
git pull origin main
pnpm dev
```

某些 Pop!_OS 24 的 Wayland/COSMIC/GNOME 桌面需要注册对应的用户级 `.desktop` 项，才能把运行中的窗口匹配到启动器。如果仍显示系统默认的 Electron 图标，**只需运行一次**：

```bash
pnpm icon:linux:dev
```

此命令仅在 Linux 写入当前用户的 `~/.local/share/applications/app.voxnelo.desktop.desktop`（如有 `XDG_DATA_HOME` 则按该目录），指向源码中的 `build/icon.png`，无需 sudo。随后退出旧窗口，重新执行 `pnpm dev`。也可以从桌面应用列表启动 “Voxnelo (Development)”，该快捷方式会运行此项目的 `pnpm dev`；项目换路径后需重新注册。

如不再需要开发启动器：

```bash
pnpm icon:linux:dev:remove
```

该命令只删除这一个开发桌面项；不会删除系统软件、用户学习记录或任何其他启动器。

### 正式 Linux 安装包（deb / AppImage）

```bash
pnpm pack:linux
```

安装或运行**重新打包的最新版**，不要指望旧安装包自动换图标。打包后的 `Voxnelo` 使用统一桌面标识和 `build/icon.png`。如果先前手工固定过旧 Electron 图标，需从 Dock 中取消固定旧项，再固定新版 Voxnelo。AppImage 视桌面环境需要用户自行进行应用菜单集成；并非每个桌面都会自动注册它。Pop!_OS 24 的实际 Dock 映射仍需实机验收，GitHub CI 类型检查和构建不能替代该检查。

排查可使用 `echo "$XDG_SESSION_TYPE"` 确认 Wayland 还是 X11，及检查 `~/.local/share/applications/app.voxnelo.desktop.desktop` 是否存在；不需要更改 Electron 的 GPU 沙盒或安全配置。

## Linux GPU 说明

部分 NVIDIA + X11 环境下，Chromium GPU 沙盒会拒绝打开 GBM/DRI（日志出现
`MESA-LOADER: failed to open dri ... 权限不够`），此时应用仍可经软件渲染启动，
但会有报错噪声。`dev:desktop` 已默认追加 `--disable-gpu-sandbox` 绕开该问题；
该开关只影响 GPU 进程沙盒，主进程的 `sandbox/contextIsolation` 与渲染安全策略
保持不变，打包产物不受影响。如需验证硬件加速是否生效，去掉该开关后观察
启动日志有无 MESA-LOADER 报错即可。打包产物在同类系统上也会出现该日志噪声，
应用仍可经软件渲染正常启动（已知问题，V0.1 不处理）。

## 常用命令

```bash
pnpm dev              # 同时启动 Rsbuild 和 Electron
pnpm dev:web          # 仅运行 Web 预览
pnpm typecheck        # TypeScript 类型检查
pnpm test             # Vitest
pnpm build            # 构建 Web 和 Electron 入口
pnpm pack:linux       # 在 Linux 上打包 deb 和 AppImage
pnpm pack:windows     # 在合适的 Windows 构建环境打包
pnpm pack:mac         # 在 macOS 环境打包 dmg（正式分发仍需签名/公证）
```

## 0.1.5 已实现功能与实验边界

标准桌面应用已经实现：40 条英语短句、系统 TTS 示范与慢速、录音回听、换句、收藏、复习标记、历史、简单规则推荐和本地持久化。当前版本的功能清单以 [README.md](README.md) 为准。

代码中还有 **Linux x64 用户自行安装离线 ASR 引擎后的实验性实时听写**。标准安装包不自带原生识别库或模型；该实验功能尚未通过真实麦克风 WER、降噪及第三方授权发布验收，不属于默认可用能力，也不应写成正式版宣传功能。应用不提供自动发音评分。

## 音频与隐私

录音由用户主动开始，浏览器/Electron 会按平台申请麦克风权限。录音在练习界面内通过临时 Blob URL 回放，切换句子或关闭窗口时清除；学习进度保存到 IndexedDB。系统朗读依赖当前操作系统安装的英语语音包。

## 正式公开发布前仍需完成的验收

- 课程中的 IPA 只是待复核教学参考，发布前应由具备专业能力者审校。
- 为关键句子制作或购买合法授权的参考音频，不依赖 TTS 承诺专业级发音。
- 在 Windows 11、macOS、Ubuntu/X11/Wayland 分别验证权限、录音和打包。
- Electron 初版使用 voxnelo://app 安全协议加载本地资源，正式发布前仍需在实机上复核资源加载、IndexedDB 持久化与麦克风权限。
- 整理来源许可、图标、应用签名、公示隐私策略。

## 文档

完整产品规划沿用你已放入项目目录的 Voxnelo PRD 文档；本源码包仅新增 `docs/12-工程实施与交付边界.md`，不会删除或覆盖其余文件。
