import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['node_modules/', 'dist/', 'dist-electron/', 'release/', 'coverage/'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Node-only tooling is not a browser script; new .mjs checks use process/console.
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // 包只能走 @voxnelo/* barrel 互相引用，禁止深路径相对引用
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/packages/**'],
              message: '跨包引用请走 @voxnelo/* barrel，禁止深路径相对引用。',
            },
          ],
        },
      ],
    },
  },
);
