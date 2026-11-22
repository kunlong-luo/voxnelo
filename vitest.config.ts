import path from 'node:path';
import { defineConfig } from 'vitest/config';

// 默认使用 node 运行纯逻辑测试；组件测试在文件头通过
// @vitest-environment jsdom 显式启用 DOM。jsdom 的 Web Storage 在
// setup-jsdom-storage.ts 中修正；涉及 IndexedDB 的组件测试还需要
// fake-indexeddb/auto，避免把数据读写错误误当成通过的 UI 测试。
const workspace = (name: string) => path.resolve(`packages/${name}/index.ts`);

export default defineConfig({
  resolve: {
    alias: {
      '@voxnelo/audio': workspace('audio'),
      '@voxnelo/content': workspace('content'),
      '@voxnelo/core': workspace('core'),
      '@voxnelo/learning': workspace('learning'),
      '@voxnelo/storage': workspace('storage'),
    },
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    setupFiles: ['./tests/setup-jsdom-storage.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/**/*.ts', 'apps/**/*.ts', 'apps/**/*.tsx'],
      // 主进程与渲染入口不在 vitest 内验证（构建 + 冒烟覆盖），不计入覆盖率
      exclude: ['apps/desktop/**', 'apps/web/src/main.tsx'],
      thresholds: { lines: 85, branches: 70, functions: 65 },
    },
  },
});
