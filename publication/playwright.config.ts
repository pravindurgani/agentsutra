import { defineConfig, devices } from '@playwright/test';

const host = '127.0.0.1';
const port = 4321;
const baseURL = `http://${host}:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/e2e/**/*.spec.ts', '**/accessibility/**/*.spec.ts', '**/visual/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 2 } : {}),
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  outputDir: 'test-results',
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  use: {
    baseURL,
    locale: 'en-GB',
    timezoneId: 'Europe/London',
    colorScheme: 'dark',
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build:fixtures && npm run preview -- --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      ASTRO_PREVIEW_BACKGROUND: '0',
      ASTRO_OUT_DIR: '.fixture-dist',
      INCLUDE_FIXTURES: '1',
    },
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: ['**/e2e/no-javascript.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: ['**/e2e/no-javascript.spec.ts'],
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: ['**/e2e/no-javascript.spec.ts'],
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'chromium-no-js',
      testMatch: ['**/e2e/no-javascript.spec.ts'],
      use: { ...devices['Desktop Chrome'], javaScriptEnabled: false },
    },
  ],
});
