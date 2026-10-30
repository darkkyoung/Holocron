import {env} from 'cloudflare:workers';
import {db} from '@/lib/news';
import {assistantGenerationConfig} from '@/lib/assistant/generation-config';
import {handleFreeMvp} from '@/lib/assistant/free-mvp';

function handle(request:Request){
  const config=assistantGenerationConfig();
  const flags=env as unknown as Record<string,string|undefined>;
  return handleFreeMvp(request,{
    enabled:config.enabled&&flags.HOLOCRON_ASSISTANT_FREE_MVP_ENABLED==='true',
    database:db,accountSecret:config.identitySecrets.account,
    abuseSecret:config.abuseSecret,profileId:config.profileId,apiKey:config.apiKey,
  });
}
export const POST=handle;
export const GET=handle;
export const PUT=handle;
export const PATCH=handle;
export const DELETE=handle;
export const OPTIONS=handle;
export const HEAD=handle;
