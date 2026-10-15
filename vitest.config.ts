import path from 'node:path';
import { defineConfig } from 'vitest/config';

// 运行环境保持 node：现有用例均为纯逻辑与 Dexie 持久层（经 fake-indexeddb 垫片），
// 暂无 DOM/组件测试；引入组件测试时再评估 jsdom/happy-dom。
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
    coverage: {
      provider: 'v8',
      include: ['packages/**/*.ts', 'apps/**/*.ts', 'apps/**/*.tsx'],
    },
  },
});
