import {env} from 'cloudflare:workers';
import {getAdminSession} from '@/lib/admin/session';
import {adminConsole,sameOriginMutation} from '@/lib/racing-admin/commands';

export const dynamic='force-dynamic';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
async function handle(req:Request,mutate:boolean){
 const e=env as unknown as {RACING_ISOLATED_DB?:D1Database;RACING_ADMIN_ORIGIN?:string;RACING_SEAL_KEY?:string};
 if(!e.RACING_ISOLATED_DB||!e.RACING_ADMIN_ORIGIN)return reply({error:'DISABLED'},503);
 if(mutate&&!sameOriginMutation(req,e.RACING_ADMIN_ORIGIN))return reply({error:'FORBIDDEN'},403);
 const session=await getAdminSession();if(!session)return reply({error:'LOGIN_REQUIRED'},401);
 try{
  const service=await adminConsole(e.RACING_ISOLATED_DB,session,e.RACING_SEAL_KEY);
  if(!mutate)return reply(await service.list());
  const raw=await req.text();if(raw.length>2048)return reply({error:'TOO_LARGE'},413);
  const cmd=JSON.parse(raw);if(!cmd||typeof cmd!=='object'||Array.isArray(cmd))return reply({error:'INVALID_COMMAND'},400);
  return reply({result:await service.execute(cmd)??'OK'});
 }catch(err){
  const code=err instanceof Error?err.message:'';
  if(code==='FORBIDDEN')return reply({error:code},403);
  if(err instanceof SyntaxError||['INVALID_COMMAND','INVALID_MONDAY','REASON_REQUIRED'].includes(code))return reply({error:'INVALID_INPUT'},400);
  if(['SEASON_CONFLICT','STATE_CONFLICT','SEAL_DEADLINE'].includes(code))return reply({error:code},409);
  return reply({error:'OPERATION_UNAVAILABLE'},503);
 }
}
export const GET=(req:Request)=>handle(req,false);
export const POST=(req:Request)=>handle(req,true);
