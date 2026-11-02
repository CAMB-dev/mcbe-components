import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./tests',fullyParallel:false,workers:1,retries:0,timeout:30000,
  outputDir:'.cache/ore-text-field-qa-01/browser-results-02',
  reporter:[['list'],['json',{outputFile:'.cache/ore-text-field-qa-01/browser-02.json'}]],
  use:{baseURL:'http://127.0.0.1:5456',trace:'retain-on-failure'},
  projects:[
    {name:'desktop',testMatch:'ore-text-field.spec.ts',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},
    {name:'mobile',testMatch:'ore-text-field.spec.ts',use:{...devices['Pixel 7']}},
    {name:'materials',testMatch:'ore-text-field-materials.spec.ts',use:{...devices['Desktop Chrome'],viewport:{width:1280,height:1000},deviceScaleFactor:1}}
  ],
  webServer:{command:'npm run dev -- --port 5456',url:'http://127.0.0.1:5456',reuseExistingServer:false}
});
