import {privateJson,publicJson,PublicMutationError} from '../credit/rewards/http';
import {IdentityError} from '../identity/guest-crypto';
import {AssistantError,unicodeLength} from './types';
import {requestId} from './limits';
import {assistantErrorResponse} from './http';
import {validateGenerate} from './generate-validation';
import {generateArchive,GenerationFailure,type GenerateDependencies} from './generation';
export async function handleGenerate(request:Request,deps:GenerateDependencies&{database:()=>D1Database}){
  try{
    if(request.method!=='POST')throw new PublicMutationError(405,'');
    if(!deps.enabled)throw new AssistantError('ASSISTANT_UNAVAILABLE',503);
    const site=request.headers.get('sec-fetch-site');if(site&&site!=='same-origin')throw new PublicMutationError(403,'');
    const raw=await publicJson(request,16*1024);
    if(raw&&typeof raw==='object'&&(raw as {mode?:unknown}).mode==='script')throw new AssistantError('ASSISTANT_UNAVAILABLE',503);
    let input;
    if(raw&&typeof raw==='object'&&!Array.isArray(raw)&&(raw as {mode?:unknown}).mode==='chat'){
      const v=raw as Record<string,unknown>;
      if(Object.keys(v).sort().join(',')!=='mode,policyVersion,query,requestId'||typeof v.query!=='string'||!v.query.trim()||unicodeLength(v.query)>500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v.query)||typeof v.policyVersion!=='number'||!Number.isSafeInteger(v.policyVersion)||v.policyVersion<1)throw new AssistantError('INVALID_REQUEST');
      input={mode:'chat' as const,query:v.query.trim(),requestId:requestId(v.requestId),policyVersion:v.policyVersion};
    }else input=validateGenerate(raw);
    return privateJson(await generateArchive(deps.database(),request,input,deps));
  }catch(error){
    if(error instanceof IdentityError)return assistantErrorResponse(new AssistantError(error.code==='INVALID_IDENTITY'?'LOGIN_REQUIRED':'OWNER_UNAVAILABLE',error.code==='INVALID_IDENTITY'?401:503));
    const response=assistantErrorResponse(error);
    if(error instanceof GenerationFailure)return privateJson({...await response.json() as object,credit:error.credit},response.status);
    return response;
  }
}
