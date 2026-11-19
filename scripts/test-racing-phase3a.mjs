import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
import {sourceHash} from './racing/phase3a-source.mjs';
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare'),split=require('wrangler').unstable_splitSqlQuery;
const paths=['domain','crypto','engine','historical','service','source-manifest'];
const loaded=await loadTestModules([...paths.map(p=>'lib/racing/phase3a/'+p+'.ts'),'lib/racing/v14/simulator.ts']);
const m=p=>loaded.modules['lib/racing/phase3a/'+p+'.ts'];
const base=loaded.modules['lib/racing/v14/simulator.ts'];
const directory=await mkdtemp(join(tmpdir(),'racing-phase3a-'));let mf;
const make=()=>new Miniflare({modules:true,compatibilityDate:'2026-05-15',script:'export default {fetch(){return new Response("isolated")}}',d1Databases:['DB'],d1Persist:join(directory,'db'),outboundService:()=>{throw Error('NETWORK_DISABLED');}});
const ddl=await readFile('db/racing-phase3a/migrations/0001_foundation.sql','utf8');
let groups=0;const pass=name=>{groups++;console.log('PASS',name);};
try{
 assert.equal(await sourceHash(),m('source-manifest').SOURCE_HASH);
 assert.equal(m('domain').mondaySchedule('2026-12-07')[0].qualifyingAt,Date.parse('2026-12-07T11:00:00Z'));
 assert.equal(m('domain').mondaySchedule('2026-12-07')[6].startsAt,Date.parse('2026-12-13T12:00:00Z'));
 for(const day of ['2026-12-08','2026-02-30','2026-1-05','invalid'])assert.throws(()=>m('domain').mondaySchedule(day));
 assert.equal(m('domain').mondaySchedule('2026-12-28')[6].date,'2027-01-03');
 for(const n of [0,7,9])assert.throws(()=>m('domain').roster(Array.from({length:n},()=>({id:'r1',name:'a'}))));
 for(const laps of [0,31,1.2,NaN])assert.throws(()=>m('domain').settings(laps));
 pass('KST Monday/Sunday, year boundary, roster and bounds');
 for(let i=0;i<20;i++){
  const seed='phase3-stage-'+i,q=m('engine').qualify(seed,10),staged=m('engine').main(seed,10,q);
  assert.deepEqual(staged,base.simulateMeetingV14(seed));
 }
 const q=m('engine').qualify('qualifying-only',1);
 assert.notDeepEqual(m('engine').main('main-one',1,q).race.results,m('engine').main('main-two',1,q).race.results);
 for(let v=1;v<=14;v++)assert.ok(m('historical').historicalReplay(`galactic-racing-0.${v}.0`,'phase3-history'));
 assert.throws(()=>m('historical').historicalReplay('new','x'));
 pass('20 full v14 stage-composition equalities, independent main seeds, v1–v14 dispatch');
 mf=make();let db=await mf.getD1Database('DB');
 const install=async()=>db.batch(split(ddl).map(s=>db.prepare(s)));
 await install();assert.equal((await db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='table' AND name LIKE 'racing_%'").first()).n,9);
 let time=Date.parse('2026-12-06T00:00:00Z'),role='scheduler',failPut=false,entropy='a'.repeat(64);
 const key=await crypto.subtle.importKey('raw',new Uint8Array(32).fill(7),'AES-GCM',false,['encrypt','decrypt']);
 const artifacts={put:async(h,c)=>{if(failPut)throw Error('OBJECT_WRITE_FAILURE');try{await writeFile(join(directory,h),c,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;}},get:h=>readFile(join(directory,h),'utf8')};
 const deps=()=>({db,key,artifacts,now:()=>time,role:()=>role,entropy:async()=>entropy});
 let service=m('service').racingService(deps());
 role='viewer';await assert.rejects(service.createRegular('2026-12-07'),/FORBIDDEN/);role='scheduler';
 const ids=await Promise.all([service.createRegular('2026-12-07',1),service.createRegular('2026-12-07',1)]);assert.equal(ids[0],ids[1]);
 const id=ids[0]+':R1';
 const first=(sql,...p)=>db.prepare(sql).bind(...p).first();const run=(sql,...p)=>db.prepare(sql).bind(...p).run();
 assert.equal((await first('SELECT count(*) n FROM racing_races')).n,7);assert.equal((await first('SELECT count(*) n FROM racing_generations')).n,14);assert.equal((await first('SELECT count(*) n FROM racing_season_entries')).n,8);assert.equal((await first('SELECT count(*) n FROM racing_audit')).n,1);
 await assert.rejects(service.createRegular('2026-12-07',10));
 const before=await first('SELECT * FROM racing_generations WHERE race_id=? AND stage=?',id,'main');
 assert(!before.secret_cipher.includes('a'.repeat(64)));
 await assert.rejects(run("UPDATE racing_seasons SET manifest='{}'"));await assert.rejects(run("UPDATE racing_races SET starts_at=starts_at+1"));await assert.rejects(run("UPDATE racing_season_entries SET racer_id='r8' WHERE slot=1"));
 await assert.rejects(db.batch([db.prepare("INSERT INTO racing_racers VALUES('fixture','{}')"),db.prepare('INSERT INTO racing_atomic_guard VALUES(2,0)')]));assert.equal(await first("SELECT * FROM racing_racers WHERE id='fixture'"),null);
 pass('isolated D1 atomic season creation, duplicate concurrency, conflicts, immutable roster, rollback');
 role='scheduler';time=Date.parse('2026-12-07T10:59:59.999Z');assert.equal((await service.dueWork()).length,0);time++;assert.deepEqual(await service.dueWork(),[{raceId:id,stage:'qualifying',dueAt:time}]);time--;role='generator';await assert.rejects(service.generate(id,'qualifying'),/NOT_DUE/);
 time++;const qHash=await service.generate(id,'qualifying');assert.deepEqual(await service.generate(id,'qualifying'),qHash);
 time=Date.parse('2026-12-07T11:59:59.999Z');await assert.rejects(service.generate(id,'main'),/NOT_DUE/);time++;
 failPut=true;await assert.rejects(service.generate(id,'main'),/OBJECT_WRITE_FAILURE/);
 const failed=await first("SELECT * FROM racing_generations WHERE race_id=? AND stage='main'",id);assert.equal(failed.state,'FAILED');assert.ok(failed.candidate_hash);assert.equal((await first('SELECT * FROM racing_races WHERE id=?',id)).state,'GENERATING');
 entropy='b'.repeat(64);await assert.rejects(service.generate(id,'main'));assert.equal((await first("SELECT entropy_hash FROM racing_generations WHERE race_id=? AND stage='main'",id)).entropy_hash,failed.entropy_hash);
 entropy='a'.repeat(64);failPut=false;
 // Reopen durable isolated D1 and filesystem storage; same sealed seed and output.
 await mf.dispose();mf=make();db=await mf.getD1Database('DB');service=m('service').racingService(deps());
 const concurrent=await Promise.allSettled([service.generate(id,'main'),service.generate(id,'main')]);assert(concurrent.some(x=>x.status==='fulfilled'));const mainHash=await service.generate(id,'main');assert.equal(mainHash.hash,failed.candidate_hash);
 assert.equal((await first('SELECT count(*) n FROM racing_results WHERE race_id=?',id)).n,1);
 const result=await first('SELECT * FROM racing_results WHERE race_id=?',id);assert.equal(JSON.parse(result.official).length,8);
 await assert.rejects(run("UPDATE racing_results SET official='[]'"));await assert.rejects(run('DELETE FROM racing_results'));await assert.rejects(run('DELETE FROM racing_generations'));await assert.rejects(run('DELETE FROM racing_audit'));
 pass('20:00/21:00 exact boundaries, crash/restart identical output, entropy substitution rejection, concurrent generation');
 role='viewer';await assert.rejects(service.advance(id),/FORBIDDEN/);role='scheduler';
 const running=await service.advance(id);assert.equal(running.state,'RUNNING');const row=await first('SELECT * FROM racing_races WHERE id=?',id);
 time=row.finish_at-1;assert.equal((await service.advance(id)).state,'RUNNING');time++;assert.equal((await service.advance(id)).state,'PROVISIONAL');time=row.final_at;assert.equal((await service.advance(id)).state,'FINAL');assert.equal((await service.advance(id)).state,'FINAL');
 role='incident';await assert.rejects(service.cancel(id,5,'reroll'));
 const id2=ids[0]+':R2';await assert.rejects(service.cancel(id2,99,'incident'));await service.cancel(id2,0,'missed preparation');role='generator';await assert.rejects(service.generate(id2,'main'),/RACE_UNAVAILABLE/);
 const id3=ids[0]+':R3';time=Date.parse('2026-12-09T12:00:00Z');await assert.rejects(service.generate(id3,'main'),/GRID_NOT_READY/);await assert.rejects(service.generate(id3,'qualifying'),/QUALIFYING_MISSED/);
 pass('role gates, legal/CAS transitions, anchored finish/final, no final reroll, missed qualifying fails closed');
 // Expired lease recovery and conflict quarantine on a different, sealed race.
 const id4=ids[0]+':R4';time=Date.parse('2026-12-10T11:00:00Z');
 await run("UPDATE racing_generations SET state='GENERATING',owner='dead-worker',lease_until=?,attempt=1 WHERE race_id=? AND stage='qualifying'",time+1,id4);
 await assert.rejects(service.generate(id4,'qualifying'),/IN_PROGRESS/);time+=2;
 await service.generate(id4,'qualifying');
 assert.equal((await first("SELECT attempt FROM racing_generations WHERE race_id=? AND stage='qualifying'",id4)).attempt,2);
 time=Date.parse('2026-12-10T12:00:00Z');
 await run("UPDATE racing_races SET state='GENERATING',revision=revision+1 WHERE id=?",id4);
 await run("UPDATE racing_generations SET state='GENERATING',owner='fault-fixture',lease_until=0 WHERE race_id=? AND stage='main'",id4);
 await run("UPDATE racing_generations SET candidate_hash=?,state='FAILED' WHERE race_id=? AND stage='main'",'0'.repeat(64),id4);
 await assert.rejects(service.generate(id4,'main'),/OUTPUT_CONFLICT/);
 assert.equal((await first('SELECT state FROM racing_races WHERE id=?',id4)).state,'QUARANTINED');
 assert.equal(await first('SELECT * FROM racing_results WHERE race_id=?',id4),null);
 const id5=ids[0]+':R5';time=Date.parse('2026-12-11T11:00:00Z');entropy='unavailable';
 await assert.rejects(service.generate(id5,'qualifying'),/ENTROPY_UNAVAILABLE/);entropy='a'.repeat(64);
 await service.generate(id5,'qualifying');time=Date.parse('2026-12-11T12:00:00Z');
 // A response lost after the completion batch must recover the same output once.
 let dropped=false;const lossy={prepare:sql=>db.prepare(sql),batch:async statements=>{const out=await db.batch(statements);if(!dropped&&(await first("SELECT state FROM racing_generations WHERE race_id=? AND stage='main'",id5)).state==='READY'){dropped=true;throw Error('LOST_RESPONSE');}return out;}};
 const lostService=m('service').racingService({...deps(),db:lossy});await assert.rejects(lostService.generate(id5,'main'),/LOST_RESPONSE/);assert(dropped);
 const recovered=await service.generate(id5,'main');assert.equal(recovered.hash,(await first('SELECT output_hash FROM racing_results WHERE race_id=?',id5)).output_hash);
 role='scheduler';time+=3600000;assert.equal((await service.advance(id5)).state,'FINAL');
 // Cancellation during object write prevents even qualifying completion.
 role='generator';const id6=ids[0]+':R6';time=Date.parse('2026-12-12T11:00:00Z');
 const cancelledService=m('service').racingService({...deps(),artifacts:{...artifacts,put:async(h,c)=>{await artifacts.put(h,c);role='incident';await service.cancel(id6,0,'incident during upload');role='generator';}}});
 await assert.rejects(cancelledService.generate(id6,'qualifying'));
 assert.equal((await first("SELECT state FROM racing_generations WHERE race_id=? AND stage='qualifying'",id6)).state,'FAILED');
 pass('expired lease takeover, divergent output quarantine, unavailable entropy, lost commit response, delayed wakeup, cancellation race');
 const id7=ids[0]+':R7';time=Date.parse('2026-12-13T11:00:00Z');
 let release,started;const blocked=new Promise(r=>{release=r;}),arrived=new Promise(r=>{started=r;});
 const slow=m('service').racingService({...deps(),entropy:async()=>{started();await blocked;return entropy;}});
 const oldWorker=slow.generate(id7,'qualifying');await arrived;time+=120001;
 const winner=await service.generate(id7,'qualifying');release();await assert.rejects(oldWorker);
 assert.deepEqual(await service.generate(id7,'qualifying'),winner);
 assert.equal((await first("SELECT attempt FROM racing_generations WHERE race_id=? AND stage='qualifying'",id7)).attempt,2);
 pass('stale worker rejected after lease takeover and bounded due-work query');


 // Upgrade a separate actual 0022 fixture, preserve legacy schema and durable data.
 const old=new Miniflare({modules:true,compatibilityDate:'2026-05-15',script:'export default {fetch(){return new Response("fixture")}}',d1Databases:['DB']});
 try{const upgraded=await old.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await upgraded.batch(split(await readFile('drizzle/'+f,'utf8')).map(s=>upgraded.prepare(s)));
 const schema=await upgraded.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all();
 await upgraded.prepare("INSERT INTO settings(key,value) VALUES('phase3a-preserve','unchanged')").run();
 await upgraded.batch(split(ddl).map(s=>upgraded.prepare(s)));
 for(const original of schema.results)assert.deepEqual(await upgraded.prepare('SELECT name,sql FROM sqlite_master WHERE name=?').bind(original.name).first(),original);
 assert.equal((await upgraded.prepare("SELECT value FROM settings WHERE key='phase3a-preserve'").first()).value,'unchanged');
 }finally{await old.dispose();}
 pass('0022 isolated upgrade preserves legacy schema and sentinel data');
 console.log(JSON.stringify({status:'PASS',groups,networkCalls:0,productionChanges:0}));
}finally{if(mf)await mf.dispose();await loaded.dispose();await rm(directory,{recursive:true,force:true});}
