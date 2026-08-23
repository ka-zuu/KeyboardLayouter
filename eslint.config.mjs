import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'playwright-report/**', 'test-results/**'] },

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },

  // core と io にブラウザ API を持ち込まない (docs/ARCHITECTURE.md のレイヤ分離)
  {
    files: ['src/core/**/*.{ts,tsx}', 'src/io/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {},
    },
    rules: {
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'sessionStorage',
        'indexedDB',
        'navigator',
        'alert',
        'confirm',
        'prompt',
        'fetch',
      ],
      'no-restricted-imports': [
        'error',
        { patterns: ['@/ui/*', '@/state/*', '@/platform/*'] },
      ],
    },
  },

  // io は core にのみ依存する (state 経由の逆流を禁止)
  {
    files: ['src/io/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['@/ui/*', '@/state/*', '@/platform/*'] },
      ],
    },
  },

  {
    files: ['tests/e2e/**/*.{ts,tsx}', 'playwright.config.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ['tests/unit/**/*.{ts,tsx}', 'vitest.config.ts', 'vite.config.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
);
