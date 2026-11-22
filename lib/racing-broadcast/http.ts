import {RacingRepository} from '../racing/phase3a/repository';
import {digest} from '../racing/phase3a/crypto';
import type {Meeting,QualifyingRecord} from '../racing/v2/types';
import {privateRecord,type Bindings} from './private';
import {qualifying,mainShot,type Entry,type Shot} from './projection';
import {policy as headers} from './gateway';
const reply=(obj:unknown,s=200)=>Response.json(obj,{status:s,headers});
type Frozen={roster:{id:string;name:string;color:string}[];entrants?:{slotId:string;participantId:string;name:string}[]};
export async function watch(req:Request,env:Bindings,clock=Date.now){
 if(req.method!=='GET'||req.headers.has('upgrade'))return reply({error:'UNSUPPORTED'},405);
 const params=new URL(req.url).searchParams,id=params.get('race'),seek=params.get('offset');
 if(params.toString()==='archive=1'){
  try{const rows=await env.RACING_ISOLATED_DB.prepare("SELECT id,starts_at FROM racing_races WHERE state='FINAL' AND final_at<=? ORDER BY starts_at DESC LIMIT 28").bind(clock()).all<{id:string;starts_at:number}>();
   return reply({races:rows.results.map(r=>({race:r.id,start:r.starts_at}))});}catch{return reply({error:'UNAVAILABLE'},503);}
 }
 if([...params.keys()].some(k=>!['race','offset'].includes(k)||params.getAll(k).length!==1)||(id!==null&&!/^(regular:\d{4}-\d\d-\d\d|custom:\d{4}-\d\d-\d\d@1[0-7]):R[1-7]$/.test(id))||(seek!==null&&!/^-?\d{1,10}$/.test(seek)))return reply({error:'INVALID_REQUEST'},400);
 try{
  let now=clock();const repo=new RacingRepository(env.RACING_ISOLATED_DB),archiveOnly=env.RACING_BROADCAST_MODE==='final-only';
  const selected=id??(await repo.statement(archiveOnly?"SELECT id FROM racing_races WHERE state='FINAL' AND final_at<=? ORDER BY starts_at DESC LIMIT 1":'SELECT id FROM racing_races WHERE qualifying_at<=? ORDER BY qualifying_at DESC LIMIT 1',now).first<{id:string}>())?.id;
  const race=selected?await repo.race(selected):null;
  if(!race)return reply({phase:'OFFLINE'});
  if(['QUARANTINED','CANCELLED'].includes(race.state))return reply({phase:'UNAVAILABLE'});
  const final=race.state==='FINAL'&&race.final_at!==null&&now>=race.final_at;
  if(archiveOnly&&!final)return reply({phase:'OFFLINE'});
  if(seek!==null&&!final)return reply({error:'LIVE_ONLY'},409);
  const offset=seek===null?now-race.starts_at:Number(seek),end=final?race.final_at!-race.starts_at:undefined;
  if(seek!==null&&(offset<race.qualifying_at-race.starts_at||offset>end!))return reply({error:'OUT_OF_RANGE'},400);
  let t=Math.min(offset,end??offset);const at=race.starts_at+t;
  const season=await repo.season(race.season_id);if(!season||await digest(season.manifest)!==season.input_hash)throw Error('MANIFEST');
  const m:Frozen=JSON.parse(season.manifest),entries:Entry[]=m.roster.map(r=>{const e=m.entrants?.find(x=>x.slotId===r.id);return {slot:r.id,id:e?.participantId??r.id,name:e?.name??r.name,color:r.color};});
  let shot:Shot={phase:at<race.qualifying_at?'SCHEDULED':'WAITING',riders:[]};
  if(at>=race.qualifying_at){
   const stage=t<0?'qualifying':'main',g=await repo.generation(race.id,stage);
   if(g?.state==='READY'){
    const data=await privateRecord(env,g);
    now=clock();if(seek===null)t=Math.min(now-race.starts_at,end??Infinity);
    // Stage changed while the cold reader was loading qualifying: no speculative main frame.
    if(stage==='main'&&t>=0)shot=mainShot(data as Meeting,t,final&&t===end);
    if(stage==='qualifying'&&t<0)shot=qualifying(data as QualifyingRecord,race.starts_at+t-race.qualifying_at,t>=-120000);
   }
  }
  return reply({race:race.id,serverMs:now,offset:seek===null?now-race.starts_at:t,start:race.starts_at,entries,...shot,...(final?{replayEnd:end,replayCursor:t}:{})});
 }catch{return reply({phase:'WAITING'},503);}
}
