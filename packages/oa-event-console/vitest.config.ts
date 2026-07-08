import { defineConfig, mergeConfig } from 'vitest/config';

import { testGlobalExpose } from './test/ui/vitest-plugin-globals';
import baseConfig from './vite.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [testGlobalExpose()],

    test: {
      environment: 'jsdom',
      setupFiles: ['./test/ui/setup-globals.ts', './test/ui/setup.ts'],
      include: ['test/ui/**/*.test.ts'],
      globals: true,
    },
  })
);
