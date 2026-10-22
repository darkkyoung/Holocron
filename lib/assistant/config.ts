import {env} from 'cloudflare:workers';
export function assistantRetrievalConfig(){
  const config=env as unknown as Record<string,string|undefined>;
  return {accessPolicy:'account-v1' as const,identitySecrets:{account:config.HOLOCRON_ACCOUNT_SESSION_SECRET,guest:config.HOLOCRON_GUEST_SIGNING_SECRET},enabled:config.HOLOCRON_ASSISTANT_ENABLED==='true',secret:config.HOLOCRON_ASSISTANT_SIGNING_SECRET,abuseSecret:config.HOLOCRON_ASSISTANT_ABUSE_SECRET};
}
