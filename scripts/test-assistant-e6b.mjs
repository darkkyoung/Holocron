import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,readdir,lstat,cp} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {syntheticHistory} from './test-e6b-history-fixture.mjs';
import * as actual from './assistant-e6b/state.mjs';
import {createExecute} from './assistant-e6b/execute.mjs';
import {createCli} from './assistant-e6b/cli.mjs';
import {revision,DIRECTORY,MANIFEST,ORDER,internal} from './assistant-e6b/revision.mjs';
import * as review from './assistant-e6b/review.mjs';
import {hash,readBudget,openBudget,acquireBudgetLock} from './assistant-eval/budget.mjs';
import {mockResponse} from './assistant-eval/transport.mjs';
import {snapshot} from './assistant-e6b/history.mjs';
const root=await mkdtemp(join(tmpdir(),'holocron-e6b-test-')),oldFetch=globalThis.fetch;let outbound=0,audited;
globalThis.fetch=()=>{outbound++;throw Error('REAL_NETWORK_FORBIDDEN');};
async function sqlite(p){for(const e of await readdir(p,{withFileTypes:true})){const f=join(p,e.name);if(e.isDirectory()){const found=await sqlite(f);if(found)return found;}else if(e.name.endsWith('.sqlite')&&e.name!=='metadata.sqlite')return f;}}
const dataset=await readFile('evaluation/assistant-mvp/e6a-cases.json'),manifest=await readFile(MANIFEST);
const protectedFiles=Object.keys(JSON.parse(dataset).protectedHashes),protectedBytes=await Promise.all(protectedFiles.map(p=>readFile(p)));
async function exists(p){try{await lstat(p);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
try{
 const loaded=await revision();assert.deepEqual(loaded.cases.map(c=>c.id),['P84','P66','P65','P81']);assert.equal(loaded.manifest.datasetHash,hash(dataset));
 const path=await syntheticHistory(root),original=await readFile(path),a=JSON.parse(original),before=await snapshot(path),dir=join(a.stateDir,DIRECTORY);
 console.log('Pinned synthetic ten-attempt history built; no network used.');
 const keyFree=new Proxy({},{get(){throw Error('KEY_READ_FORBIDDEN');}});
 const plan=await createCli().run(['inspect','--prior',path],keyFree);
 assert.equal(plan.status,'PLAN_ONLY_LIVE_NOT_AUTHORIZED');assert.equal(plan.history.attempts,10);assert.equal(plan.history.reservedMicros,278400);assert.equal(plan.history.usageEstimateMicros,35827);assert.equal(plan.history.unknownUsageAttempts,0);
 assert.equal(plan.history.e5d.semanticReview,'OWNER_NOT_PASS');assert.equal(plan.history.e5f.p41.semanticReview,'OWNER_PASS');assert.equal(plan.history.e5f.p44.refund,7);assert.equal(plan.history.e5h.p44.refund,7);assert.equal(plan.history.e5j.p44.semanticReview,'OWNER_PASS');assert.equal(plan.history.e5j.p44.bodyExists,false);assert.equal(plan.history.e5j.ledgerEntries,2);
 assert.deepEqual(plan.additionalCeiling,{attempts:4,reservedMicros:105600});assert.deepEqual(plan.aggregateCeiling,{attempts:14,reservedMicros:384000});assert.equal(await exists(dir),false);assert.equal(await snapshot(path),before);
 // The second complete pinned audit must reject an altered J owner receipt.
 const jp=join(a.stateDir,'mvp-p44-e5j-v1','review','E5J-P44.reviewed.json'),jb=await readFile(jp);await writeFile(jp,JSON.stringify({...JSON.parse(jb),verdict:'OWNER_NOT_PASS',scores:Array(9).fill(1)}));
 try{await assert.rejects(()=>actual.inspect(path),/HISTORY/);}finally{await writeFile(jp,jb);}
 audited=await actual.context(path);
 // Reuse this complete audit only in disposable boundary tests. Its real byte
// seal is rechecked at every command/reservation; production always audits fresh.
 const state=actual.createState({readHistory:async()=>({read:p=>audited.reader.read(p,'recheck'),async close(){}})}),execute=createExecute(state),cli=createCli(state,execute);
 console.log('Full pinned audit and corrupted-review rejection PASS.');
 await assert.rejects(()=>execute(path,ORDER[0],{key:'SYNTHETIC'}));
 for(const id of ['P84','E6B-P41','E6B-P44','E6B-P61','E6B-P90','E6B-P07'])assert.throws(()=>internal(id));
 for(const args of [[],['run','--prior',path],['inspect','--prior',path,'--all','yes'],['run','--prior',path,'--case',ORDER[0],'--confirm','wrong']])await assert.rejects(()=>cli.run(args,keyFree));
 await assert.rejects(()=>state.authorize(path,plan.planToken,'WRONG'),/AUTHORIZATION/);await assert.rejects(()=>state.authorize(path,'0'.repeat(64),'AUTHORIZE_E6B_PILOT4'),/PLAN_CHANGED/);
 await state.authorize(path,plan.planToken,'AUTHORIZE_E6B_PILOT4');const gp=join(dir,'authorization.json'),gb=await readFile(gp),g=JSON.parse(gb);
 assert.equal(g.maxCalls,4);assert.equal(g.maxMicros,105600);assert.equal(Date.parse(g.expiresAt)-Date.parse(g.issuedAt),86400000);assert.equal((await state.authorize(path,plan.planToken,'AUTHORIZE_E6B_PILOT4')).status,'ALREADY_AUTHORIZED_NO_EXTENSION');assert.deepEqual(await readFile(gp),gb);
 const x=await state.context(path);for(const patch of [{maxCalls:5},{maxMicros:105601},{order:[...ORDER].reverse()},{globalMaxCalls:41},{globalMaxMicros:2000001},{expiresAt:new Date(Date.parse(g.expiresAt)+1).toISOString()}])assert.throws(()=>state.validateGrant({...g,...patch},x));
 const clock=Date.now;Date.now=()=>Date.parse(g.expiresAt);try{await assert.rejects(()=>execute(path,ORDER[0],{key:'SYNTHETIC'}),/EXPIRED/);}finally{Date.now=clock;}
 const lock=await acquireBudgetLock(a.stateDir);try{await assert.rejects(()=>execute(path,ORDER[0],{key:'SYNTHETIC'}));}finally{await lock.close();}
 await assert.rejects(()=>execute(path,ORDER[1],{key:'SYNTHETIC'}),/ORDER/);
 for(const p of [path,join(a.stateDir,'budget.jsonl'),jp,join(a.stateDir,'mvp-p44-e5j-v1','authorization.json'),join(a.stateDir,'mvp-p44-e5j-v1','budget.jsonl')]){const b=await readFile(p);await writeFile(p,b.subarray(0,-2));try{await assert.rejects(()=>state.inspect(path),/HISTORY/);}finally{await writeFile(p,b);}}
 const pristine=join(root,'pristine');await cp(dir,pristine,{recursive:true});
 async function branch(from=pristine){await rm(dir,{recursive:true});await cp(from,dir,{recursive:true});}
 let calls=0,transportFailure;const transport=(id,scenario)=>async(_u,init)=>{calls++;try{
  const journal=await readBudget(dir,g);assert.equal(journal.records.at(-1).type,'reserve');assert.equal(journal.records.at(-1).caseId,internal(id));assert(await exists(join(a.stateDir,'budget.lock')));
  if(scenario==='timeout')throw new DOMException('PRIVATE_RAW_ERROR','TimeoutError');
  const wire=JSON.parse(init.body),data=JSON.parse(wire.input[0].content[0].text),c=loaded.cases.find(c=>c.id===internal(id));assert.equal(wire.text.format.strict,true);assert.match(wire.instructions,/발언자·발언 대상/);assert.deepEqual(data.evidence.map(e=>e.articleId),c.allowedArticleIds);
  const v=await mockResponse(wire,scenario==='insufficient'?'thin':undefined).json(),o=JSON.parse(v.output[0].content[0].text);
  if(o.status==='ok'){
   const facts=[];for(const articleId of [...new Set(c.claimSupport.map(s=>s.articleId))]){const one=structuredClone(wire);one.input[0].content[0].text=JSON.stringify({...data,evidence:[data.evidence.find(e=>e.articleId===articleId)]});const piece=await mockResponse(one).json(),out=JSON.parse(piece.output[0].content[0].text);facts.push(c.mode==='qa'?out.answer[0]:{...out.facts[0],factId:`f${facts.length+1}`});}
   if(c.mode==='qa')o.answer=facts;else{o.facts=facts;o.outline=['보도 소개','출처별 핵심 내용','정보 범위와 마무리'].map(heading=>({heading,factIds:facts.map(f=>f.factId),creativeNote:'구성 제안: 출처별 표현을 구분하여 소개한다.'}));}
  }
  if(c.mode==='script'){assert.equal(wire.text.format.schema.properties.caveats.maxItems,0);assert.deepEqual(o.caveats,[]);assert.deepEqual(o.draft,[]);}
  if(scenario==='invalid')(o.answer??o.facts)[0].text='제작사가 새로운 개봉일을 공식 발표했다. PRIVATE_RAW_ERROR';
  if(scenario==='unknown')delete v.usage;
  v.output[0].content[0].text=JSON.stringify(o);return Response.json(v);
 }catch(e){if(scenario!=='timeout')transportFailure=e;throw e;}};
 const scores=id=>({scores:ORDER.indexOf(id)<2?[2,2,2,2,2,2,'N/A','N/A',2]:Array(9).fill(2),critical:false});
 async function score(id,value=scores(id)){const sp=join(root,'scores.json');await writeFile(sp,JSON.stringify(value),{mode:0o600});return cli.run(['score','--prior',path,'--case',id,'--scores',sp,'--confirm','RECORD_OWNER_REVIEW_AND_DELETE'],keyFree);}
 async function run(id,scenario){transportFailure=null;const r=await execute(path,id,{key:'SYNTHETIC_SECRET',transport:transport(id,scenario)});if(transportFailure)throw transportFailure;assert.equal(r.result.providerAttempts,1);assert.doesNotMatch(JSON.stringify(r),/SYNTHETIC_SECRET|PRIVATE_RAW_ERROR|Bearer|supports.*span/);return r;}
 let afterFirst;
 for(const [i,id] of ORDER.entries()){
  const r=await run(id);assert.equal(r.status,'PROGRAM_PASS_OWNER_REVIEW_REQUIRED',JSON.stringify(r.result));assert.equal(r.result.charged,i<2?5:7);assert.equal(r.result.settlement,'completed');assert.equal(r.result.refund,null);
  const body=await review.readOutput(dir,g,id);assert.match(review.render(body),/https:/);if(i>=2){assert(body.result.result.caveats.length);assert.deepEqual(Object.keys(body.result.result.caveats[0]).sort(),['evidenceIds','text']);assert.deepEqual(body.result.result.draft,[]);}
  assert.equal((await lstat(join(dir,'review',id+'.body.json'))).mode&0o777,0o600);assert.equal((await lstat(join(dir,'review'))).mode&0o777,0o700);
  await assert.rejects(()=>execute(path,id,{key:'SYNTHETIC'}),/ALREADY/);if(i<3)await assert.rejects(()=>execute(path,ORDER[i+1],{key:'SYNTHETIC'}),/OWNER_PASS/);
  if(i===0){afterFirst=join(root,'after-first');await cp(dir,afterFirst,{recursive:true});}
  assert.equal((await score(id)).verdict,'OWNER_PASS');assert.equal(await exists(join(dir,'review',id+'.body.json')),false);assert(await review.reviewedPass(dir,g,id));await assert.rejects(()=>score(id),/ALREADY/);
 }
 assert.equal(calls,4);const complete=await state.inspect(path);assert.equal(complete.additional.attempts,4);assert.equal(complete.additional.reservedMicros,105600);assert.equal(complete.aggregate.attempts,14);assert.equal(complete.aggregate.reservedMicros,384000);assert.equal(complete.ledgerEntries,8);assert.equal((await readBudget(dir,g)).records.length,22);
 // Composite seals protect both deletion/score receipts and local D1, including
// attempts to replace a reviewed verdict after the body has gone.
 const rp=join(dir,'review',ORDER[0]+'.reviewed.json'),rb=await readFile(rp);await writeFile(rp,JSON.stringify({...JSON.parse(rb),critical:true}));await assert.rejects(()=>state.inspect(path),/CHANGED/);await writeFile(rp,rb);
 const saved=join(root,'complete');await cp(dir,saved,{recursive:true});
 const db=new DatabaseSync(await sqlite(join(dir,'local-d1')));db.exec("DROP TRIGGER credit_wallet_guard; UPDATE credit_wallets SET balance=balance+1");db.close();await assert.rejects(()=>state.inspect(path));await branch(saved);
 const oldJ=join(a.stateDir,'mvp-p44-e5j-v1'),savedJ=join(root,'saved-j');await cp(oldJ,savedJ,{recursive:true});const jdb=new DatabaseSync(await sqlite(join(oldJ,'local-d1')));jdb.exec("DROP TRIGGER credit_wallet_guard; UPDATE credit_wallets SET balance=balance+1");jdb.close();try{await assert.rejects(()=>state.inspect(path),/HISTORY/);}finally{await rm(oldJ,{recursive:true});await cp(savedJ,oldJ,{recursive:true});}
 const fullLock=await acquireBudgetLock(a.stateDir),fullBudget=await openBudget(dir,g,{heldLock:fullLock,requireExisting:true});try{assert.throws(()=>fullBudget.canReserve(19200),/BUDGET_STOP/);}finally{await fullBudget.close();await fullLock.close();}
 console.log('Four independent executions, durable reservations, 5/7 CR and review/delete gates PASS.');
 // Validated P66 insufficient evidence remains reviewable and fully refunded.
 await branch(afterFirst);await score(ORDER[0]);const limited=await run(ORDER[1],'insufficient');assert.equal(limited.status,'PROGRAM_PASS_OWNER_REVIEW_REQUIRED');assert.equal(limited.result.code,'INSUFFICIENT_EVIDENCE');assert.equal(limited.result.refund.applied,5);assert.equal(limited.result.settlement,'failed');await assert.rejects(()=>execute(path,ORDER[2],{key:'SYNTHETIC'}),/OWNER_PASS/);assert.equal((await score(ORDER[1])).verdict,'OWNER_PASS');const beforeGuide=join(root,'before-guide');await cp(dir,beforeGuide,{recursive:true});assert.equal((await run(ORDER[2])).status,'PROGRAM_PASS_OWNER_REVIEW_REQUIRED');
 await branch(beforeGuide);const invalidGuide=await run(ORDER[2],'invalid');assert.equal(invalidGuide.result.code,'INVALID_OUTPUT');assert.equal(invalidGuide.result.refund.applied,7);assert.equal(invalidGuide.result.settlement,'failed');await assert.rejects(()=>execute(path,ORDER[3],{key:'SYNTHETIC'}),/OWNER_PASS/);
 for(const value of [{...scores(ORDER[0]),critical:true},{scores:[2,2,1,2,2,2,'N/A','N/A',2],critical:false},{scores:[2,2,'NOT_REVIEWED',2,2,2,'N/A','N/A',2],critical:false}]){await branch(afterFirst);assert.equal((await score(ORDER[0],value)).verdict,'OWNER_NOT_PASS');await assert.rejects(()=>execute(path,ORDER[1],{key:'SYNTHETIC'}),/OWNER_PASS/);}
 // Corrupt/missing output, expiry, and manual privacy deletion cannot unlock next.
 await branch(afterFirst);const bp=join(dir,'review',ORDER[0]+'.body.json'),bb=await readFile(bp);await writeFile(bp,Buffer.concat([bb,Buffer.from(' ')]));await assert.rejects(()=>score(ORDER[0]),/CHANGED/);await assert.rejects(()=>execute(path,ORDER[1],{key:'SYNTHETIC'}),/CHANGED/);await writeFile(bp,bb);
 Date.now=()=>clock()+86400001;try{await assert.rejects(()=>review.readOutput(dir,g,ORDER[0]),/EXPIRED/);await review.remove(dir,g,ORDER[0],'DELETE_RESULT_BODY');assert.equal((await review.list(dir,g))[0].deletion,'EXPIRED_UNREVIEWED');}finally{Date.now=clock;}await assert.rejects(()=>execute(path,ORDER[1],{key:'SYNTHETIC'}),/CHANGED/);
 for(const scenario of ['invalid','timeout','unknown','insufficient']){await branch();const r=await run(ORDER[0],scenario);assert.equal(r.status,'STOP_UNEXPECTED_RESULT');assert.equal(r.result.refund.applied,5);assert.equal(r.additional.reservedMicros,19200);assert.equal((await state.inspect(path)).additional.unknownUsageAttempts,['invalid','insufficient'].includes(scenario)?0:1);assert.equal(await exists(bp),scenario==='insufficient');if(scenario==='insufficient')await assert.rejects(()=>score(ORDER[0]),/PROGRAM_PASS/);await assert.rejects(()=>execute(path,ORDER[0],{key:'SYNTHETIC'}),/ALREADY/);await assert.rejects(()=>execute(path,ORDER[1],{key:'SYNTHETIC'}),/OWNER_PASS/);}
 await branch();const broken=createExecute(state,{retain:async()=>{throw Error('STORAGE_FAILURE');}}),storage=await broken(path,ORDER[0],{key:'SYNTHETIC',transport:transport(ORDER[0])});assert.equal(storage.status,'STOP_OUTPUT_STORAGE_FAILED');assert.equal(storage.result.charged,5);assert.equal(storage.result.refund,null);assert.equal((await state.inspect(path)).status,'STOP_OUTPUT_STORAGE_FAILED');await assert.rejects(()=>execute(path,ORDER[1],{key:'SYNTHETIC'}),/INCOMPLETE/);
 await branch();const lease=await acquireBudgetLock(a.stateDir),budget=await openBudget(dir,g,{heldLock:lease,requireExisting:true});await budget.checked('P84','STARTED');await budget.reserve('P84',19200);await budget.close();await lease.close();const stopped=await state.inspect(path);assert.equal(stopped.status,'STOP_INCOMPLETE_NO_RETRY');assert.equal(stopped.additional.unknownUsageAttempts,1);await assert.rejects(()=>execute(path,ORDER[0],{key:'SYNTHETIC'}),/INCOMPLETE/);
 for(const id of ORDER){assert.equal(review.validateScores(id,scores(id)),'OWNER_PASS');assert.equal(review.validateScores(id,{...scores(id),critical:true}),'OWNER_NOT_PASS');}assert.throws(()=>review.validateScores(ORDER[0],{scores:Array(9).fill(2),critical:false}));assert.throws(()=>review.validateScores(ORDER[2],scores(ORDER[0])));
 assert.equal(await snapshot(path),before);assert.deepEqual(await readFile(path),original);assert.deepEqual(await readFile('evaluation/assistant-mvp/e6a-cases.json'),dataset);for(const [i,p] of protectedFiles.entries())assert.deepEqual(await readFile(p),protectedBytes[i]);assert.equal(outbound,0);
 assert.equal(cli.safeFailure(Error('PRIVATE_SECRET')).code,'E6B_STOP');
 console.log('PASS E.6B pinned ten-attempt history; current four-case local D1/mock; P66 refund; sequential immutable review; outbound ZERO; live NOT AUTHORIZED.');
}finally{await audited?.reader.close();globalThis.fetch=oldFetch;await rm(root,{recursive:true,force:true});assert.deepEqual(await readFile(MANIFEST),manifest);}
