import { defineConfig, mergeConfig } from 'vitest/config';
import baseViteConfig from './vite.config';

export default mergeConfig(
  baseViteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.ts'],
      css: false,
    },
  })
);
