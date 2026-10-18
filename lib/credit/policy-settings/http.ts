import {publicJson,privateJson,PublicMutationError} from '../rewards/http';
import {PolicyError} from './domain';
import {policyDashboard,savePolicy} from './repository';
type Dependencies={authorized:()=>Promise<boolean>;database:()=>D1Database;now?:()=>number};
/** Authentication is checked before reading D1; mutations require an explicit same-origin POST. */
export async function handlePolicy(request:Request,deps:Dependencies){
  try{
    if(!['GET','POST'].includes(request.method))return privateJson({error:'METHOD_NOT_ALLOWED'},405);
    if(!await deps.authorized())return privateJson({error:'UNAUTHORIZED'},401);
    if(request.method==='POST'){
      const site=request.headers.get('sec-fetch-site');
      if(site&&site!=='same-origin')throw new PublicMutationError(403,'');
      const body=await publicJson(request,4096);
      if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).sort().join(',')!=='expectedVersion,values')throw new PolicyError('INVALID_POLICY',400);
      const v=body as Record<string,unknown>;await savePolicy(deps.database(),v.expectedVersion,v.values,new Date(deps.now?.()??Date.now()));
    }
    return privateJson(await policyDashboard(deps.database(),deps.now?.()??Date.now()));
  }catch(error){
    const status=error instanceof PolicyError||error instanceof PublicMutationError?error.status:503;
    const code=error instanceof PolicyError?error.code:status===403?'FORBIDDEN':status===413?'PAYLOAD_TOO_LARGE':status===415?'UNSUPPORTED_MEDIA_TYPE':status===400?'INVALID_POLICY':'POLICY_UNAVAILABLE';
    return privateJson({error:code},status);
  }
}
