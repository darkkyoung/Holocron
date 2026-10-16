import {env} from 'cloudflare:workers';
export function assistantRetrievalConfig(){
  const config=env as unknown as Record<string,string|undefined>;
  return {enabled:config.HOLOCRON_ASSISTANT_ENABLED==='true',secret:config.HOLOCRON_ASSISTANT_SIGNING_SECRET};
}
