import base from './playwright.config.mjs';
import {artifactPath} from './paths.mjs';

const config={
  ...base,
  projects:[{name:'disabled',testMatch:'disabled.spec.mjs'}],
  outputDir:artifactPath('disabled-results'),
  reporter:[['list'],['html',{outputFolder:artifactPath('disabled-report'),open:'never'}]],
  webServer:{...base.webServer,env:{...base.webServer.env,HOLOCRON_ASSISTANT_ENABLED:'false'}},
};
export default config;
