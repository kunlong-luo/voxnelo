# Voxnelo — Agent 工程规范

> 适用于本仓库所有 AI Agent、自动化编码工具和人工贡献者。当前代码版本：**v1.0.4 未公开候选版**；最新已公开发布版本为 **v1.0.3**。原始 **V0.1 Early Access** PRD 是冻结的历史需求基线，不代表当前全部实现范围或已经完成所有验收。

## 0. 规范优先级
1. 用户当前明确授权及安全约束；
2. `docs/Voxnelo-Product-Docs-v1.0/docs/02-产品需求PRD.md` 的冻结功能 ID 和验收标准；
3. 同目录的 `03-版本路线图.md`、`08-测试验收与发布.md`、`06-技术架构与数据设计.md`、`11-风险登记与变更规则.md`；
4. 本文件、目录级 AGENTS.md、既有架构/设计规范和仓库代码。

文档冲突时停止擅自裁定，列出冲突和建议，取得授权再改变产品行为。不得以“代码目前如此”反向改写产品验收标准。冻结原始 PDF/DOCX 和校验文件不得在工程任务中覆盖。

## 1. 范围守卫
- 原始 V0.1 唯一 P0 功能基线为 PRD **F001–F012**；现在仍须保留“听示范 → 录音跟读 → 回听 → 换句 → 历史/收藏”的无登录、本地优先闭环。
- 原始 V0.1 不要求 AI、LLM、云端推理、实时 ASR、自由对话、自动接话、AI 评分、词/音素识别高亮、沉浸滑动信息流；目前代码中的可选本地实时听写属于之后新增的功能，不能据此回写冻结的 V0.1 验收标准。
- 按原始路线图，F101–F108 属于 V0.2–V0.3；S001–S003 属于 V0.9/V1.0。当前实现与未完成项以 [追踪矩阵](docs/release/PRD-TRACEABILITY.md) 为准；不得把后续功能倒填为历史 V0.1 的阻断项。
- 任何新增功能需写明目标版本、PRD ID（或标记“待产品批准”）、范围理由与验收；未经确认不得扩展 V0.1。
- 系统 TTS 是现阶段实现，不应伪称为人工审核的专业参考录音；规则推荐/复习等已有实现不等于首版强制发布要求。
- 录音仅在用户主动授权和操作后进行；默认不上传、不长期保存原始录音；拒绝权限后听示范/换句/收藏仍可用。

## 2. 开发前
1. 阅读相关 PRD、路线图、架构和验收文档，标注影响的 F-ID。
2. 检查现有代码、测试和组件，先复用后扩展，避免跨功能大重构。
3. 写清非目标、潜在数据迁移/权限风险和最小可验证方案。
4. 不确定的产品要求先报告，不要猜测业务规则。

## 3. 工程栈和架构
- 以 `package.json` 和既有配置为准：React 19 / TypeScript 6 / Rsbuild / Electron / Dexie(IndexedDB) / pnpm。
- UI 优先使用现有 Base UI、Tailwind、CVA、设计 tokens 和封装组件；不要新增随意堆叠的原生外观组件或平行设计体系。
- 不允许为了视觉效果破坏键盘操作、可见焦点、缩放、减少动画或窗口响应式。
- 明确区分 Electron main / preload / renderer，保持 sandbox、context isolation、最小 IPC 白名单；不得开放任意 Node/文件系统访问。
- 使用可靠的录音状态机，及时清理媒体流、播放/录音句柄和临时 Blob URL；切句、关闭、错误后不串音。
- 维护“看过”和“练过”的不同语义；禁止将浏览/自评包装成自动发音测评。
- 不提交密钥、个人录音或未经许可的内容素材。

## 4. 实施与测试
- 小步提交；每项代码变更对应测试或明确的手工验收依据。
- 修改音频/课程流程要覆盖：首次使用、正常录音回听、麦克风拒绝、断开设备、切句清理、重启持久化。
- 变更 UI 要检查键盘、焦点、窗口尺寸和系统缩放；不可用截图代替真实设备音频测试。
- 本地基线命令（按改动范围执行）：
  ```sh
  pnpm install --frozen-lockfile
  pnpm typecheck
  pnpm lint
  pnpm arch
  pnpm ui:check
  pnpm test:coverage
  pnpm build
  pnpm perf:budget
  ```
- `.github/workflows/ci.yml` 持续检查静态 Pages 资源、Node/pnpm 版本一致性及 Windows/macOS/Linux 打包完整性；耗时的 Chromium 响应式截图及 Linux Electron 窗口/DPI/重启冒烟由 `.github/workflows/quality-deep.yml` 在匹配的 UI / 设计文件 PR 上自动触发，其他场景仍可手动 `workflow_dispatch`。必须核对实际源提交对应的 Actions 结论和证据；主 CI 通过不代表深度视觉检查已运行。不得绕过失败检查来宣布可发布。
- 自动化绿色 **不等于** Windows/macOS/Linux 实机麦克风、权限、安装包、品牌与素材版权全部合格。

## 5. Git 与交付
- 默认在功能分支工作，通过 PR 审阅；未经授权不直接推送 main、不 force-push、不删分支、不改历史、不自行合并。
- PR 必须说明功能 ID、目标版本、范围内/范围外、测试结果、失败或未运行项目及风险。
- 完成标准：符合原始验收、不回归主学习闭环、无已知 P0 阻断、CI 检查通过且必要实机验证有证据。
- 任何没有执行的检查如实写“未执行”；不推断构建通过就是发布完成。

详见历史 `docs/engineering/V0.1-ACCEPTANCE-MATRIX.md`、当前 `docs/release/PRD-TRACEABILITY.md` 和 `.github/PULL_REQUEST_TEMPLATE.md`。

- JavaScript 包管理统一使用 pnpm（固定版本以 `package.json` 为准）；禁止在维护中的脚本、CI 和开发安装步骤调用 npm CLI 或 npx。npm Registry 仍是上游分发及许可证证据来源，保留原始来源链接和完整性记录。隔离的原生 ASR 测试环境使用 pnpm hoisted 布局，不放宽原生文件符号链接检查。
