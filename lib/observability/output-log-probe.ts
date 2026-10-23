import {privateJson,publicJson,PublicMutationError} from '../credit/rewards/http';
import {readVisibility} from '../site-visibility/repository';
import {OutputValidationError,observeOutput,type OutputObserver} from '../assistant/output-diagnostic';
import {consumeOutputLogProbe} from './output-log-probe-repository';

type Dependencies={
  authorized:()=>Promise<boolean>;database:()=>D1Database;
  enabled:unknown;window:unknown;createLogger:()=>OutputObserver;now?:()=>number;
};
const utc=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
/** Operator configuration only, never a request parameter. Strict UTC dates
 * prevent Date.parse normalization (e.g. February 30) from opening a window. */
export function outputProbeWindow(value:unknown,now:number){
  if(typeof value!=='string'||!Number.isSafeInteger(now)||now<0)return null;
  const parts=value.split('/');if(parts.length!==2||parts.some(p=>!utc.test(p)))return null;
  const [start,end]=parts.map(Date.parse);
  if(!Number.isFinite(start)||!Number.isFinite(end)||new Date(start).toISOString()!==parts[0]||new Date(end).toISOString()!==parts[1]||end<=start||end-start>600_000||now<start||now>=end)return null;
  return {start,end};
}
const reject=(error:string,status:number)=>privateJson({error,retryAllowed:false},status);
export async function handleOutputLogProbe(request:Request,deps:Dependencies){
  try{
    if(!await deps.authorized())return reject('UNAUTHORIZED',401);
    if(request.method!=='POST')return reject('METHOD_NOT_ALLOWED',405);
    if(new URL(request.url).search)return reject('INVALID_PROBE_REQUEST',400);
    const site=request.headers.get('sec-fetch-site');
    if(site&&site!=='same-origin')return reject('INVALID_PROBE_ORIGIN',403);
    // Reuse existing exact Origin/content-type/streamed body-size checks.
    const input=await publicJson(request,32);
    if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)return reject('INVALID_PROBE_REQUEST',400);
    const clock=deps.now??Date.now,window=outputProbeWindow(deps.window,clock());
    if(deps.enabled!=='false'||!window)return reject('PROBE_DISABLED',409);
    const db=deps.database();
    if((await readVisibility(db)).mode!=='MAINTENANCE')return reject('PROBE_DISABLED',409);
    const now=clock();if(!outputProbeWindow(deps.window,now))return reject('PROBE_DISABLED',409);
    let consumed;
    try{consumed=await consumeOutputLogProbe(db,window,now);}
    catch{return reject('PROBE_CONSUMPTION_UNKNOWN',503);}
    if(!consumed)return reject('PROBE_UNAVAILABLE',409);
    // From here the attempt is permanently spent, even if the process dies,
    // the window expires, visibility changes, or the Console Sink fails.
    try{
      if(outputProbeWindow(deps.window,clock())&&(await readVisibility(db)).mode==='MAINTENANCE'&&outputProbeWindow(deps.window,clock())){
        const synthetic=new OutputValidationError('SCHEMA_TYPE','$');
        observeOutput(deps.createLogger(),synthetic.diagnostic);
      }
    }catch{/* Consumption remains final; never log exception text or retry. */}
    // Acknowledges only the committed marker, NOT console/cloud delivery.
    return privateJson({status:'consumed'});
  }catch(error){
    return reject(error instanceof PublicMutationError?'INVALID_PROBE_REQUEST':'PROBE_UNAVAILABLE',error instanceof PublicMutationError?error.status:503);
  }
}
