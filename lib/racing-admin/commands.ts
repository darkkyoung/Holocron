import {RacingRepository} from '../racing/phase3a/repository';
import {racingOperations} from '../racing/phase3a/operations';
import {bytes,digest} from '../racing/phase3a/crypto';
import type {AdminSessionClaims} from '../admin/session-crypto';

type Grant={operator:string;role:'scheduler'|'incident'|'viewer';expires_at:number};
export function nextMonday(now:number){
 const kst=new Date(now+9*3600000);
 kst.setUTCDate(kst.getUTCDate()+(8-(kst.getUTCDay()||7)));
 return kst.toISOString().slice(0,10);
}
export function sameOriginMutation(req:Request,origin:string){
 return req.headers.get('origin')===origin && new URL(req.url).origin===origin &&
 req.headers.get('content-type')?.split(';')[0]==='application/json' && req.headers.get('x-racing-command')==='1';
}
export async function adminConsole(db:D1Database,session:AdminSessionClaims,keyHex:string|undefined,now=Date.now){
 const repo=new RacingRepository(db), hash=await digest(session.nonce);
 const grant=await repo.statement('SELECT operator,role,expires_at FROM racing_admin_grants WHERE session_hash=? AND expires_at>?',hash,now()).first<Grant>();
 if(!grant||session.exp*1000<=now())throw Error('FORBIDDEN');
 async function list(){
  const rows=await repo.statement('SELECT season_id,id,round_no,qualifying_at,starts_at,state,revision FROM racing_races ORDER BY starts_at DESC LIMIT 140').all();
  const profiles=await repo.statement('SELECT racer_id,display_name,bio,revision FROM racing_profile_directory ORDER BY racer_id').all();
  return {role:grant!.role,races:rows.results,profiles:profiles.results};
 }
 async function execute(cmd:Record<string,unknown>){
  const required=cmd.action==='cancel'?'incident':'scheduler';
  if(required!==grant!.role)throw Error('FORBIDDEN');
  const write=(stmts:D1PreparedStatement[],command:string,target:string)=>db.batch([
   repo.guard('EXISTS(SELECT 1 FROM racing_admin_grants WHERE session_hash=? AND operator=? AND role=? AND expires_at>?) AND ?>?',hash,grant!.operator,required,now(),session.exp*1000,now()),
   ...stmts,repo.audit(null,grant!.operator,command,now(),target)
  ]);
  if(cmd.action==='profile'){
   const {id,name,bio,revision}=cmd;
   if(typeof id!=='string'||!/^r[1-8]$/.test(id)||typeof name!=='string'||!name.trim()||name.length>80||typeof bio!=='string'||bio.length>500||!Number.isSafeInteger(revision)||Number(revision)<0)throw Error('INVALID_COMMAND');
   const change=revision===0?repo.statement('INSERT OR IGNORE INTO racing_profile_directory VALUES(?,?,?,1)',id,name.trim(),bio):repo.statement('UPDATE racing_profile_directory SET display_name=?,bio=?,revision=revision+1 WHERE racer_id=? AND revision=?',name.trim(),bio,id,Number(revision));
   await write([change,repo.guard('changes()=1')],'profile',id);return;
  }
  if(!keyHex||!/^[a-f\d]{64}$/.test(keyHex))throw Error('UNCONFIGURED');
  const key=await crypto.subtle.importKey('raw',bytes(keyHex),'AES-GCM',false,['encrypt']);
  const ops=racingOperations({db,key,role:()=>required,now},write);
  if(cmd.action==='nextWeek')return ops.createRegular(nextMonday(now()));
  if(cmd.action==='seal'&&typeof cmd.monday==='string')return ops.createRegular(cmd.monday);
  if(typeof cmd.id==='string'&&/^regular:\d{4}-\d\d-\d\d:R[1-7]$/.test(cmd.id)){
   if(cmd.action==='advance')return ops.advance(cmd.id);
   if(cmd.action==='cancel'&&Number.isSafeInteger(cmd.revision)&&typeof cmd.reason==='string')return ops.cancel(cmd.id,Number(cmd.revision),cmd.reason);
  }
  throw Error('INVALID_COMMAND');
 }
 return {list,execute};
}
