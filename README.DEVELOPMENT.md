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

## V0.1 范围

实现：单句英语学习、参考发音（**使用系统 TTS，不保证有专业录音的准确性**）、慢速切换、录音回听、换句、收藏、复习标记、最近记录、简易规则推荐，数据本地保存。

没有实现：实时语音识别、逐词卡拉 OK 高亮、上下滑动短句流、自动卡壳帮助、音素级纠错、自由 AI 对话。

## 音频与隐私

录音由用户主动开始，浏览器/Electron 会按平台申请麦克风权限。录音在练习界面内通过临时 Blob URL 回放，切换句子或关闭窗口时清除；学习进度保存到 IndexedDB。系统朗读依赖当前操作系统安装的英语语音包。

## 发布准备

- 课程中的 IPA 只是待复核教学参考，发布前应由具备专业能力者审校。
- 为关键句子制作或购买合法授权的参考音频，不依赖 TTS 承诺专业级发音。
- 在 Windows 11、macOS、Ubuntu/X11/Wayland 分别验证权限、录音和打包。
- Electron 初版使用 voxnelo://app 安全协议加载本地资源，正式发布前仍需在实机上复核资源加载、IndexedDB 持久化与麦克风权限。
- 整理来源许可、图标、应用签名、公示隐私策略。

## 文档

完整产品规划沿用你已放入项目目录的 Voxnelo PRD 文档；本源码包仅新增 `docs/12-工程实施与交付边界.md`，不会删除或覆盖其余文件。
