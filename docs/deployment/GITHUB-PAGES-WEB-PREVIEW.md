# GitHub Pages 公开体验版部署与验收指南

> 2026-10-22 · GitHub API 已核验仓库为 **Public**，`main` 上的 GitHub Pages 部署和 CI 成功。Voxnelo 主产品仍为 Electron 桌面端；Pages 仅托管静态 React/Rsbuild 体验版，不是 Linux/Windows/macOS 发行安装包。

## 现状与隐私前提

- 仓库 `kunlong-luo/voxnelo` 于 2026-10-22 已核验为 **Public**。如需修改公开状态，必须由仓库所有者明确授权；部署 Pages 不得擅自更改仓库可见性。
- GitHub Pages 网页是**公开访问**的，仓库当前源码也是公开的；不要把个人学习历史、密钥、私密录音或未准备公开的原始文档放入 `dist`。
- 该工作流会通过官方 `configure-pages` / `upload-pages-artifact` / `deploy-pages` 尝试启用并发布 Pages；如当前 GitHub 账户计划或仓库设置阻止私有仓库 Pages，任务可能失败，必须从 Settings → Pages 完成资格/源设置。不能将工作流成功构建等同于网站已经可访问。

## 部署 URL 与构建

拟发布 URL：`https://kunlong-luo.github.io/voxnelo/`

应用使用 Rsbuild 构建 `dist`，无网页路由服务端；部署的应是 `pnpm build:renderer` 生成的文件，**不包括 Electron 主进程、预加载脚本或安装包**。

网页目前使用 `output.assetPrefix: './'`，故打包的 JS/CSS 是相对引用。Voxnelo 侧栏 Logo 已从 `/brand/voxnelo-mark.svg` 调整为 `brand/voxnelo-mark.svg`，并提供项目路径下的 favicon。两者兼容本地 Web、Electron 自定义协议 `voxnelo://app/index.html` 与 Pages 的 `/voxnelo/` 子目录。 `scripts/check-pages-artifact.mjs` 在 CI 中检查 HTML 静态引用和品牌图标。

## 用户已同意公开体验后的发布步骤

1. 合并准备 PR 后会自动运行公开体验版部署任务。仓库当前已是 **Public**，不需要为 Pages 发布额外修改仓库可见性。
2. 打开 **GitHub → 仓库 Settings → Pages → Build and deployment → Source → GitHub Actions**，确认静态发布来源与流水线一致；无需进行私有仓库计费/计划处理。
3. 在 **Actions → GitHub Pages public web demo** 中检查自动运行结果。需要重试时点击 **Run workflow** 选择 **main**。任务安装锁定依赖、仅构建 Renderer、校验输出，再通过官方 Pages Actions 上传和发布。
4. 在 Pages 设置或部署任务中确认实际访问 URL；检查 `/voxnelo/` 上的品牌 Logo、favicon、JS/CSS 和所有页面视图。
5. 如需取消公开，请在仓库 Settings → Pages 中取消 Pages 发布。只删除某次 Actions 运行不会自动确保站点下线。

本地仅验证构建，不发布：

```bash
pnpm install --frozen-lockfile
pnpm build:renderer
node scripts/check-pages-artifact.mjs
```

## 桌面与 Web 行为边界

| 功能 | Pages Web 预览 | Electron 桌面版 |
| --- | --- | --- |
| 三栏布局、Nordic / Sunset、切换中英文 | 支持 | 支持 |
| 40 句课程、浏览历史、收藏、复习与设置 | 浏览器本地 IndexedDB / localStorage | 桌面内置 origin 的独立本地数据 |
| 示范英语语音 | 依赖浏览器 SpeechSynthesis / 设备已安装英语声音；某些 Linux 浏览器不可用 | Linux 没有 Chromium 英语 voice 时有 eSpeak 本地离线回退 |
| 录音和回听 | 依赖浏览器 `getUserMedia` / `MediaRecorder`、HTTPS、麦克风授权、系统权限和编解码支持 | Electron 的受控音频权限与同一录音流程 |
| 顶部系统窗口控制按钮、窗口拖动 | 不显示，因为浏览器有自己的窗口 | Electron 可拖拽自定义栏与三个控制按钮 |
| 录音上传 / 在线同步 | 无服务端；不自动上传 | 同样不自动上传 |
| 离线能力 | 首次访问需要网络；**尚未实现 PWA/Service Worker 离线缓存** | 应用安装后可本地运行，英语语音引擎视系统而定 |

**风险点**：Web 浏览器内的本地记录与 Electron 本地记录不会自动互通；浏览器清理网站数据或使用隐身模式可能删除学习记录。不要向用户保证跨设备同步或网页离线可用。网页是公开体验渠道，不是 Linux 桌面 TTS 的完整替代。

## 上线前人工验收

- [ ] 站点实际可从预期 URL 访问，URL 不会重定向到仓库页面。
- [ ] CSS/JS、Voxnelo Logo 与标签 favicon 正常加载（没有 404）。
- [ ] 1440×900、1160×760、800×610 及窄屏均无关键控件重叠；右侧卡片与中间卡片高度正确。
- [ ] 运行截图与 `docs/u3.jpeg` 配色、对齐、复习/收藏图标、Tooltip 和微动效比对；支持减少动画。
- [ ] 首次跟随系统语言；中英文手动切换后重新载入仍生效。
- [ ] 收藏、复习、历史数据在刷新页面后保留；清理浏览器数据的影响说明准确。
- [ ] 在 HTTPS Pages 上的真实 Chrome / Firefox / Pop!_OS 浏览器测试：允许麦克风、开始/结束录音、回听、系统英语 voice 可用/不可用两种状态。
- [ ] 打开站点的浏览器开发工具，不出现与 CSP、IndexedDB、音频或资源路径相关的异常。
- [ ] 确认上线内容无账号密钥、私有文件、开发者调试信息。

## 当前未完成的发布工作

2026-10-22 核验：`main` CI 与 Pages 发布任务已成功，但公开桌面包仍为未签名的 v0.1.6 Early Access，网页上线不等于正式桌面安装包通过验收。请继续根据 [正式验收矩阵](../engineering/V0.1-ACCEPTANCE-MATRIX.md) 与 [v0.1.7 候选说明](../release-notes/v0.1.7.md) 跟踪真实麦克风、课程版权、Windows/macOS 真机、模型及视觉验收。旧 PR #22/#23 为历史背景，不再作为现存开放 PR 处理。
