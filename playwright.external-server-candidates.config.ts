import {defineConfig, devices} from '@playwright/test';

// Reproduce the frozen scalar-opacity candidate, including its known failures.
// These experimental results are separate from qualified source contracts.
export default defineConfig({
  testDir: './tests', testMatch: 'external-server-materials.spec.ts',
  retries: 0, workers: 1,
  reporter: [['list']],
  use: {...devices['Desktop Chrome'], viewport: {width:1440,height:1000},
    deviceScaleFactor:1, baseURL:'http://127.0.0.1:5173',
    trace:'retain-on-failure', screenshot:'only-on-failure', reducedMotion:'reduce'},
  webServer: {command:'npm run dev', url:'http://127.0.0.1:5173', reuseExistingServer:!process.env.CI},
});
