import strict from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,symlink,readdir,lstat,rename,cp} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {DatabaseSync} from 'node:sqlite';
import {inspectHandoff,authorizeHandoff,HANDOFF,requireActive,validateGrant,validateRecords} from './assistant-mvp/handoff.mjs';
import {smoke} from './assistant-mvp/live-smoke.mjs';
import {run,parse,safeFailure} from './assistant-mvp/live-cli.mjs';
import {loadLiveRevision,HISTORICAL} from './assistant-mvp/live-revision.mjs';
import {deleteReviewed,reviewFiles} from './assistant-mvp/review-output.mjs';
import {openBudget,acquireBudgetLock,readBudget,hash} from './assistant-eval/budget.mjs';
import {mockResponse} from './assistant-eval/transport.mjs';
let count=0;const assert=new Proxy(strict,{apply(t,s,a){count++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{count++;return t[k](...a);}:t[k];}});
const exec=promisify(execFile),root=await mkdtemp(join(tmpdir(),'holocron-handoff-test-')),repo=process.cwd();
let actualOutbound=0;const oldFetch=globalThis.fetch;
globalThis.fetch=()=>{actualOutbound++;throw Error('REAL_OUTBOUND_FORBIDDEN');};
async function snapshot(dir){const result={};for(const name of await readdir(dir)){if(name===HANDOFF||name==='budget.lock'||name.endsWith('-shm'))continue;const p=join(dir,name),s=await lstat(p);result[name]=s.isDirectory()?await snapshot(p):hash(await readFile(p));}return result;}
async function sqliteFile(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory()){const f=await sqliteFile(p);if(f)return f;}else if(e.name.endsWith('.sqlite')&&e.name!=='metadata.sqlite')return p;}}
// Reuse the historical test's real admission/settlement setup under its pinned
// schema. Only synthetic accounts exist here; these are not the user's PC files.
async function makeHistory(){
  const source=join(root,'source');await exec('git',['archive',HISTORICAL,'--output='+join(root,'source.tar')]);
  await import('node:fs/promises').then(m=>m.mkdir(source));await exec('tar',['-xf',join(root,'source.tar'),'-C',source]);
  await symlink(resolve('node_modules'),join(source,'node_modules'),'dir');
  const old=await readFile(join(source,'scripts/test-assistant-mvp-evaluation.mjs'),'utf8');
  const segment=old.slice(old.indexOf("  const directory=join(root,'prior')"),old.indexOf('  // SQLite read-only WAL'));
  const fixture=`import {join} from 'node:path';import {readFile,writeFile} from 'node:fs/promises';import {randomUUID} from 'node:crypto';
    import {loadMvp} from './scripts/assistant-mvp/fixture.mjs';import {openBudget,MODEL,PROFILE,hash} from './scripts/assistant-eval/budget.mjs';
    import {localRuntime} from './scripts/assistant-eval/local-runtime.mjs';import {loadTestModules} from './scripts/test-module-loader.mjs';
    const root=process.argv[2],loaded=await loadMvp(),priorManifest=await readFile('evaluation/assistant/manifest.json','utf8');${segment}`;
  await writeFile(join(source,'fixture.mjs'),fixture);
  await exec(process.execPath,['--import','./scripts/sites-env.mjs','fixture.mjs',root],{cwd:source,timeout:120000});
  return join(root,'approval.json');
}
let manifestBytes;
try{
  manifestBytes=await readFile('evaluation/assistant-mvp/live-revision.json');
  const frozen=await readFile('evaluation/assistant-mvp/manifest.json'),loaded=await loadLiveRevision();
  const path=await makeHistory(),approvalRaw=await readFile(path),a=JSON.parse(approvalRaw),before=await snapshot(a.stateDir);
  const untouchedEnv=new Proxy({},{get(){throw Error('KEY_READ_FORBIDDEN');}});
  assert.equal((await run(['inspect','--prior',path],untouchedEnv)).status,'HANDOFF_PLAN_ONLY');
  const p=await inspectHandoff(path);assert.equal(p.status,'HANDOFF_PLAN_ONLY');assert.equal(p.prior.attempts,3);assert.equal(p.prior.reservedMicros,86400);assert.equal(p.prior.usageEstimateMicros,13083);
  assert.deepEqual(p.scope,{P41:19200,P44:33600});assert.deepEqual(p.aggregateCeiling,{attempts:5,reservedMicros:139200});assert.equal(p.providerCalls,0);
  assert.deepEqual(await snapshot(a.stateDir),before);await assert.rejects(()=>lstat(join(a.stateDir,HANDOFF)),{code:'ENOENT'});
  await assert.rejects(()=>smoke(path,{key:'SYNTHETIC'})); // No new local authorization.
  for(const args of [[],['--live'],['smoke','--prior',path],['smoke','--prior',path,'--case','P42'],['inspect','--prior',path,'--repeat'],['authorize','--prior',path,'--plan','x','--confirm','wrong']])await assert.rejects(()=>run(args));
  for(const id of ['P42','P43','P45','P46','P07'])assert.throws(()=>parse(['smoke','--prior',path,'--case',id,'--confirm','EXECUTE_P41_P44_ONCE']));
  await assert.rejects(()=>authorizeHandoff(path,'0'.repeat(64),'AUTHORIZE_P41_P44_ONCE'),/PLAN_CHANGED/);
  const concurrent=await Promise.allSettled([authorizeHandoff(path,p.planToken,'AUTHORIZE_P41_P44_ONCE'),authorizeHandoff(path,p.planToken,'AUTHORIZE_P41_P44_ONCE')]);
  assert(concurrent.some(r=>r.status==='fulfilled'&&r.value.status==='AUTHORIZED_NOT_EXECUTED'));
  const dir=join(a.stateDir,HANDOFF),grantPath=join(dir,'authorization.json'),g=JSON.parse(await readFile(grantPath)),grantBytes=await readFile(grantPath);
  assert.equal(Date.parse(g.expiresAt)-Date.parse(g.issuedAt),86400000);assert.equal(g.prior.expiresAt,a.expiresAt);assert(Date.parse(a.expiresAt)<Date.now());
  assert.equal(g.prior.journalTip,p.prior.journalTip);assert.equal(g.prior.localDigest,p.prior.localDigest);
  assert.equal((await authorizeHandoff(path,p.planToken,'AUTHORIZE_P41_P44_ONCE')).status,'ALREADY_AUTHORIZED_NO_EXTENSION');assert.deepEqual(await readFile(grantPath),grantBytes);
  const scopeJournal=join(dir,'budget.jsonl');await rename(scopeJournal,scopeJournal+'.held');
  try{await assert.rejects(()=>authorizeHandoff(path,p.planToken,'AUTHORIZE_P41_P44_ONCE'));await assert.rejects(()=>lstat(scopeJournal),{code:'ENOENT'});assert.deepEqual(await readFile(grantPath),grantBytes);}
  finally{await rename(scopeJournal+'.held',scopeJournal);}
  assert.throws(()=>requireActive(g,Date.parse(g.expiresAt)),/EXPIRED/);assert.throws(()=>requireActive(g,Date.parse(g.issuedAt)-1),/EXPIRED/);
  const clock=Date.now;Date.now=()=>Date.parse(g.expiresAt);
  try{await assert.rejects(()=>smoke(path,{key:'SYNTHETIC'}),/HANDOFF_APPROVAL_EXPIRED/);}finally{Date.now=clock;}
  for(const change of [{scope:{P41:19200,P42:33600}},{maxCalls:3},{maxMicros:52801},{globalMaxCalls:41},{profile:'other'},{expiresAt:new Date(Date.parse(g.expiresAt)+1).toISOString()},{revisionHash:'0'.repeat(64)}])assert.throws(()=>validateGrant({...g,...change},p.prior,loaded,dir));
  const lock=await acquireBudgetLock(a.stateDir);try{await assert.rejects(()=>inspectHandoff(path),/HISTORICAL_AUDIT_FAILED/);await assert.rejects(()=>acquireBudgetLock(a.stateDir),/EVALUATION_LOCKED/);}finally{await lock.close();}
  // Original approval edit, journal corruption, missing store and local ledger
  // change all stop; restore only synthetic test bytes afterward.
  await writeFile(path,JSON.stringify({...a,expiresAt:new Date(Date.now()+86400000).toISOString()}));await assert.rejects(()=>inspectHandoff(path));await writeFile(path,approvalRaw);
  const journal=join(a.stateDir,'budget.jsonl'),journalBytes=await readFile(journal);
  await writeFile(journal,journalBytes.subarray(0,-1));await assert.rejects(()=>inspectHandoff(path));await writeFile(journal,journalBytes);
  await rename(join(a.stateDir,'local-d1'),join(a.stateDir,'held'));
  try{await assert.rejects(()=>inspectHandoff(path));}finally{await rename(join(a.stateDir,'held'),join(a.stateDir,'local-d1'));}
  const currentDb=await sqliteFile(join(dir,'local-d1')),db=new DatabaseSync(currentDb);
  db.prepare("UPDATE settings SET value='changed' WHERE key='evaluation_schema_hash'").run();db.close();await assert.rejects(()=>inspectHandoff(path));
  // Restore this empty synthetic state from a pristine copy prepared separately.
  const schemaHash=hash((await Promise.all((await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort().map(n=>readFile('drizzle/'+n,'utf8')))).join('\n'));
  const repair=new DatabaseSync(currentDb);repair.prepare("UPDATE settings SET value=? WHERE key='evaluation_schema_hash'").run(schemaHash);repair.close();
  const changed=JSON.parse(manifestBytes);changed.pipelineHash='0'.repeat(64);await writeFile('evaluation/assistant-mvp/live-revision.json',JSON.stringify(changed));
  try{await assert.rejects(()=>smoke(path,{key:'SYNTHETIC'}),/INTEGRITY/);}finally{await writeFile('evaluation/assistant-mvp/live-revision.json',manifestBytes);}
  // Save a pristine NEW synthetic scope for independent crash/error scenarios.
  // Never a supported user operation or a way to reset a real journal.
  const pristine=join(root,'pristine');await cp(dir,pristine,{recursive:true});
  let dispatch=0;
  const result=await smoke(path,{key:'SYNTHETIC_SECRET_NEVER_LOG',transport:async(url,init)=>{
    dispatch++;const j=await readBudget(dir,g),reserves=j.records.filter(r=>r.type==='reserve');
    assert.equal(reserves.length,dispatch);assert.equal(reserves.at(-1).caseId,dispatch===1?'P41':'P44');assert.equal(reserves.at(-1).micros,dispatch===1?19200:33600);
    assert.equal((await lstat(join(a.stateDir,'budget.lock'))).isFile(),true);
    return mockResponse(JSON.parse(init.body));
  }});
  assert.equal(dispatch,2);assert.equal(result.status,'SMOKE_PROGRAM_PASS_REVIEW_REQUIRED');assert.deepEqual(result.aggregate,{attempts:5,reservedMicros:139200});
  assert.deepEqual(result.additional,{attempts:2,reservedMicros:52800});assert.deepEqual(result.results.map(r=>r.charged),[5,7]);assert(result.results.every(r=>r.settlement==='completed'&&r.refund===null));
  assert.equal(result.semanticReview,'NOT_REVIEWED');assert.doesNotMatch(JSON.stringify(result),/SYNTHETIC_SECRET_NEVER_LOG|Bearer|supports.*span/);
  await assert.rejects(()=>smoke(path,{key:'SYNTHETIC'}),/SMOKE_ALREADY_STARTED_STOP/);
  const status=await inspectHandoff(path);assert.equal(status.ledgerEntries,4);assert.equal(status.additional.attempts,2);
  assert.deepEqual(await readFile(path),approvalRaw);assert.deepEqual(await snapshot(a.stateDir),before);assert.deepEqual(await readFile(journal),journalBytes);
  assert.equal((await reviewFiles(dir)).length,2);
  const reviewClock=Date.now;Date.now=()=>reviewClock()+86400001;
  try{assert((await reviewFiles(dir)).every(r=>r.expired));}finally{Date.now=reviewClock;}
  for(const id of ['P41','P44']){assert.equal((await lstat(join(dir,'review',id+'.json'))).mode&0o077,0);await deleteReviewed(dir,id,'DELETE_RESULT_BODY');}assert.equal((await reviewFiles(dir)).length,0);
  assert.equal((await readBudget(dir,g)).records.filter(r=>r.type==='reserve').length,2);
  // P44 failure preserves P41 success and refunds exactly the Guide's 7 CR.
  await rm(dir,{recursive:true});await cp(pristine,dir,{recursive:true});let second=0;
  const guideFailure=await smoke(path,{key:'SYNTHETIC',transport:async(_url,init)=>++second===1?mockResponse(JSON.parse(init.body)):Response.json({secret:'PRIVATE_RAW_GUIDE'})});
  assert.equal(guideFailure.status,'STOP_UNEXPECTED_RESULT');assert.equal(second,2);assert.deepEqual(guideFailure.results[1].refund,{requested:7,applied:7,forfeited:0,full:true});
  assert.deepEqual(guideFailure.aggregate,{attempts:5,reservedMicros:139200});assert(guideFailure.results[1].diagnostic);assert.doesNotMatch(JSON.stringify(guideFailure),/PRIVATE_RAW_GUIDE/);
  await deleteReviewed(dir,'P41','DELETE_RESULT_BODY');
  // Re-read the new authorization before the next case; no second dispatch
  // after a mid-run change. Restore synthetic bytes only for the next test.
  await rm(dir,{recursive:true});await cp(pristine,dir,{recursive:true});let changedCalls=0;
  await assert.rejects(()=>smoke(path,{key:'SYNTHETIC',transport:async(_url,init)=>{changedCalls++;await writeFile(grantPath,JSON.stringify({...g,maxCalls:3}));return mockResponse(JSON.parse(init.body));}}),/HANDOFF_CONFIGURATION_CONFLICT/);
  assert.equal(changedCalls,1);assert.equal((await readBudget(dir,g)).records.filter(r=>r.type==='reserve').length,1);
  await writeFile(grantPath,grantBytes);await deleteReviewed(dir,'P41','DELETE_RESULT_BODY');
  for(const scenario of ['malformed','network','lost-response','timeout']){
    await rm(dir,{recursive:true});await cp(pristine,dir,{recursive:true});let attempts=0;
    const report=await smoke(path,{key:'SYNTHETIC',transport:async()=>{attempts++;if(scenario==='malformed')return Response.json({secret:'PRIVATE_RAW_ERROR'});
      if(scenario==='lost-response')return new Response(new ReadableStream({start(c){c.error(Error('PRIVATE_RAW_ERROR'));}}),{headers:{'Content-Type':'application/json'}});
      if(scenario==='timeout')throw new DOMException('PRIVATE_RAW_ERROR','TimeoutError');throw Error('PRIVATE_RAW_ERROR');}});
    assert.equal(attempts,1);assert.equal(report.status,'STOP_UNEXPECTED_RESULT');assert.equal(report.additional.attempts,1);assert.equal(report.additional.reservedMicros,19200);
    assert.deepEqual(report.results[0].refund,{requested:5,applied:5,forfeited:0,full:true});assert.doesNotMatch(JSON.stringify(report),/PRIVATE_RAW_ERROR/);
    if(scenario==='malformed'){assert.equal(report.results[0].code,'INVALID_OUTPUT');assert(report.results[0].diagnostic);}
    assert.equal((await reviewFiles(dir)).length,0);await assert.rejects(()=>smoke(path,{key:'SYNTHETIC'}),/SMOKE_ALREADY_STARTED_STOP/);
  }
  // Crash before finish/checkpoint remains consumed and cannot start another case.
  await rm(dir,{recursive:true});await cp(pristine,dir,{recursive:true});
  const lease=await acquireBudgetLock(a.stateDir),b=await openBudget(dir,g,{heldLock:lease,requireExisting:true});
  await b.checked('P41','STARTED');await b.reserve('P41',19200);await b.close();await lease.close();
  assert.equal((await readBudget(dir,g)).records.filter(r=>r.type==='reserve').length,1);await assert.rejects(()=>smoke(path,{key:'SYNTHETIC'}),/INCOMPLETE_OR_CHANGED_LOCAL_STATE/);
  const incomplete=await inspectHandoff(path);assert.equal(incomplete.status,'BLOCKED_INCOMPLETE_ATTEMPT');assert.deepEqual(incomplete.additional,{attempts:1,reservedMicros:19200});
  assert.equal(safeFailure(Error('PRIVATE_UPPERCASE_SECRET')).code,'HANDOFF_STOP');assert.doesNotMatch(JSON.stringify(safeFailure(Error('Bearer private-secret'))),/private-secret/);
  assert.throws(()=>validateRecords([{type:'configuration'},{type:'checkpoint',ledgerEntries:0},{type:'checked',caseId:'P07',code:'STARTED'}]));
  assert.deepEqual(await snapshot(a.stateDir),before);assert.deepEqual(await readFile('evaluation/assistant-mvp/manifest.json'),frozen);assert.equal(actualOutbound,0);
  console.log(`PASS ${count} handoff assertions; synthetic history; real Provider outbound ZERO; semantic quality NOT TESTED`);
}finally{if(manifestBytes)await writeFile(join(repo,'evaluation/assistant-mvp/live-revision.json'),manifestBytes);globalThis.fetch=oldFetch;await rm(root,{recursive:true,force:true});}
