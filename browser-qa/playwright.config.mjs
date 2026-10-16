import {defineConfig,devices} from '@playwright/test';
import {fileURLToPath} from 'node:url';

const baseURL='http://127.0.0.1:5173';
const projectRoot=fileURLToPath(new URL('../',import.meta.url));

export default defineConfig({
  testDir:'.',
  testMatch:'*.spec.mjs',
  testIgnore:'disabled.spec.mjs',
  timeout:45_000,
  expect:{timeout:10_000},
  retries:0,
  workers:1,
  reporter:[['list'],['html',{outputFolder:'report',open:'never'}]],
  outputDir:'results',
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
