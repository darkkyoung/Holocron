import {privateJson,publicJson,PublicMutationError} from '../credit/rewards/http';
import {defaultVisibility,VisibilityError} from './domain';
import {readVisibility,saveVisibility} from './repository';
type Dependencies={database:()=>D1Database;authorized:()=>Promise<boolean>};
export async function handleVisibility(request:Request,deps:Dependencies){
 try{
  if(!await deps.authorized())return privateJson({error:'UNAUTHORIZED'},401);
  if(request.method==='GET'){
   try{return privateJson({value:await readVisibility(deps.database()),repairRequired:false});}
   catch{return privateJson({value:{...defaultVisibility(),mode:'MAINTENANCE'},repairRequired:true});}
  }
  if(request.method!=='POST')return privateJson({error:'METHOD_NOT_ALLOWED'},405);
  const site=request.headers.get('sec-fetch-site');if(site&&site!=='same-origin')throw new PublicMutationError(403,'');
  return privateJson({value:await saveVisibility(deps.database(),await publicJson(request,8192)),repairRequired:false});
 }catch(error){return privateJson({error:error instanceof VisibilityError?error.code:'VISIBILITY_UNAVAILABLE'},error instanceof VisibilityError||error instanceof PublicMutationError?error.status:503);}
}
