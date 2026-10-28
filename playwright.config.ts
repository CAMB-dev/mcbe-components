import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', fullyParallel: true, retries: 0, workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure', screenshot: 'only-on-failure', reducedMotion: 'reduce' },
  projects: [
    { name: 'desktop', testMatch: ['components.spec.ts', 'combobox.spec.ts'], use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', testMatch: ['components.spec.ts', 'combobox.spec.ts'], use: { ...devices['Pixel 7'], defaultBrowserType: 'chromium' } },
    { name: 'pixels', testMatch: 'pixels.spec.ts', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 } },
  ],
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI },
});
