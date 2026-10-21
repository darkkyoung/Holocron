import {db} from '@/lib/news';
import {assistantRetrievalConfig} from '@/lib/assistant/config';
import {handleRetrieve} from '@/lib/assistant/http';
import {networkObservationActive,observeNetwork} from '@/lib/observability/assistant-network';
import {trustedEdgeNetwork} from '@/lib/assistant/abuse-identity';
function handle(request:Request){
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
