import {env} from 'cloudflare:workers';
import {assistantRetrievalConfig} from './config';
export function assistantGenerationConfig(){
  const config=env as unknown as Record<string,string|undefined>;
  return {...assistantRetrievalConfig(),profileId:config.HOLOCRON_ASSISTANT_PROFILE,apiKey:config.HOLOCRON_ASSISTANT_OPENAI_API_KEY,
    identitySecrets:{account:config.HOLOCRON_ACCOUNT_SESSION_SECRET,guest:config.HOLOCRON_GUEST_SIGNING_SECRET}};
}
