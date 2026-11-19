import {RacingRepository,type GenerationRow} from './repository';
import {authorize,clock,mondaySchedule,roster,SCORING,type Role,type Stage} from './domain';
import {canonical,decrypt,digest,encrypt,secret} from './crypto';
import {descriptor,qualify,main} from './engine';
import {SOURCE_HASH} from './source-manifest';
import type {QualifyingRecord} from '../v2/types';
import type {Meeting} from '../v2/types';
// Ports are trusted server capabilities. Never instantiate with caller-supplied roles,
// clock, keys, entropy or object stores. Phase 3-B will provide authenticated adapters.
export interface PrivateArtifacts {put(hash:string,ciphertext:string):Promise<void>;get(hash:string):Promise<string>}
export interface Dependencies {db:D1Database;key:CryptoKey;artifacts:PrivateArtifacts;now:()=>number;role:()=>Role;entropy:(reference:string)=>Promise<string>}
export function racingService(d:Dependencies){
 const repo=new RacingRepository(d.db);
 const now=()=>clock(d.now());
 async function readArtifact(g:GenerationRow){
  if(!g.output_hash||!g.output_ref)throw Error('MISSING_ARTIFACT');
  const text=await decrypt(d.key,await d.artifacts.get(g.output_ref),g.output_hash);
  if(await digest(text)!==g.output_hash)throw Error('ARTIFACT_HASH_MISMATCH');
  const envelope=JSON.parse(text);
  if(envelope.contract!=='phase3a-separated-entropy-v1'||envelope.inputHash!==g.input_hash||envelope.stage!==g.stage)throw Error('ARTIFACT_MANIFEST_MISMATCH');
  return envelope.value;
 }
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
  await d.db.batch(statements);return id;
 }
 async function generate(id:string,stage:Stage){
  authorize(d.role(),'generator');if(!['qualifying','main'].includes(stage))throw Error('INVALID_STAGE');
  const at=now(),race=await repo.race(id);if(!race)throw Error('NOT_FOUND');
  if(['CANCELLED','QUARANTINED'].includes(race.state))throw Error('RACE_UNAVAILABLE');
  const g=await repo.generation(id,stage);if(!g)throw Error('NOT_FOUND');
  if(g.state==='READY')return {hash:g.output_hash};
  if(at<(stage==='qualifying'?race.qualifying_at:race.starts_at))throw Error('NOT_DUE');
  if(stage==='qualifying'&&at>=race.starts_at)throw Error('QUALIFYING_MISSED');
  const q=await repo.generation(id,'qualifying');
  if(stage==='main'&&q?.state!=='READY')throw Error('GRID_NOT_READY');
  const season=await repo.season(race.season_id);if(!season)throw Error('NOT_FOUND');
  const manifest=JSON.parse(season.manifest);
  if(await digest(season.manifest)!==season.input_hash||canonical(manifest.engine)!==canonical(await descriptor(manifest.engine.laps))||manifest.sourceHash!==SOURCE_HASH)throw Error('ENGINE_MISMATCH');
  const owner=crypto.randomUUID();if(!await repo.claim(id,stage,owner,at))throw Error('IN_PROGRESS');
  try{
   if(stage==='main'&&race.state==='SEALED')await repo.transition(race,'GENERATING','generator',at);
   const seedSecret=await decrypt(d.key,g.secret_cipher,g.input_hash);
   if(await digest(canonical({secret:seedSecret,inputHash:g.input_hash}))!==g.commitment)throw Error('COMMITMENT_MISMATCH');
   const contribution=await d.entropy(g.entropy_ref);if(!/^[0-9a-f]{64}$/.test(contribution))throw Error('ENTROPY_UNAVAILABLE');
   const entropyHash=await digest(contribution);
   // Bind the independent contribution once, before computation; retries cannot substitute it.
   await d.db.batch([repo.statement('UPDATE racing_generations SET entropy_hash=? WHERE race_id=? AND stage=? AND owner=? AND state=\'GENERATING\' AND (entropy_hash IS NULL OR entropy_hash=?)',entropyHash,id,stage,owner,entropyHash),repo.guard('changes()=1')]);
   const seed=await digest(canonical({seedSecret,contribution,inputHash:g.input_hash}));
   const output=stage==='qualifying'?qualify(seed,manifest.engine.laps):main(seed,manifest.engine.laps,await readArtifact(q!) as QualifyingRecord);
   const text=canonical({contract:manifest.engine.contract,stage,inputHash:g.input_hash,sourceHash:SOURCE_HASH,engine:manifest.engine,qualifyingHash:stage==='main'?q!.output_hash:null,value:output}),hash=await digest(text);
   if(text.length>32*1024*1024)throw Error('ARTIFACT_TOO_LARGE');
   const current=await repo.generation(id,stage);
   if(current?.candidate_hash&&current.candidate_hash!==hash){
    await d.db.batch([repo.statement("UPDATE racing_generations SET state='QUARANTINED' WHERE race_id=? AND stage=? AND owner=? AND state='GENERATING'",id,stage,owner),repo.guard('changes()=1'),repo.statement("UPDATE racing_races SET state='QUARANTINED',revision=revision+1 WHERE id=? AND state IN ('SEALED','GENERATING')",id),repo.guard('changes()=1'),repo.audit(id,'generator','quarantine',now(),'OUTPUT_CONFLICT')]);
    throw Error('OUTPUT_CONFLICT');
   }
   await d.db.batch([repo.statement("UPDATE racing_generations SET candidate_hash=? WHERE race_id=? AND stage=? AND owner=? AND state='GENERATING' AND lease_until>?",hash,id,stage,owner,now()),repo.guard('changes()=1')]);
   const cipher=await encrypt(d.key,text,hash);await d.artifacts.put(hash,cipher);
   if(await digest(await decrypt(d.key,await d.artifacts.get(hash),hash))!==hash)throw Error('ARTIFACT_HASH_MISMATCH');
   const finished=now();
   const statements=[repo.statement("UPDATE racing_generations SET state='READY',output_hash=?,output_ref=? WHERE race_id=? AND stage=? AND owner=? AND state='GENERATING' AND lease_until>?",hash,hash,id,stage,owner,finished),repo.guard('changes()=1')];
   if(stage==='main'){
    const meeting=output as Meeting;
    statements.push(repo.statement('INSERT INTO racing_results(race_id,output_hash,official) VALUES(?,?,?)',id,hash,canonical(meeting.official)),repo.statement("UPDATE racing_races SET state='READY',revision=revision+1,finish_at=?,final_at=? WHERE id=? AND state='GENERATING'",race.starts_at+meeting.race.durationTicks*meeting.race.config.tickMs,race.starts_at+meeting.durationMs-meeting.raceStartMs,id),repo.guard('changes()=1'));
   }
   statements.push(repo.audit(id,'generator','complete',finished,stage+':'+hash));await d.db.batch(statements);
   return {hash};
  }catch(error){
   // Preserve commitments/entropy and only relinquish our own lease. A committed
   // success followed by response loss cannot be changed by this UPDATE.
   await repo.statement("UPDATE racing_generations SET state='FAILED' WHERE race_id=? AND stage=? AND owner=? AND state='GENERATING'",id,stage,owner).run();throw error;
  }
 }
 async function advance(id:string){
  authorize(d.role(),'scheduler');const at=now();let r=await repo.race(id);if(!r)throw Error('NOT_FOUND');
  // Reconcile late wakeups from persisted anchors, never from delivery time.
  for(const [from,to,due] of [['READY','RUNNING',r.starts_at],['RUNNING','PROVISIONAL',r.finish_at],['PROVISIONAL','FINAL',r.final_at]] as const){
   if(r.state===from&&due!==null&&at>=due){await repo.transition(r,to,'scheduler',at);r=(await repo.race(id))!;}
  }return {state:r.state,revision:r.revision};
 }
 async function cancel(id:string,revision:number,reason:string){
  authorize(d.role(),'incident');if(!reason.trim()||reason.length>500)throw Error('REASON_REQUIRED');
  const r=await repo.race(id);if(!r)throw Error('NOT_FOUND');if(r.revision!==revision||!['SEALED','GENERATING'].includes(r.state))throw Error('STATE_CONFLICT');
  await d.db.batch([repo.statement("UPDATE racing_races SET state='CANCELLED',revision=revision+1 WHERE id=? AND revision=?",id,revision),repo.guard('changes()=1'),repo.audit(id,'incident','cancel',now(),reason)]);
 }
 async function dueWork(){
  authorize(d.role(),'scheduler');const at=now();
  const rows=await repo.statement(`SELECT g.race_id AS raceId,g.stage,
   CASE WHEN g.stage='qualifying' THEN r.qualifying_at ELSE r.starts_at END AS dueAt
   FROM racing_generations g JOIN racing_races r ON r.id=g.race_id
   WHERE r.state IN ('SEALED','GENERATING') AND
   (g.state IN ('SEALED','FAILED') OR (g.state='GENERATING' AND g.lease_until<=?)) AND
   ((g.stage='qualifying' AND r.qualifying_at<=? AND r.starts_at>?) OR
   (g.stage='main' AND r.starts_at<=? AND EXISTS(SELECT 1 FROM racing_generations q WHERE q.race_id=r.id AND q.stage='qualifying' AND q.state='READY')))
   ORDER BY dueAt,g.race_id LIMIT 14`,at,at,at,at).all<{raceId:string;stage:Stage;dueAt:number}>();
  return rows.results;
 }
 return {createRegular,generate,advance,cancel,dueWork};
}
