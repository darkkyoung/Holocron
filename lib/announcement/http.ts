import {privateJson,publicJson,PublicMutationError} from '../credit/rewards/http';
import {AnnouncementError,MAX_ANNOUNCEMENT_BODY,publicAnnouncement,validAnnouncementId} from './domain';
import {readAnnouncement,saveAnnouncement} from './repository';
import {imageBytes} from './image';
type Dependencies={database:()=>D1Database;authorized:()=>Promise<boolean>;now?:()=>number};
export async function handleAdminAnnouncement(request:Request,deps:Dependencies){
 try{
  if(!['GET','POST'].includes(request.method))return privateJson({error:'METHOD_NOT_ALLOWED'},405);
  if(!await deps.authorized())return privateJson({error:'UNAUTHORIZED'},401);
  if(request.method==='GET')return privateJson(await readAnnouncement(deps.database()));
  const site=request.headers.get('sec-fetch-site');if(site&&site!=='same-origin')throw new PublicMutationError(403,'');
  const body=await publicJson(request,MAX_ANNOUNCEMENT_BODY);
  return privateJson(await saveAnnouncement(deps.database(),body,new Date(deps.now?.()??Date.now())));
 }catch(error){
  const status=error instanceof AnnouncementError||error instanceof PublicMutationError?error.status:503;
  return privateJson({error:error instanceof AnnouncementError?error.code:status===503?'ANNOUNCEMENT_UNAVAILABLE':status===413?'PAYLOAD_TOO_LARGE':status===403?'FORBIDDEN':'INVALID_REQUEST'},status);
 }
}
export async function handlePublicAnnouncement(request:Request,database:()=>D1Database,image=false){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox",'Cross-Origin-Resource-Policy':'same-origin'};
 if(request.method!=='GET')return new Response(null,{status:405,headers});
 try{
  const url=new URL(request.url),id=url.searchParams.get('id'),revision=url.searchParams.get('revision');
  if(image&&(!validAnnouncementId(id)||!revision||!/^[1-9][0-9]{0,15}$/.test(revision)))return new Response(null,{status:404,headers});
  const value=await readAnnouncement(database()),publicValue=publicAnnouncement(value);
  if(!image)return Response.json({announcement:publicValue},{headers});
  if(!publicValue||value.id!==id||String(value.revision)!==revision||!value.image)return new Response(null,{status:404,headers});
  const bytes=imageBytes(value.image);
  return new Response(bytes,{headers:{...headers,'Content-Type':'image/webp','Content-Length':String(bytes.length)}});
 }catch{return image?new Response(null,{status:503,headers}):Response.json({announcement:null},{status:503,headers});}
}
