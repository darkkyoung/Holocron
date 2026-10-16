import {AssistantError,type AssistantCode} from './types';
import type {Usage} from './cost';
import {estimatedCost} from './cost';
import {providerKey,type ProviderProfile} from './provider-profile';
export const RESPONSES_ENDPOINT='https://api.openai.com/v1/responses';
export class ProviderError extends AssistantError{
  constructor(code:AssistantCode,status=502,public readonly usage?:Usage){super(code,status);}
}
export type ProviderFetch=(url:string,init:RequestInit)=>Promise<Response>;
async function boundedJson(response:Response){
  if(!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??''))throw new ProviderError('INVALID_OUTPUT');
  const reader=response.body?.getReader();if(!reader)throw new ProviderError('INVALID_OUTPUT');
  const decoder=new TextDecoder('utf-8',{fatal:true});let text='',bytes=0;
  try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>128*1024){await reader.cancel();throw new ProviderError('OUTPUT_LIMIT');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();const data=JSON.parse(text);if(!data||typeof data!=='object'||Array.isArray(data))throw new ProviderError('INVALID_OUTPUT');return data as Record<string,unknown>;}
  catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError('INVALID_OUTPUT');}
  finally{reader.releaseLock();}
}
function usageOf(value:unknown,profile:ProviderProfile):Usage|undefined{
  if(!value||typeof value!=='object')return;
  const v=value as Record<string,unknown>,usage={inputTokens:v.input_tokens as number,outputTokens:v.output_tokens as number};
  try{estimatedCost(profile.cost,usage);return usage;}catch{return;}
}
/** Exactly one fetch. Manual redirects are supported by workerd and never followed.
 * Abort/timeout bounds both headers and body, even with a non-cooperative test transport. */
export async function callResponses(serialized:string,profile:ProviderProfile,key:string,signal:AbortSignal,fetcher:ProviderFetch=fetch,timeoutMs=profile.providerMs){
  providerKey(key);
  const controller=new AbortController();let timedOut=false;
  const cancel=()=>controller.abort();signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
  let rejectAbort:()=>void=()=>{};
  const aborted=new Promise<never>((_,reject)=>{rejectAbort=()=>reject(new ProviderError(timedOut?'PROVIDER_TIMEOUT':'REQUEST_CANCELLED',timedOut?504:409));controller.signal.addEventListener('abort',rejectAbort,{once:true});if(controller.signal.aborted)rejectAbort();});
  try{
    if(controller.signal.aborted)return await aborted;
    return await Promise.race([aborted,(async()=>{
      const response=await fetcher(RESPONSES_ENDPOINT,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:serialized,redirect:'manual',signal:controller.signal});
      if(!response.ok){void response.body?.cancel().catch(()=>{});throw new ProviderError(response.status===429?'PROVIDER_RATE_LIMIT':'PROVIDER_UNAVAILABLE',503);}
      const payload=await boundedJson(response),usage=usageOf(payload.usage,profile);
      if(payload.status!=='completed')throw new ProviderError(payload.status==='incomplete'?'OUTPUT_LIMIT':'INVALID_OUTPUT',502,usage);
      if(payload.model!==profile.model||payload.error!=null||payload.incomplete_details!=null||!Array.isArray(payload.output))throw new ProviderError('INVALID_OUTPUT',502,usage);
      if(payload.output.some(item=>item?.type==='message'&&Array.isArray(item.content)&&item.content.some((c:{type?:string})=>c.type==='refusal')))throw new ProviderError('PROVIDER_REFUSAL',422,usage);
      if(payload.output.length!==1)throw new ProviderError('INVALID_OUTPUT',502,usage);
      const message=payload.output[0],part=message?.content?.[0];
      if(message?.type!=='message'||message.role!=='assistant'||message.status!=='completed'||!Array.isArray(message.content)||message.content.length!==1||part?.type!=='output_text'||typeof part.text!=='string'||!Array.isArray(part.annotations)||part.annotations.length||!usage)throw new ProviderError('INVALID_OUTPUT',502,usage);
      try{return {output:JSON.parse(part.text) as unknown,usage};}catch{throw new ProviderError('INVALID_OUTPUT',502,usage);}
    })()]);
  }catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError(controller.signal.aborted?(timedOut?'PROVIDER_TIMEOUT':'REQUEST_CANCELLED'):'PROVIDER_UNAVAILABLE',503);}
  finally{clearTimeout(timer);signal.removeEventListener('abort',cancel);controller.signal.removeEventListener('abort',rejectAbort);}
}
