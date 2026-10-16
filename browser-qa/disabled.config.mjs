import base from './playwright.config.mjs';

const config={
  ...base,
  testMatch:'disabled.spec.mjs',
  testIgnore:[],
  outputDir:'disabled-results',
  reporter:[['list'],['html',{outputFolder:'disabled-report',open:'never'}]],
  webServer:{...base.webServer,env:{...base.webServer.env,HOLOCRON_ASSISTANT_ENABLED:'false'}},
};
export default config;
