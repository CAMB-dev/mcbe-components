import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./tests',fullyParallel:false,workers:1,retries:0,timeout:30000,
 outputDir:'.cache/ore-external-server-qa-01/results-03',reporter:[['list'],['json',{outputFile:'.cache/ore-external-server-qa-01/browser-03.json'}]],
 use:{baseURL:'http://127.0.0.1:5462',trace:'retain-on-failure'},
 projects:[
  {name:'desktop',testMatch:['ore-external-server.spec.ts','ore-text-field.spec.ts','ore-player-permissions.spec.ts'],use:{...devices['Desktop Chrome'],viewport:{width:1440,height:1000}}},
  {name:'mobile',testMatch:['ore-external-server.spec.ts','ore-text-field.spec.ts','ore-player-permissions.spec.ts'],use:{...devices['Pixel 7']}}
 ],
 webServer:{command:'npm run dev -- --port 5462',url:'http://127.0.0.1:5462',reuseExistingServer:false}
});
