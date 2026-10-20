import strict from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,readdir,lstat,cp,rename,mkdir,symlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {syntheticHistory} from './test-e5j-history-fixture.mjs';
import * as actualState from './assistant-e5j/state.mjs';
import {createState} from './assistant-e5h/state.mjs';
import {createExecute} from './assistant-e5h/execute.mjs';
import {createCli} from './assistant-e5h/cli.mjs';
import * as fixed from './assistant-e5j/revision.mjs';
import * as review from './assistant-e5j/review.mjs';
let {inspect,authorize,context,grantFor,validateGrant,totals}=actualState;
import {revision,DIRECTORY,MANIFEST,internal} from './assistant-e5j/revision.mjs';
import {execute as actualExecute} from './assistant-e5j/execute.mjs';
let execute=actualExecute;
import {list,readOutput,render,score,remove,validateScores} from './assistant-e5j/review.mjs';
import {run as actualRun,safeFailure} from './assistant-e5j/cli.mjs';
let run=actualRun;
import {hash,readBudget,openBudget,acquireBudgetLock} from './assistant-eval/budget.mjs';
import {mockResponse} from './assistant-eval/transport.mjs';
import {requireActive} from './assistant-mvp/handoff.mjs';
let auditContext;
let count=0;const assert=new Proxy(strict,{apply(t,s,a){count++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{count++;return t[k](...a);}:t[k];}});
const root=await mkdtemp(join(tmpdir(),'holocron-e5j-test-')),oldFetch=globalThis.fetch;let outbound=0;
globalThis.fetch=()=>{outbound++;throw Error('REAL_NETWORK_FORBIDDEN');};
async function snapshot(dir){const r={};for(const n of await readdir(dir)){if(n===DIRECTORY||n==='budget.lock'||n.endsWith('-shm'))continue;const p=join(dir,n),s=await lstat(p);r[n]=s.isDirectory()?await snapshot(p):hash(await readFile(p));}return r;}
const frozenPaths=['evaluation/assistant/manifest.json','evaluation/assistant/public-archive.json','evaluation/assistant-mvp/manifest.json','evaluation/assistant-mvp/live-revision.json','evaluation/assistant-mvp/cases.json','evaluation/assistant-mvp/rubric.json','evaluation/assistant-mvp/e5d-revision.json','evaluation/assistant-mvp/e5f-revision.json','evaluation/assistant-mvp/e5h-revision.json'];
const frozen=await Promise.all(frozenPaths.map(p=>readFile(p))),manifest=await readFile(MANIFEST);
try{
 const loaded=await revision();assert.equal(loaded.cases.map(c=>c.id).join(),'P44');assert.equal(loaded.manifest.runtimeHash,'0559656c7679972b9996d1088a927c6acc4d763a4c5ee02e724345b870997f9b');
 const path=await syntheticHistory(root),original=await readFile(path),a=JSON.parse(original),before=await snapshot(a.stateDir),dir=join(a.stateDir,DIRECTORY);
 const env=new Proxy({},{get(){throw Error('KEY_READ_FORBIDDEN');}}),plan=await run(['inspect','--prior',path],env);
 assert.equal(plan.status,'PLAN_ONLY_LIVE_NOT_AUTHORIZED');assert.equal(plan.history.attempts,9);assert.equal(plan.history.reservedMicros,244800);assert.equal(plan.history.usageEstimateMicros,32355);assert.equal(plan.history.unknownUsageAttempts,0);
 assert.equal(plan.history.e3.ledgerEntries,7);assert.equal(plan.history.e5b.ledgerEntries,5);assert.equal(plan.history.e5d.ledgerEntries,2);assert.equal(plan.history.e5d.semanticReview,'OWNER_NOT_PASS');assert.equal(plan.history.e5f.ledgerEntries,5);
 assert.deepEqual(plan.history.e5f.p41,{program:'OK',semanticReview:'OWNER_PASS',deletion:'REVIEWED',bodyExists:false});assert.equal(plan.history.e5f.p44.program,'INVALID_OUTPUT');assert.equal(plan.history.e5f.p44.refund,7);assert.equal(plan.history.e5f.p44.bodyExists,false);assert.equal(plan.history.e5f.p44.semanticReview,'NOT_REVIEWED');
 assert.equal(plan.history.e5h.ledgerEntries,3);assert.deepEqual(plan.history.e5h.p44,{program:'INVALID_OUTPUT',settlement:'failed',refund:7,bodyExists:false,semanticReview:'NOT_REVIEWED',diagnostic:'NOT_PERSISTED_IN_JOURNAL'});
 assert.deepEqual(plan.additionalCeiling,{attempts:1,reservedMicros:33600});assert.deepEqual(plan.aggregateCeiling,{attempts:10,reservedMicros:278400});assert.deepEqual(await snapshot(a.stateDir),before);await assert.rejects(()=>lstat(dir),{code:'ENOENT'});
 // One complete pinned audit above; one real pinned corruption check below.
 // Reuse one audited context for boundary tests; its real byte-seal recheck
 // executes every time. Production contexts always perform a fresh pinned audit.
 const hj=join(a.stateDir,'mvp-p44-e5h-v1','budget.jsonl'),hbytes=await readFile(hj);
 await writeFile(hj,hbytes.subarray(0,-2));try{await assert.rejects(()=>actualState.inspect(path),/HISTORY/);}finally{await writeFile(hj,hbytes);}
 auditContext=await actualState.context(path);assert.deepEqual(auditContext.history,plan.history);
 const readerDouble=async()=>({read:p=>auditContext.reader.read(p,'recheck'),async close(){}});
 const state=createState({...fixed,historyReader:readerDouble,prior:{attempts:9,reservedMicros:244800,usageEstimateMicros:32355},approvalPrefix:'eval-e5j-',conflictCode:'E5J_CONFIGURATION_CONFLICT',authorizeConfirmation:'AUTHORIZE_E5J_P44_ONCE',review:async()=>review});
 ({inspect,authorize,context,grantFor,validateGrant}=state);
 execute=createExecute({...state,...fixed,...review,conflictCode:'E5J_CONFIGURATION_CONFLICT',integrityCode:'E5J_INTEGRITY_FAILED'});
 ({run}=createCli({...state,...fixed,...review,execute,conflictCode:'E5J_CONFIGURATION_CONFLICT',integrityCode:'E5J_INTEGRITY_FAILED',stopCode:'E5J_STOP'}));
 console.log('Full pinned nine-attempt audit and pinned corruption rejection PASS; boundary cases reuse a pinned audit with real byte-seal rechecks.');
 await assert.rejects(()=>execute(path,'E5J-P44',{key:'SYNTHETIC'}));
 for(const id of ['P44','E5J-P41','E5F-P44','E5J-P07','E5J-P42','E5J-P43','E5J-P45','E5J-P46'])assert.throws(()=>internal(id));
 for(const args of [[],['run','--prior',path],['inspect','--prior',path,'--repeat','yes'],['run','--prior',path,'--case','E5J-P44','--confirm','wrong']])await assert.rejects(()=>run(args,env));
 await assert.rejects(()=>authorize(path,'0'.repeat(64),'AUTHORIZE_E5J_P44_ONCE'),/PLAN_CHANGED/);
 await assert.rejects(()=>authorize(path,plan.planToken,'AUTHORIZE_E5F_TWO_CASES'),/AUTHORIZATION/);
 await authorize(path,plan.planToken,'AUTHORIZE_E5J_P44_ONCE');
 const gp=join(dir,'authorization.json'),gb=await readFile(gp),g=JSON.parse(gb);assert.equal(Date.parse(g.expiresAt)-Date.parse(g.issuedAt),86400000);assert.equal(g.history.e3.expiresAt,a.expiresAt);assert(Date.parse(a.expiresAt)<Date.now());assert.equal(g.maxCalls,1);assert.equal(g.maxMicros,33600);
 assert.equal((await authorize(path,plan.planToken,'AUTHORIZE_E5J_P44_ONCE')).status,'ALREADY_AUTHORIZED_NO_EXTENSION');assert.deepEqual(await readFile(gp),gb);
 const x=await context(path);try{assert.deepEqual(await grantFor(x),g);for(const patch of [{maxCalls:2},{maxMicros:33601},{globalMaxCalls:41},{globalMaxMicros:2000001},{model:'other'},{scope:{'E5J-P41':19200}},{revisionHash:'0'.repeat(64)},{expiresAt:new Date(Date.parse(g.expiresAt)+1).toISOString()}])assert.throws(()=>validateGrant({...g,...patch},x));}finally{await x.reader.close();}
 const clock=Date.now;assert.throws(()=>requireActive(g,Date.parse(g.expiresAt)),/EXPIRED/);
 Date.now=()=>Date.parse(g.expiresAt);try{await assert.rejects(()=>execute(path,'E5J-P44',{key:'SYNTHETIC'}),/EXPIRED/);}finally{Date.now=clock;}
 const lock=await acquireBudgetLock(a.stateDir);try{await assert.rejects(()=>execute(path,'E5J-P44',{key:'SYNTHETIC'}));await assert.rejects(()=>acquireBudgetLock(a.stateDir));}finally{await lock.close();}
 const jpath=join(dir,'budget.jsonl');await rename(jpath,jpath+'.hold');try{await assert.rejects(()=>authorize(path,plan.planToken,'AUTHORIZE_E5J_P44_ONCE'));await assert.rejects(()=>lstat(jpath));}finally{await rename(jpath+'.hold',jpath);}
 const changed=JSON.parse(manifest);changed.pipelineHash='0'.repeat(64);await writeFile(MANIFEST,JSON.stringify(changed));try{await assert.rejects(()=>revision(),/INTEGRITY/);}finally{await writeFile(MANIFEST,manifest);}
 // Tamper only disposable synthetic originals; no repair/reset interface exists in the CLI.
 const fDir=join(a.stateDir,'mvp-smoke-e5f-v1'),hDir=join(a.stateDir,'mvp-p44-e5h-v1');
 for(const p of [join(hDir,'authorization.json'),join(hDir,'budget.jsonl'),path,join(a.stateDir,'budget.jsonl'),join(a.stateDir,'mvp-smoke-e5b-v1','budget.jsonl'),join(a.stateDir,'mvp-smoke-e5d-v1','review','E5D-P41.reviewed.json'),...['authorization.json','budget.jsonl','review/E5F-P41.stored.json','review/E5F-P41.reviewed.json','review/E5F-P41.deleted.json'].map(n=>join(fDir,n))]){
  const bytes=await readFile(p);await writeFile(p,bytes.subarray(0,-2));try{await assert.rejects(()=>inspect(path),/HISTORY/);}finally{await writeFile(p,bytes);}
 }
 for(const id of ['E5F-P41','E5F-P44']){const p=join(fDir,'review',id+'.body.json');await writeFile(p,'{}',{mode:0o600});try{await assert.rejects(()=>inspect(path),/HISTORY/);}finally{await rm(p);}}
 const fp=join(fDir,'review','E5F-P41.reviewed.json'),fb=await readFile(fp),fv=JSON.parse(fb);await writeFile(fp,JSON.stringify({...fv,verdict:'OWNER_NOT_PASS',scores:Array(9).fill(1)}));try{await assert.rejects(()=>inspect(path),/HISTORY/);}finally{await writeFile(fp,fb);}
 await rename(join(fDir,'local-d1'),join(fDir,'held-d1'));try{await assert.rejects(()=>inspect(path),/HISTORY/);}finally{await rename(join(fDir,'held-d1'),join(fDir,'local-d1'));}
 const saved=join(root,'saved-f');await cp(fDir,saved,{recursive:true});
 async function sqlite(p){for(const e of await readdir(p,{withFileTypes:true})){const f=join(p,e.name);if(e.isDirectory()){const found=await sqlite(f);if(found)return found;}else if(e.name.endsWith('.sqlite')&&e.name!=='metadata.sqlite')return f;}}
 const db=new DatabaseSync(await sqlite(join(fDir,'local-d1')));db.exec("DROP TRIGGER credit_ledger_no_update; UPDATE credit_ledger SET kind='reward' WHERE kind='ai_spend'");db.close();
 try{await assert.rejects(()=>inspect(path),/HISTORY/);}finally{await rm(fDir,{recursive:true});await cp(saved,fDir,{recursive:true});}
 for(const n of ['E5H-P44.body.json','E5H-P44.reviewed.json','E5H-P44.stored.json','E5H-P44.deleted.json']){await mkdir(join(hDir,'review'),{recursive:true,mode:0o700});const p=join(hDir,'review',n);await writeFile(p,'{}',{mode:0o600});try{await assert.rejects(()=>inspect(path),/HISTORY/);}finally{await rm(p);}}
 await rm(join(hDir,'review'),{recursive:true});
 console.log('E5J snapshot-bound tamper and single-case authorization checks PASS (synthetic).');
 const pristine=join(root,'pristine');await cp(dir,pristine,{recursive:true});
 async function resetSynthetic(){await rm(dir,{recursive:true});await cp(pristine,dir,{recursive:true});}
 let calls=0;const transport=async(_u,init)=>{calls++;const j=await readBudget(dir,g);assert.equal(j.records.filter(r=>r.type==='reserve').length,1);assert.equal(j.records.at(-1).type,'reserve');assert.equal((await lstat(join(a.stateDir,'budget.lock'))).isFile(),true);
  const wire=JSON.parse(init.body);assert.match(wire.instructions,/caveats는 status와 관계없이 반드시 \[\]입니다/);assert.match(wire.instructions,/발언자·발언 대상/);assert.equal(wire.text.format.name,'archive_script');assert.equal(wire.text.format.strict,true);assert.equal(wire.text.format.schema.properties.caveats.maxItems,0);assert(wire.text.format.schema.required.includes('caveats'));
  const response=await mockResponse(wire).json(),o=JSON.parse(response.output[0].content[0].text);o.caveats=[];o.outline=['도입','본론','마무리'].map(heading=>({heading,factIds:['f1'],creativeNote:'구성 제안: 핵심 소식을 소개한다.'}));response.output[0].content[0].text=JSON.stringify(o);return Response.json(response);
 };
 const result=await actualExecute(path,'E5J-P44',{key:'SYNTHETIC_SECRET',transport});assert.equal(calls,1);assert.equal(result.status,'PROGRAM_PASS_OWNER_REVIEW_REQUIRED');assert.equal(result.result.charged,7);assert.equal(result.result.refund,null);assert.deepEqual(result.aggregate,{attempts:10,reservedMicros:278400});assert.equal(result.semanticReview,'NOT_REVIEWED');assert.doesNotMatch(JSON.stringify(result),/SYNTHETIC_SECRET|Bearer|supports.*span/);
 await assert.rejects(()=>execute(path,'E5J-P44',{key:'SYNTHETIC',transport}),/CASE_ALREADY_STARTED/);assert.equal(calls,1);
 const body=await readOutput(dir,g,'E5J-P44'),bp=join(dir,'review','E5J-P44.body.json');assert.equal(body.caseId,'E5J-P44');assert(body.result.result.caveats.length>0);assert.match(body.result.result.caveats[0].text,/요약에 없는 정보가 현실에도 없다는 뜻은 아닙니다/);assert.deepEqual(Object.keys(body.result.result.caveats[0]).sort(),['evidenceIds','text']);assert.equal(body.revisionHash,loaded.hash);assert.equal(Date.parse(body.expiresAt)-Date.parse(body.createdAt),86400000);assert.match(render(body),/영상 구성 가이드/);assert.match(render(body),/https:/);assert.equal((await lstat(bp)).mode&0o077,0);assert.equal((await lstat(join(dir,'review'))).mode&0o777,0o700);
 await assert.rejects(()=>run(['view','--prior',path,'--case','E5J-P44','--confirm','SHOW_PRIVATE_RESULT'],env),/LOCAL_TERMINAL_ONLY/);
 const sp=join(root,'scores.json');await writeFile(sp,JSON.stringify({scores:[2,2,1,1,1,2,2,1,2],critical:false}),{mode:0o600});
 const reviewed=await run(['score','--prior',path,'--case','E5J-P44','--scores',sp,'--confirm','RECORD_OWNER_REVIEW_AND_DELETE'],env);assert.equal(reviewed.verdict,'OWNER_NOT_PASS');await assert.rejects(()=>score(dir,g,'E5J-P44',{scores:Array(9).fill(2),critical:false}),/REVIEW_ALREADY_RECORDED/);await assert.rejects(()=>lstat(bp),{code:'ENOENT'});assert.equal((await list(dir,g))[0].deletion,'REVIEWED');assert.equal((await inspect(path)).ledgerEntries,2);
 assert.deepEqual(await snapshot(a.stateDir),before);assert.deepEqual(await readFile(path),original);
 // New disposable branches test output failure/expiry without any real replay.
 await resetSynthetic();await execute(path,'E5J-P44',{key:'SYNTHETIC',transport});const bb=await readFile(bp);await writeFile(bp,Buffer.concat([bb,Buffer.from(' ')]));await assert.rejects(()=>readOutput(dir,g,'E5J-P44'),/INTEGRITY/);await writeFile(bp,bb);
 Date.now=()=>clock()+86400001;try{await assert.rejects(()=>readOutput(dir,g,'E5J-P44'),/EXPIRED/);await remove(dir,g,'E5J-P44','DELETE_RESULT_BODY');assert.equal((await list(dir,g))[0].deletion,'EXPIRED_UNREVIEWED');}finally{Date.now=clock;}
 await resetSynthetic();const storage=await execute(path,'E5J-P44',{key:'SYNTHETIC',transport:async(_u,i)=>{await mkdir(join(dir,'review'),{mode:0o700});await symlink('/dev/null',bp);return mockResponse(JSON.parse(i.body));}});
 assert.equal(storage.status,'STOP_OUTPUT_STORAGE_FAILED');assert.equal(storage.result.charged,7);assert.equal(storage.result.refund,null);assert.equal((await inspect(path)).status,'STOP_OUTPUT_STORAGE_FAILED');await assert.rejects(()=>execute(path,'E5J-P44',{key:'SYNTHETIC'}),/INCOMPLETE/);
 for(const scenario of ['malformed','network','lost-response','timeout','grounding','nonempty-caveat','insufficient']){
  await resetSynthetic();let n=0;
  const report=await execute(path,'E5J-P44',{key:'SYNTHETIC',transport:async(_u,i)=>{n++;
   if(['grounding','nonempty-caveat','insufficient'].includes(scenario)){const v=await mockResponse(JSON.parse(i.body)).json(),o=JSON.parse(v.output[0].content[0].text);if(scenario==='grounding')o.facts[0].text='디즈니가 가격 인상을 공식 발표했다. PRIVATE_RAW_ERROR';else if(scenario==='nonempty-caveat')o.caveats=[{text:'합성 주의사항',evidenceIds:o.facts[0].evidenceIds}];else Object.assign(o,{status:'insufficient_evidence',facts:[],caveats:[],outline:[],draft:[]});v.output[0].content[0].text=JSON.stringify(o);return Response.json(v);}
   if(scenario==='malformed')return Response.json({secret:'PRIVATE_RAW_ERROR'});if(scenario==='lost-response')return new Response(new ReadableStream({start(c){c.error(Error('PRIVATE_RAW_ERROR'));}}),{headers:{'Content-Type':'application/json'}});if(scenario==='timeout')throw new DOMException('PRIVATE_RAW_ERROR','TimeoutError');throw Error('PRIVATE_RAW_ERROR');
  }});
  assert.equal(n,1);assert.equal(report.status,'STOP_UNEXPECTED_RESULT');assert.deepEqual(report.result.refund,{requested:7,applied:7,forfeited:0,full:true});assert.equal(report.additional.reservedMicros,33600);const checked=await inspect(path);assert.equal(checked.additional.unknownUsageAttempts,['grounding','nonempty-caveat','insufficient'].includes(scenario)?0:1);assert.equal(checked.ledgerEntries,3);assert.doesNotMatch(JSON.stringify(report),/PRIVATE_RAW_ERROR/);assert.equal((await list(dir,g))[0].storage,scenario==='insufficient'?'STORED':'NOT_STORED');assert.equal((await list(dir,g))[0].exists,scenario==='insufficient');await assert.rejects(()=>execute(path,'E5J-P44',{key:'SYNTHETIC'}),/CASE_ALREADY_STARTED/);
  if(scenario==='insufficient'){assert.equal(report.result.code,'INSUFFICIENT_EVIDENCE');const b=await readOutput(dir,g,'E5J-P44');assert.equal(b.result.result.caveats.length,1);assert.deepEqual(b.result.result.caveats[0].evidenceIds,[]);await remove(dir,g,'E5J-P44','DELETE_RESULT_BODY');}
  if(scenario==='nonempty-caveat')assert.deepEqual(report.result.diagnostic,{stage:'schema',reason:'ARRAY_LENGTH',path:'$.caveats'});
  if(scenario==='grounding')assert.deepEqual(report.result.diagnostic,{stage:'grounding',reason:'OFFICIAL_PROMOTION',path:'$.facts[0].certainty'});
 }
 await resetSynthetic();const lease=await acquireBudgetLock(a.stateDir),b=await openBudget(dir,g,{heldLock:lease,requireExisting:true});await b.checked('P44','STARTED');await b.reserve('P44',33600);assert.throws(()=>b.canReserve(33600),/BUDGET_STOP/);await b.close();await lease.close();
 const interrupted=await inspect(path);assert.equal(interrupted.status,'STOP_INCOMPLETE_NO_RETRY');assert.equal(interrupted.additional.unknownUsageAttempts,1);assert.equal(interrupted.additional.reservedMicros,33600);await assert.rejects(()=>execute(path,'E5J-P44',{key:'SYNTHETIC'}),/INCOMPLETE/);
 assert.equal(totals([{type:'reserve',attemptId:'a',micros:33600}]).unknownUsageAttempts,1);
 for(const scores of [Array(9).fill(0),Array(9).fill(1),Array(9).fill('NOT_REVIEWED')])assert.equal(validateScores('E5J-P44',{scores,critical:false}),'OWNER_NOT_PASS');assert.equal(validateScores('E5J-P44',{scores:Array(9).fill(2),critical:false}),'OWNER_PASS');assert.equal(validateScores('E5J-P44',{scores:Array(9).fill(2),critical:true}),'OWNER_NOT_PASS');
 assert.equal(safeFailure(Error('PRIVATE_UPPERCASE_SECRET')).code,'E5J_STOP');assert.deepEqual(await snapshot(a.stateDir),before);for(const [i,p] of frozenPaths.entries())assert.deepEqual(await readFile(p),frozen[i]);assert.equal(outbound,0);
 console.log(`PASS ${count} E.5J assertions; synthetic histories/local D1/mock transport; real Provider outbound ZERO; live NOT AUTHORIZED`);
}finally{await auditContext?.reader.close();await writeFile(MANIFEST,manifest);globalThis.fetch=oldFetch;await rm(root,{recursive:true,force:true});}
