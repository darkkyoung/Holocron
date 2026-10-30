import {env} from 'cloudflare:workers';
import {AssistantError} from '@/lib/assistant/types';
import {assistantErrorResponse} from '@/lib/assistant/http';
import {db} from '@/lib/news';
import {assistantRetrievalConfig} from '@/lib/assistant/config';
import {handleRetrieve} from '@/lib/assistant/http';
import {networkObservationActive,observeNetwork} from '@/lib/observability/assistant-network';
import {trustedEdgeNetwork} from '@/lib/assistant/abuse-identity';
function handle(request:Request){
  // Free-MVP release: legacy paid routes must not charge Credit through direct API calls.
  if((env as unknown as Record<string,string|undefined>).HOLOCRON_ASSISTANT_FREE_MVP_ENABLED==='true')
    return assistantErrorResponse(new AssistantError('ASSISTANT_UNAVAILABLE',503));
  if(networkObservationActive()){
    observeNetwork('C_ROUTE',request);
    // OFF-only read-only probe of the exact Request and existing predicate.
    // No admission/session/DB call; normal OFF response is still returned below.
    observeNetwork('D_CHECK',request,trustedEdgeNetwork(request)!==null);
  }
  return handleRetrieve(request,{...assistantRetrievalConfig(),database:db});
}
export const POST=handle;
export const GET=handle;
export const PUT=handle;
export const PATCH=handle;
export const DELETE=handle;
export const OPTIONS=handle;
export const HEAD=handle;
