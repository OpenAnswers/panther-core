import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const BASE_URL = process.env.URL ?? 'http://localhost:3901';
const E2E_CONFIG = path.resolve(__dirname, 'test/e2e/.runtime/config.e2e.yml');

export default defineConfig({
  testDir: './test/e2e',
  timeout: 30_000,
  webServer: {
    command: 'tsx test/e2e/start-server.ts',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      OA_CONFIG_FILE: E2E_CONFIG,
      NODE_ENV: 'test',
    },
  },
  use: {
    baseURL: BASE_URL,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'test/e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: 'test/e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});
