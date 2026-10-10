import {defineConfig, devices} from '@playwright/test';

const baseURL = process.env.THEME_URL || 'http://127.0.0.1:9292';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: process.env.CI
    ? 'test-results'
    : `test-results/run-${process.pid}`,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: {...devices['Desktop Chrome'], viewport: {width: 390, height: 844}},
    },
    {
      name: 'tablet',
      use: {...devices['Desktop Chrome'], viewport: {width: 1024, height: 900}},
    },
    {
      name: 'desktop',
      use: {...devices['Desktop Chrome'], viewport: {width: 1728, height: 1000}},
    },
  ],
});
