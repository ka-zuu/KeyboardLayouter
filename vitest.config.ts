import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
    },
  },
  test: {
    // M1/M2 で core/io/ui の実装が入るまではテストが 0 件になるため許容する。
    passWithNoTests: true,
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
          exclude: ['tests/unit/ui/**'],
        },
      },
      {
        plugins: [react()],
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
