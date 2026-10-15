# ADR-0003：引入学习应用服务门面

- Status: Accepted
- Date: 2026-10-15

## Context

UI 曾直连全部四个底层包（`App.tsx` 直 import content/core/storage/audio），
`core` 只是被绕过的工具包；跨包引用靠深路径相对路径，无封装边界，
`no-restricted-imports` 与包声明落地前（A 阶段）没有任何制度约束。

## Decision

1. 新增 `@voxnelo/learning`（`packages/learning/service.ts`）作为 UI 唯一入口：
   快照加载、浏览/练习事件、收藏标记、选句、统计、朗读/静音，底层异常收口为
   `ServiceError` 并记日志，UI 只做展示与导航。
2. 录音 `useRecorder` 保留在 web 层（MediaRecorder 天生 React 绑定），
   其持久化副作用经门面落盘。
3. UI 仅允许引用 `@voxnelo/learning` 与 `@voxnelo/content`；
   `apps/desktop` 仅允许引用 `@voxnelo/core`；包间依赖由 dependency-cruiser 门禁锁死。
4. `APP_VERSION` 经门面顺带 re-export，供 UI 版本展示单源引用。

## Consequences

- 新增依赖方向：`learning → {audio, content, core, storage}`（`workspace:*` 声明），
  其余包维持 `content ← core ← storage` 的 DAG，不引入环。
- UI 单测未来可对门面 mock，无需触 Dexie/语音 API。
- `docs/06` 目录结构与模块边界已同步修订。
