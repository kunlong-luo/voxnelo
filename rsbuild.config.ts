import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';
import path from 'node:path';

const workspace = (name: string) => path.resolve(`packages/${name}/index.ts`);

export default defineConfig({
  plugins: [pluginReact(), pluginTailwindcss()],
  source: { entry: { index: './apps/web/src/main.tsx' } },
  html: { template: './apps/web/index.html' },
  output: {
    distPath: { root: 'dist' },
    assetPrefix: './',
  },
  resolve: {
    alias: {
      '@voxnelo/audio': workspace('audio'),
      '@voxnelo/content': workspace('content'),
      '@voxnelo/core': workspace('core'),
      '@voxnelo/learning': workspace('learning'),
      '@voxnelo/storage': workspace('storage'),
    },
  },
  server: { port: 3000, host: '127.0.0.1' },
});
