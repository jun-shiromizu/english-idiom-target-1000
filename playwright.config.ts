import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173/english-idiom-target-1000/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:5173/english-idiom-target-1000/',
        reuseExistingServer: !process.env.CI,
      },
  retries: process.env.CI ? 2 : 0,
})
