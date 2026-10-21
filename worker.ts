// Vinext's documented custom Worker delegation point. Keep the request intact.
import handler from 'vinext/server/fetch-handler';
import {withNetworkObservation} from './lib/observability/assistant-network';

const worker={
  fetch(request:Request,env:Record<string,unknown>,ctx:ExecutionContext){
    return withNetworkObservation(request,env,()=>handler.fetch(request,env,ctx));
  },
};
export default worker;
