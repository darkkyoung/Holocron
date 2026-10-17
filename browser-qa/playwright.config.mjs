import {defineConfig,devices} from '@playwright/test';
import {artifactPath,projectRoot} from './paths.mjs';

const baseURL='http://127.0.0.1:5173';

export default defineConfig({
  testDir:'.',
  projects:[
    {name:'smoke',testMatch:'smoke.spec.mjs',use:{trace:'on'}},
    {name:'acceptance',testMatch:['assistant.spec.mjs','mobile-news.spec.mjs'],dependencies:['smoke']},
  ],
  timeout:45_000,
  expect:{timeout:10_000},
  retries:0,
  workers:1,
  reporter:[['list'],['html',{outputFolder:artifactPath('report'),open:'never'}]],
  outputDir:artifactPath('results'),
  use:{
    ...devices['Desktop Chrome'],
    baseURL,
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
  },
  webServer:{
    command:'node browser-qa/start-web-server.mjs',
    cwd:projectRoot,
    url:baseURL+'/assistant',
    reuseExistingServer:false,
    timeout:120_000,
    env:{
      HOLOCRON_ASSISTANT_ENABLED:'true',
      CLOUDFLARE_CF_FETCH_ENABLED:'false',
      WRANGLER_SEND_METRICS:'false',
    },
  },
});
