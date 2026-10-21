// Temporary, server-only observation. Never a source of admission identity.
import {AsyncLocalStorage} from 'node:async_hooks';
import {isIP} from 'node:net';

type Stage='A_WORKER'|'B_ENTRY'|'B_HEADERS'|'B_RSC'|'B_URL_BEFORE'|'B_URL_AFTER'|'B_NEXT_BEFORE'|'B_NEXT_AFTER'|'C_ROUTE'|'D_CHECK';
type Signal='PRESENT'|'MISSING'|'VALID'|'INVALID';
type Observation={stage:Stage;cf:Signal;colo:Signal;ipHeader:Signal;ipPredicate:Signal;ipSyntax:Signal;object?:number;decision?:'TRUSTED_NETWORK_OK'|'NETWORK_UNAVAILABLE'};
type Trace={id:string;observations:Observation[];requests:WeakMap<Request,number>;nextRequest:number};
const context=new AsyncLocalStorage<Trace>();
// Deliberately one observation per isolate lifetime, not a claimed global lock.
let consumed=false;
const stages=new Set<Stage>(['A_WORKER','B_ENTRY','B_HEADERS','B_RSC','B_URL_BEFORE','B_URL_AFTER','B_NEXT_BEFORE','B_NEXT_AFTER','C_ROUTE','D_CHECK']);

export function networkObservationActive(){return !!context.getStore();}

export function observeNetwork(stage:Stage,request:Request,decision?:boolean){
  const trace=context.getStore();
  if(!trace||!stages.has(stage)||trace.observations.length>=16)return;
  const cf=(request as Request&{cf?:{colo?:unknown}}).cf;
  const ip=request.headers.get('CF-Connecting-IP');
  // Keep the current admission predicate and strict IP syntax distinct. Neither
  // classification changes trustedEdgeNetwork's existing decision.
  const observation:Observation={stage,cf:cf&&typeof cf==='object'?'PRESENT':'MISSING',
    colo:cf?.colo===undefined?'MISSING':typeof cf.colo==='string'&&cf.colo.length>0?'VALID':'INVALID',
    ipHeader:ip===null?'MISSING':'PRESENT',
    ipPredicate:ip&&ip.length<=45&&/^[0-9a-fA-F:.]+$/.test(ip)?'VALID':'INVALID',
    ipSyntax:ip&&ip.length<=45&&isIP(ip)!==0?'VALID':'INVALID'};
  if(stage==='D_CHECK'&&typeof decision==='boolean')observation.decision=decision?'TRUSTED_NETWORK_OK':'NETWORK_UNAVAILABLE';
  // Request-local ordinals show object reconstruction without any stable ID.
  if(!trace.requests.has(request))trace.requests.set(request,++trace.nextRequest);
  observation.object=trace.requests.get(request);
  trace.observations.push(observation);
}

export function observedRequest(stage:Stage,request:Request){observeNetwork(stage,request);return request;}

export async function withNetworkObservation<T>(request:Request,env:Record<string,unknown>,next:()=>Promise<T>):Promise<T>{
  // Explicit OFF, a server-configured UTC window <=10 minutes, and only the
  // existing retrieval POST. No query/body/cookie reading, no client activation.
  const window=env.HOLOCRON_ASSISTANT_NETWORK_DIAGNOSTICS_WINDOW;
  const validWindow=typeof window==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(window);
  const [start,end]=validWindow?window.split('/').map(Date.parse):[];
  const now=Date.now();
  if(consumed||env.HOLOCRON_ASSISTANT_ENABLED!=='false'||!Number.isFinite(start)||!Number.isFinite(end)||
    end<=start||end-start>600_000||now<start||now>=end||request.method!=='POST'||
    new URL(request.url).pathname!=='/api/assistant/retrieve')return next();
  consumed=true;
  const trace:Trace={id:crypto.randomUUID(),observations:[],requests:new WeakMap(),nextRequest:0};
  return context.run(trace,async()=>{
    observeNetwork('A_WORKER',request);
    try{return await next();}
    finally{
      // Exactly one bounded metadata-only server event; never a public response.
      console.info(JSON.stringify({event:'ASSISTANT_NETWORK_OBSERVATION_V1',id:trace.id,observations:trace.observations}));
    }
  });
}
