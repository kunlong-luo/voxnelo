import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginTailwindcss } from '@rsbuild/plugin-tailwindcss';

export default defineConfig({
  plugins: [pluginReact(), pluginTailwindcss()],
  source: { entry: { index: './apps/web/src/main.tsx' } },
  html: { template: './apps/web/index.html' },
  output: {
    distPath: { root: 'dist' },
    assetPrefix: './',
  },
  server: { port: 3000, host: '127.0.0.1' },
});
