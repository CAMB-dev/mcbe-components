import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'ore-external-server-native.spec.ts',workers:1,retries:0,timeout:60000,
 outputDir:'.cache/ore-external-server-native-comparison-02/results',reporter:[['list'],['json',{outputFile:'.cache/ore-external-server-native-comparison-02/RESULT.json'}]],
 use:{...devices['Desktop Chrome'],viewport:{width:2570,height:1402},deviceScaleFactor:1,baseURL:'http://127.0.0.1:5463'},
 webServer:{command:'npm run dev -- --port 5463',url:'http://127.0.0.1:5463',reuseExistingServer:false}
});
