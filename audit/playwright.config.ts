import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'capture.ts',
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1, // serial — we share auth cache
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    screenshot: 'off', // we handle screenshots manually
    trace: 'off',
  },
  projects: [
    {
      name: 'capture',
      use: { browserName: 'chromium' },
    },
  ],
});
