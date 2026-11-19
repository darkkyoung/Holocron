import {RacingRepository} from './repository';
import {authorize,clock,mondaySchedule,roster,SCORING,type Role} from './domain';
import {canonical,digest,encrypt,secret} from './crypto';
import {descriptor} from './engine';
import {SOURCE_HASH} from './source-manifest';

export function racingOperations(d:{db:D1Database;key:CryptoKey;now:()=>number;role:()=>Role},
 write:(statements:D1PreparedStatement[],command:string,target:string)=>Promise<unknown> = s=>d.db.batch(s)){
 const repo=new RacingRepository(d.db),now=()=>clock(d.now());
 async function createRegular(monday:string,laps=10){
  authorize(d.role(),'scheduler');const at=now(),schedule=mondaySchedule(monday);
  const id='regular:'+monday,engine=await descriptor(laps);
  const manifest=canonical({id,kind:'regular',timezone:'Asia/Seoul',schedule,roster:roster(),engine,sourceHash:SOURCE_HASH,scoring:SCORING,entropyPolicy:'isolated-external-v1',generationPolicy:'strict-scheduled-start-v1'});
  const inputHash=await digest(manifest),previous=await repo.season(id);
  if(previous){if(previous.input_hash!==inputHash)throw Error('SEASON_CONFLICT');return id;}
  if(at>=schedule[0].qualifyingAt)throw Error('SEAL_DEADLINE');
  const statements=[repo.statement('INSERT OR IGNORE INTO racing_seasons(id,monday,manifest,input_hash,created_at) VALUES(?,?,?,?,?)',id,monday,manifest,inputHash,at),repo.guard('(SELECT input_hash FROM racing_seasons WHERE id=?)=?',id,inputHash)];
  statements.push(repo.statement('INSERT OR IGNORE INTO racing_engine_versions VALUES(?,?,?)',SOURCE_HASH,engine.version,engine.contract));
  for(const entry of roster())statements.push(repo.statement('INSERT OR IGNORE INTO racing_racers VALUES(?,?)',entry.id,canonical(entry)),repo.statement('INSERT OR IGNORE INTO racing_season_entries VALUES(?,?,?,?)',id,entry.slot,entry.id,canonical(entry)));
  for(const day of schedule){
   const raceId=id+':R'+day.round;
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
 return {createRegular,advance,cancel};
}
