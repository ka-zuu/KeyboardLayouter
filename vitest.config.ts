import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// vitest の `projects` はそれぞれ独立した Vite 設定として解決されるため、
// ルート直下の `resolve.alias` は各 project に継承されない。
// tsconfig.json の paths (`@/*`) と同じ内容をここでも定義する。
const alias = {
  '@': new URL('./src', import.meta.url).pathname,
};

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
          exclude: ['tests/unit/ui/**'],
        },
      },
      {
        plugins: [react()],
        resolve: { alias },
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['tests/unit/ui/**/*.test.ts', 'tests/unit/ui/**/*.test.tsx'],
          setupFiles: ['./tests/unit/ui/setup.ts'],
        },
      },
    ],
  },
});
