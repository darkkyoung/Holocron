import type {SealKey} from './keyring';
import {RacingRepository} from './repository';
import {authorize,clock,mondaySchedule,roster,SCORING,type Role} from './domain';
import {canonical,digest,encrypt,secret} from './crypto';
import {descriptor} from './engine';
import {SOURCE_HASH} from './source-manifest';

export function racingOperations(d:{db:D1Database;key:SealKey;now:()=>number;role:()=>Role},
 write:(statements:D1PreparedStatement[],command:string,target:string)=>Promise<unknown> = s=>d.db.batch(s)){
 const repo=new RacingRepository(d.db),now=()=>clock(d.now());
 async function createRegular(monday:string,laps=10){
  return seal('regular:'+monday,monday,mondaySchedule(monday),laps);
 }
 async function createMini(start:string,days:number,hour:number,participants?:string[]){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!Number.isInteger(days)||days<1||days>7||!Number.isInteger(hour)||hour<10||hour>17)throw Error('INVALID_COMMAND');
  const day=Date.parse(start+'T00:00:00Z');
  if(!Number.isFinite(day)||new Date(day).toISOString().slice(0,10)!==start)throw Error('INVALID_COMMAND');
  const schedule=Array.from({length:days},(_,i)=>{const date=day+i*86400000,startsAt=date+(hour-9)*3600000;return {round:i+1,date:new Date(date).toISOString().slice(0,10),startsAt,qualifyingAt:startsAt-3600000};});
  return seal('custom:'+start+'@'+hour,null,schedule,10,participants);
 }
 async function seal(id:string,monday:string|null,schedule:ReturnType<typeof mondaySchedule>,laps:number,participants?:string[]){
  authorize(d.role(),'scheduler');const at=now(),engine=await descriptor(laps);
  // Retried commands compare the requested identities to the immutable snapshot,
  // not to profiles that may have changed since the first successful response.
  if(!monday){
   const prior=await repo.season(id);
   if(prior){
    const sealed=JSON.parse(prior.manifest);
    if(await digest(prior.manifest)!==prior.input_hash||sealed.kind!=='custom'||canonical(sealed.schedule)!==canonical(schedule)||sealed.engine.laps!==laps||canonical(sealed.entrants?.map((e:{participantId:string})=>e.participantId)??null)!==canonical(participants??null))throw Error('SEASON_CONFLICT');
    return id;
   }
  }
  let entrants:{slotId:string;participantId:string;name:string;bio:string;revision:number}[]|undefined;
  if(participants){
   if(participants.length!==8||new Set(participants).size!==8||participants.some(id=>typeof id!=='string'||! /^(r[1-8]|reserve-[a-z0-9][a-z0-9-]{1,21})$/.test(id)))throw Error('INVALID_COMMAND');
   const slots=roster();
   entrants=await Promise.all(participants.map(async(id,i)=>{
    const profile=await repo.statement('SELECT display_name,bio,revision FROM racing_profile_directory WHERE racer_id=?',id).first<{display_name:string;bio:string;revision:number}>();
    const fallback=slots.find(x=>x.id===id);
    if(!profile&&!fallback)throw Error('INVALID_COMMAND');
    return {slotId:slots[i].id,participantId:id,name:profile?.display_name??fallback!.name,bio:profile?.bio??'',revision:profile?.revision??0};
   }));
  }
  const manifest=canonical({id,kind:monday?'regular':'custom',timezone:'Asia/Seoul',schedule,...(entrants?{participantContract:'engine-slot-map-v1',entrants}:{}),roster:roster(),engine,sourceHash:SOURCE_HASH,scoring:SCORING,entropyPolicy:'isolated-external-v1',generationPolicy:'strict-scheduled-start-v1'});
  const inputHash=await digest(manifest),previous=await repo.season(id);
  if(previous){if(previous.input_hash!==inputHash)throw Error('SEASON_CONFLICT');return id;}
  if(at>=schedule[0].qualifyingAt)throw Error('SEAL_DEADLINE');
  const statements=[repo.statement('INSERT OR IGNORE INTO racing_seasons(id,monday,manifest,input_hash,created_at) VALUES(?,?,?,?,?)',id,monday,manifest,inputHash,at),repo.guard('(SELECT input_hash FROM racing_seasons WHERE id=?)=?',id,inputHash)];
  for(const e of entrants??[])statements.push(repo.guard('coalesce((SELECT revision FROM racing_profile_directory WHERE racer_id=?),0)=?',e.participantId,e.revision));
  statements.push(repo.statement('INSERT OR IGNORE INTO racing_engine_versions VALUES(?,?,?)',SOURCE_HASH,engine.version,engine.contract));
  for(const entry of roster())statements.push(repo.statement('INSERT OR IGNORE INTO racing_racers VALUES(?,?)',entry.id,canonical(entry)),repo.statement('INSERT OR IGNORE INTO racing_season_entries VALUES(?,?,?,?)',id,entry.slot,entry.id,canonical(entry)));
  for(const day of schedule){
   const raceId=id+':R'+day.round;
   if(!monday)statements.push(repo.guard('NOT EXISTS(SELECT 1 FROM racing_races WHERE id<>? AND qualifying_at<? AND starts_at+3600000>?)',raceId,day.startsAt+3600000,day.qualifyingAt));
   statements.push(repo.statement('INSERT OR IGNORE INTO racing_races(id,season_id,round_no,qualifying_at,starts_at) VALUES(?,?,?,?,?)',raceId,id,day.round,day.qualifyingAt,day.startsAt));
   for(const stage of ['qualifying','main'] as const){
    const hash=await digest(canonical({raceId,stage,seasonHash:inputHash})),value=secret();
    const commitment=await digest(canonical({secret:value,inputHash:hash})),cipher=await encrypt(d.key,value,hash);
    statements.push(repo.statement('INSERT OR IGNORE INTO racing_generations(race_id,stage,input_hash,commitment,secret_cipher,entropy_ref) VALUES(?,?,?,?,?,?)',raceId,stage,hash,commitment,cipher,`isolated-external-v1:${raceId}:${stage}`));
   }
  }
  // One creation audit even when two schedulers race; immutable identity is the key.
  statements.push(repo.statement("INSERT INTO racing_audit(race_id,actor,command,at,detail) SELECT NULL,'scheduler','seal-season',?,? WHERE NOT EXISTS(SELECT 1 FROM racing_audit WHERE command='seal-season' AND detail=?)",at,id,id));
  await write(statements,'seal-season',id);return id;
 }
 async function advance(id:string){
  authorize(d.role(),'scheduler');const at=now();let r=await repo.race(id);if(!r)throw Error('NOT_FOUND');
  // Reconcile late wakeups from persisted anchors, never from delivery time.
  for(const [from,to,due] of [['READY','RUNNING',r.starts_at],['RUNNING','PROVISIONAL',r.finish_at],['PROVISIONAL','FINAL',r.final_at]] as const){
   if(r.state===from&&due!==null&&at>=due){await write(repo.transitionStatements(r,to,'scheduler',at),'advance',id);r=(await repo.race(id))!;}
  }return {state:r.state,revision:r.revision};
 }
 async function cancel(id:string,revision:number,reason:string){
  authorize(d.role(),'incident');if(!reason.trim()||reason.length>500)throw Error('REASON_REQUIRED');
  const r=await repo.race(id);if(!r)throw Error('NOT_FOUND');if(r.revision!==revision||!['SEALED','GENERATING'].includes(r.state))throw Error('STATE_CONFLICT');
  await write([repo.statement("UPDATE racing_races SET state='CANCELLED',revision=revision+1 WHERE id=? AND revision=?",id,revision),repo.guard('changes()=1'),repo.audit(id,'incident','cancel',now(),reason)],'cancel',id);
 }
 return {createRegular,createMini,advance,cancel};
}
