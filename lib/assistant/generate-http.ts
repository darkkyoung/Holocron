import {privateJson,publicJson,PublicMutationError} from '../credit/rewards/http';
import {IdentityError} from '../identity/guest-crypto';
import {AssistantError} from './types';
import {assistantErrorResponse} from './http';
import {validateGenerate} from './generate-validation';
import {generateArchive,GenerationFailure,type GenerateDependencies} from './generation';
export async function handleGenerate(request:Request,deps:GenerateDependencies&{database:()=>D1Database}){
  try{
    if(request.method!=='POST')throw new PublicMutationError(405,'');
    if(!deps.enabled)throw new AssistantError('ASSISTANT_UNAVAILABLE',503);
    const site=request.headers.get('sec-fetch-site');if(site&&site!=='same-origin')throw new PublicMutationError(403,'');
    const input=validateGenerate(await publicJson(request,16*1024));
    return privateJson(await generateArchive(deps.database(),request,input,deps));
  }catch(error){
    if(error instanceof IdentityError)return assistantErrorResponse(new AssistantError(error.code==='INVALID_IDENTITY'?'LOGIN_REQUIRED':'OWNER_UNAVAILABLE',error.code==='INVALID_IDENTITY'?401:503));
    const response=assistantErrorResponse(error);
    if(error instanceof GenerationFailure)return privateJson({...await response.json() as object,credit:error.credit},response.status);
    return response;
  }
}
