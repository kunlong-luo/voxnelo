# Voxnelo 参考 Resume Craft 的工程升级记录

检查基准：2026-10-15；参考仓库： https://github.com/kunlong-luo/resume-craft （main）。
策略：只迁移跨项目的工程保障，UI 和英语课程逻辑仍沿用 Voxnelo 的产品基线。

## 已经落地

| Resume Craft 的成熟经验 | Voxnelo 中的适配 |
|---|---|
| Dependabot 每周更新 | 同时检查 pnpm/npm 锁文件与 GitHub Actions，有限合并请求数 |
| Bug / Feature / PR 模板 | 中文复现步骤、系统信息、麦克风与本地数据隐私检查 |
| 稳定依赖版本检查 | Node 原生脚本覆盖根 package.json 及 packages 子包 |
| Bundle gzip 体积预算 | 新增 Rsbuild 输出检查，阈值取自本项目现有 CI 构建体积 |
| 更严格的 CI 权限和生命周期 | 权限只读、取消过时任务、超时限制、Actions 固定 SHA |

## 构建体积阈值的由来

最近 Voxnelo 通过的 main 构建日志显示 JS gzip 约 112 KiB、CSS gzip 约 6 KiB，总量约 119 KiB。
第一阶段设置 JS 160 KiB、CSS 24 KiB、渲染资源总 gzip 240 KiB，保留合理增长余量。
这不等于 Electron 安装包的最终体积或应用实际启动速度；新型 ASR 模型必须另做离线包容量预算。

## 后续改进（本次尚未实现）

1. P0：Playwright + Electron 端到端验收。测试录音许可/拒绝、录音中切页、系统语音、重启后学习记录持久化、小窗口键盘导航。
2. P1：参照 Resume Craft 的 portable-workspace-backup 设计导出导入。Voxnelo 是 states/events，不是简历 profiles/drafts。应使用格式版本、文件容量上限、完整校验、原子写入，避免错误备份损坏 IndexedDB；属于原规划 V0.3。
3. P1：跨平台安装包验证与签名。不要搬运 Resume Craft 的网站发布、SEO/PWA 工作流，必须在 Linux、Windows、macOS 验收。
4. P1：带键盘焦点管理的错误恢复与导入确认，按需改造 ErrorBoundary/对话框模式。
5. P2：优化初次使用指引、帮助和无障碍测试，不增设无关广告、账户或收费功能。

## 不应直接搬运

简历 ATS 分析、PDF 解析和打印、头像、简历分享、表单编辑器、SEO、网页缓存与数据统计服务。
也不应为统一技术栈而替换 Voxnelo 的 Rsbuild、Electron、本地 IndexedDB、学习服务门面。

来源：同一 GitHub 所有者的 MIT 授权项目 Resume Craft。这里移植的是工程策略和简化改写的模板/Node 脚本，不是整个目录原样复制。
