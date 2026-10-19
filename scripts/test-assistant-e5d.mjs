import strict from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,readdir,lstat,cp,rename,mkdir,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {syntheticHistory} from './test-e5d-history-fixture.mjs';
import {inspect,authorize,context,grantFor,validateGrant,totals} from './assistant-e5d/state.mjs';
import {revision,DIRECTORY,MANIFEST,internal} from './assistant-e5d/revision.mjs';
import {execute} from './assistant-e5d/execute.mjs';
import {list,readOutput,render,score,remove,validateScores} from './assistant-e5d/review.mjs';
import {run,safeFailure} from './assistant-e5d/cli.mjs';
import {hash,readBudget,openBudget,acquireBudgetLock} from './assistant-eval/budget.mjs';
import {mockResponse} from './assistant-eval/transport.mjs';
import {requireActive} from './assistant-mvp/handoff.mjs';
let count=0;const assert=new Proxy(strict,{apply(t,s,a){count++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{count++;return t[k](...a);}:t[k];}});
const root=await mkdtemp(join(tmpdir(),'holocron-e5d-test-')),oldFetch=globalThis.fetch;let outbound=0;
globalThis.fetch=()=>{outbound++;throw Error('REAL_NETWORK_FORBIDDEN');};
async function snapshot(dir){const r={};for(const n of await readdir(dir)){if(n===DIRECTORY||n==='budget.lock'||n.endsWith('-shm'))continue;const p=join(dir,n),s=await lstat(p);r[n]=s.isDirectory()?await snapshot(p):hash(await readFile(p));}return r;}
const frozenPaths=['evaluation/assistant/manifest.json','evaluation/assistant-mvp/manifest.json','evaluation/assistant-mvp/live-revision.json','evaluation/assistant-mvp/cases.json','evaluation/assistant-mvp/rubric.json'];
const frozen=await Promise.all(frozenPaths.map(p=>readFile(p))),manifest=await readFile(MANIFEST);
try{
 const loaded=await revision();assert.equal(loaded.cases.map(c=>c.id).join(),'P41,P44');
 const path=await syntheticHistory(root),original=await readFile(path),a=JSON.parse(original),before=await snapshot(a.stateDir),dir=join(a.stateDir,DIRECTORY);
 const env=new Proxy({},{get(){throw Error('KEY_READ_FORBIDDEN');}}),plan=await run(['inspect','--prior',path],env);
 assert.equal(plan.status,'PLAN_ONLY_LIVE_NOT_AUTHORIZED');assert.equal(plan.history.attempts,5);assert.equal(plan.history.reservedMicros,139200);assert.equal(plan.history.usageEstimateMicros,19398);assert.equal(plan.history.e3.ledgerEntries,7);assert.equal(plan.history.e5b.ledgerEntries,5);assert.equal(plan.history.unknownUsageAttempts,0);assert.deepEqual(plan.aggregateCeiling,{attempts:7,reservedMicros:192000});
 assert.deepEqual(await snapshot(a.stateDir),before);await assert.rejects(()=>lstat(dir),{code:'ENOENT'});await assert.rejects(()=>execute(path,'E5D-P41',{key:'SYNTHETIC'}));
 for(const id of ['P41','P44','P07','E5D-P07','E5D-P42','E5D-P43','E5D-P45','E5D-P46'])assert.throws(()=>internal(id));
 for(const args of [[],['run','--prior',path],['inspect','--prior',path,'--repeat','yes'],['run','--prior',path,'--case','E5D-P41','--confirm','wrong']])await assert.rejects(()=>run(args,env));
 await assert.rejects(()=>authorize(path,'0'.repeat(64),'AUTHORIZE_E5D_TWO_CASES'),/PLAN_CHANGED/);
 const grants=await Promise.allSettled([authorize(path,plan.planToken,'AUTHORIZE_E5D_TWO_CASES'),authorize(path,plan.planToken,'AUTHORIZE_E5D_TWO_CASES')]);assert(grants.some(r=>r.status==='fulfilled'));assert(grants.some(r=>r.status==='rejected'));
 const gp=join(dir,'authorization.json'),gb=await readFile(gp),g=JSON.parse(gb);assert.equal(Date.parse(g.expiresAt)-Date.parse(g.issuedAt),86400000);assert.equal(g.history.e3.expiresAt,a.expiresAt);assert(Date.parse(a.expiresAt)<Date.now());
 assert.equal((await authorize(path,plan.planToken,'AUTHORIZE_E5D_TWO_CASES')).status,'ALREADY_AUTHORIZED_NO_EXTENSION');assert.deepEqual(await readFile(gp),gb);
 const x=await context(path);try{assert.deepEqual(await grantFor(x),g);for(const patch of [{maxCalls:3},{maxMicros:52801},{globalMaxCalls:41},{model:'other'},{revisionHash:'0'.repeat(64)},{expiresAt:new Date(Date.parse(g.expiresAt)+1).toISOString()}])assert.throws(()=>validateGrant({...g,...patch},x));}finally{await x.reader.close();}
 assert.throws(()=>requireActive(g,Date.parse(g.expiresAt)),/EXPIRED/);
 const clock=Date.now;Date.now=()=>Date.parse(g.expiresAt);try{await assert.rejects(()=>execute(path,'E5D-P41',{key:'SYNTHETIC'}),/EXPIRED/);}finally{Date.now=clock;}
 await assert.rejects(()=>execute(path,'E5D-P44',{key:'SYNTHETIC'}),/P41_PROGRAM_PASS_REQUIRED/);
 const lock=await acquireBudgetLock(a.stateDir);try{await assert.rejects(()=>execute(path,'E5D-P41',{key:'SYNTHETIC'}));await assert.rejects(()=>acquireBudgetLock(a.stateDir));}finally{await lock.close();}
 const jpath=join(dir,'budget.jsonl');await rename(jpath,jpath+'.hold');try{await assert.rejects(()=>authorize(path,plan.planToken,'AUTHORIZE_E5D_TWO_CASES'));await assert.rejects(()=>lstat(jpath));}finally{await rename(jpath+'.hold',jpath);}
 const changed=JSON.parse(manifest);changed.pipelineHash='0'.repeat(64);await writeFile(MANIFEST,JSON.stringify(changed));try{await assert.rejects(()=>revision(),/INTEGRITY/);}finally{await writeFile(MANIFEST,manifest);}
 const oldJournal=join(a.stateDir,'budget.jsonl'),oj=await readFile(oldJournal);await writeFile(oldJournal,oj.subarray(0,-1));try{await assert.rejects(()=>inspect(path),/HISTORY/);}finally{await writeFile(oldJournal,oj);}
 const bJournal=join(a.stateDir,'mvp-smoke-e5b-v1','budget.jsonl'),bj=await readFile(bJournal);await writeFile(bJournal,bj.subarray(0,-1));try{await assert.rejects(()=>inspect(path),/HISTORY/);}finally{await writeFile(bJournal,bj);}
 await rename(join(a.stateDir,'mvp-smoke-e5b-v1','local-d1'),join(a.stateDir,'held-d1'));try{await assert.rejects(()=>inspect(path),/HISTORY/);}finally{await rename(join(a.stateDir,'held-d1'),join(a.stateDir,'mvp-smoke-e5b-v1','local-d1'));}
 const oldB=join(a.stateDir,'mvp-smoke-e5b-v1'),oldGrant=join(oldB,'authorization.json'),oldGrantBytes=await readFile(oldGrant);
 await writeFile(path,JSON.stringify({...a,expiresAt:new Date(Date.now()+86400000).toISOString()}));try{await assert.rejects(()=>inspect(path),/HISTORY/);}finally{await writeFile(path,original);}
 await writeFile(oldGrant,JSON.stringify({...JSON.parse(oldGrantBytes),maxCalls:3}));try{await assert.rejects(()=>inspect(path),/HISTORY/);}finally{await writeFile(oldGrant,oldGrantBytes);}
 const savedB=join(root,'saved-synthetic-e5b');await cp(oldB,savedB,{recursive:true});
 async function sqlite(p){for(const e of await readdir(p,{withFileTypes:true})){const f=join(p,e.name);if(e.isDirectory()){const found=await sqlite(f);if(found)return found;}else if(e.name.endsWith('.sqlite')&&e.name!=='metadata.sqlite')return f;}}
 const db=new DatabaseSync(await sqlite(join(oldB,'local-d1')));db.exec("DROP TRIGGER credit_ledger_no_update; UPDATE credit_ledger SET kind='reward' WHERE kind='ai_spend'");db.close();
 try{await assert.rejects(()=>inspect(path),/HISTORY/);}finally{await rm(oldB,{recursive:true});await cp(savedB,oldB,{recursive:true});}
 console.log('E5D historical binding and authorization checks passed (synthetic).');
 // Independent synthetic branches only. Not exposed by CLI, never private owner state.
 const pristine=join(root,'pristine');await cp(dir,pristine,{recursive:true});
 async function resetSynthetic(){await rm(dir,{recursive:true});await cp(pristine,dir,{recursive:true});}
 let calls=0;const transport=async(_u,init)=>{calls++;const j=await readBudget(dir,g);assert.equal(j.records.filter(r=>r.type==='reserve').length,calls);assert.equal(j.records.at(-1).type,'reserve');assert.equal((await lstat(join(a.stateDir,'budget.lock'))).isFile(),true);const response=await mockResponse(JSON.parse(init.body)).json();if(calls===2){const v=JSON.parse(response.output[0].content[0].text);v.caveats=[{text:'공식 확인되지 않았다.',evidenceIds:v.facts[0].evidenceIds}];response.output[0].content[0].text=JSON.stringify(v);}return Response.json(response);};
 const first=await execute(path,'E5D-P41',{key:'SYNTHETIC_SECRET',transport});assert.equal(calls,1);assert.equal(first.status,'PROGRAM_PASS_OWNER_REVIEW_REQUIRED');assert.equal(first.result.charged,5);assert.equal(first.result.refund,null);assert.equal(first.semanticReview,'NOT_REVIEWED');assert.doesNotMatch(JSON.stringify(first),/SYNTHETIC_SECRET|Bearer|supports.*span/);
 await assert.rejects(()=>execute(path,'E5D-P41',{key:'SYNTHETIC',transport}),/CASE_ALREADY_STARTED/);await assert.rejects(()=>execute(path,'E5D-P44',{key:'SYNTHETIC',transport}),/P41_OWNER_REVIEW_REQUIRED/);assert.equal(calls,1);
 const body=await readOutput(dir,g,'E5D-P41');assert.equal(body.caseId,'E5D-P41');assert.equal(body.revisionHash,loaded.hash);assert.equal(Date.parse(body.expiresAt)-Date.parse(body.createdAt),86400000);assert.match(render(body),/아카이브 Q&A/);assert.match(render(body),/https:/);assert.equal((await lstat(join(dir,'review','E5D-P41.body.json'))).mode&0o077,0);
 await assert.rejects(()=>run(['view','--prior',path,'--case','E5D-P41','--confirm','SHOW_PRIVATE_RESULT'],env),/LOCAL_TERMINAL_ONLY/);
 const scoresPath=join(root,'scores.json');await writeFile(scoresPath,JSON.stringify({scores:[2,2,2,2,2,2,'NOT_REVIEWED','NOT_REVIEWED',2],critical:false}),{mode:0o600});
 const reviewed=await run(['score','--prior',path,'--case','E5D-P41','--scores',scoresPath,'--confirm','RECORD_OWNER_REVIEW_AND_DELETE'],env);assert.equal(reviewed.verdict,'OWNER_PASS');await assert.rejects(()=>lstat(join(dir,'review','E5D-P41.body.json')),{code:'ENOENT'});
 const second=await execute(path,'E5D-P44',{key:'SYNTHETIC',transport});assert.equal(calls,2);assert.equal(second.status,'PROGRAM_PASS_OWNER_REVIEW_REQUIRED');assert.equal(second.result.charged,7);assert.equal(second.result.refund,null);assert.deepEqual(second.aggregate,{attempts:7,reservedMicros:192000});assert.equal((await inspect(path)).ledgerEntries,4);
 await assert.rejects(()=>execute(path,'E5D-P44',{key:'SYNTHETIC',transport}),/CASE_ALREADY_STARTED/);
 const p44=await readOutput(dir,g,'E5D-P44');assert.match(render(p44),/공식 확인되지 않았다/);await score(dir,g,'E5D-P44',{scores:Array(9).fill(2),critical:false});assert((await list(dir,g)).every(r=>!r.exists&&r.deletion==='REVIEWED'));
 assert.deepEqual(await snapshot(a.stateDir),before);assert.deepEqual(await readFile(path),original);
 // Expiry and externally missing/tampered bodies are distinct from successful review.
 await resetSynthetic();await execute(path,'E5D-P41',{key:'SYNTHETIC',transport:async(_u,i)=>mockResponse(JSON.parse(i.body))});const bp=join(dir,'review','E5D-P41.body.json'),bb=await readFile(bp);
 await writeFile(bp,Buffer.concat([bb,Buffer.from(' ')]));await assert.rejects(()=>readOutput(dir,g,'E5D-P41'),/INTEGRITY/);await writeFile(bp,bb);
 Date.now=()=>clock()+86400001;try{await assert.rejects(()=>readOutput(dir,g,'E5D-P41'),/EXPIRED/);assert.equal((await list(dir,g))[0].expired,true);await remove(dir,g,'E5D-P41','DELETE_RESULT_BODY');assert.equal((await list(dir,g))[0].deletion,'EXPIRED_UNREVIEWED');}finally{Date.now=clock;}
 await assert.rejects(()=>execute(path,'E5D-P44',{key:'SYNTHETIC'}),/REVIEW/);
 await resetSynthetic();await execute(path,'E5D-P41',{key:'SYNTHETIC',transport:async(_u,i)=>mockResponse(JSON.parse(i.body))});await rm(bp);assert.equal((await list(dir,g))[0].exists,false);assert.equal((await list(dir,g))[0].storage,'STORED');await remove(dir,g,'E5D-P41','DELETE_RESULT_BODY');assert.equal((await list(dir,g))[0].deletion,'ALREADY_ABSENT');
 // Force a storage failure only after transport reservation; no extra call or refund.
 await resetSynthetic();let storageCalls=0;const storage=await execute(path,'E5D-P41',{key:'SYNTHETIC',transport:async(_u,i)=>{storageCalls++;await mkdir(join(dir,'review'),{mode:0o700});await symlink('/dev/null',bp);return mockResponse(JSON.parse(i.body));}});
 assert.equal(storage.status,'STOP_OUTPUT_STORAGE_FAILED');assert.equal(storageCalls,1);assert.equal(storage.result.charged,5);assert.equal(storage.result.refund,null);assert.equal((await readBudget(dir,g)).records.at(-1).code,'OUTPUT_STORAGE_FAILED');assert.equal((await inspect(path)).status,'STOP_OUTPUT_STORAGE_FAILED');await assert.rejects(()=>execute(path,'E5D-P44',{key:'SYNTHETIC'}),/INCOMPLETE/);
 console.log('E5D single-case, review, expiry and storage checks passed (synthetic).');
 for(const scenario of ['malformed','network','lost-response','timeout']){
  await resetSynthetic();let n=0;const report=await execute(path,'E5D-P41',{key:'SYNTHETIC',transport:async()=>{n++;if(scenario==='malformed')return Response.json({secret:'PRIVATE_RAW_ERROR'});if(scenario==='lost-response')return new Response(new ReadableStream({start(c){c.error(Error('PRIVATE_RAW_ERROR'));}}),{headers:{'Content-Type':'application/json'}});if(scenario==='timeout')throw new DOMException('PRIVATE_RAW_ERROR','TimeoutError');throw Error('PRIVATE_RAW_ERROR');}});
  assert.equal(n,1);assert.equal(report.status,'STOP_UNEXPECTED_RESULT');assert.deepEqual(report.result.refund,{requested:5,applied:5,forfeited:0,full:true});assert.equal(report.additional.reservedMicros,19200);assert.equal((await inspect(path)).additional.unknownUsageAttempts,1);assert.doesNotMatch(JSON.stringify(report),/PRIVATE_RAW_ERROR/);assert((await list(dir,g)).every(r=>!r.exists));await assert.rejects(()=>execute(path,'E5D-P41',{key:'SYNTHETIC'}),/CASE_ALREADY_STARTED/);await assert.rejects(()=>execute(path,'E5D-P44',{key:'SYNTHETIC'}),/P41_PROGRAM_PASS_REQUIRED/);
 }
 // Grounding failure still refunds 7 CR with safe internal metadata, no raw body.
 await resetSynthetic();await execute(path,'E5D-P41',{key:'SYNTHETIC',transport:async(_u,i)=>mockResponse(JSON.parse(i.body))});await score(dir,g,'E5D-P41',{scores:Array(9).fill(2),critical:false});
 const bad=await execute(path,'E5D-P44',{key:'SYNTHETIC',transport:async(_u,i)=>{const v=await mockResponse(JSON.parse(i.body)).json(),o=JSON.parse(v.output[0].content[0].text);o.caveats=[{text:'공식 확인되지 않았지만, 공식 발표됐다.',evidenceIds:o.facts[0].evidenceIds}];v.output[0].content[0].text=JSON.stringify(o);return Response.json(v);}});
 assert.equal(bad.result.code,'INVALID_OUTPUT');assert.equal(bad.result.diagnostic.reason,'OFFICIAL_PROMOTION');assert.deepEqual(bad.result.refund,{requested:7,applied:7,forfeited:0,full:true});assert.equal((await inspect(path)).ledgerEntries,5);assert.equal((await list(dir,g))[1].exists,false);
 // Durable reservation followed by simulated crash: consumed, unknown, no retry.
 await resetSynthetic();const lease=await acquireBudgetLock(a.stateDir),b=await openBudget(dir,g,{heldLock:lease,requireExisting:true});await b.checked('P41','STARTED');await b.reserve('P41',19200);await b.close();await lease.close();
 const interrupted=await inspect(path);assert.equal(interrupted.status,'STOP_INCOMPLETE_NO_RETRY');assert.equal(interrupted.additional.unknownUsageAttempts,1);assert.equal(interrupted.additional.reservedMicros,19200);await assert.rejects(()=>execute(path,'E5D-P41',{key:'SYNTHETIC'}),/INCOMPLETE/);
 assert.equal(totals([{type:'reserve',attemptId:'a',micros:19200}]).unknownUsageAttempts,1);
 for(const scores of [Array(9).fill(0),Array(9).fill(1),Array(9).fill('NOT_REVIEWED')])assert.equal(validateScores('E5D-P44',{scores,critical:false}),'OWNER_NOT_PASS');assert.equal(validateScores('E5D-P44',{scores:Array(9).fill(2),critical:true}),'OWNER_NOT_PASS');
 assert.equal(safeFailure(Error('PRIVATE_UPPERCASE_SECRET')).code,'E5D_STOP');assert.deepEqual(await snapshot(a.stateDir),before);for(const [i,p] of frozenPaths.entries())assert.deepEqual(await readFile(p),frozen[i]);assert.equal(outbound,0);
 console.log(`PASS ${count} E.5D assertions; synthetic histories/local D1/mock transport; real Provider outbound ZERO; live NOT AUTHORIZED`);
}finally{await writeFile(MANIFEST,manifest);globalThis.fetch=oldFetch;await rm(root,{recursive:true,force:true});}
