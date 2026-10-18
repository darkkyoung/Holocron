import strict from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,appendFile,rename,readdir,stat,mkdir,utimes} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {loadCorpus} from './assistant-eval/corpus.mjs';
import {openBudget,readBudget,MODEL,PROFILE} from './assistant-eval/budget.mjs';
import {localRuntime,audit} from './assistant-eval/local-runtime.mjs';
import {evaluationFailureReport} from './assistant-eval/receipt-diagnostic.mjs';
import {evaluateCase} from './assistant-eval/evaluate.mjs';
import {mockResponse} from './assistant-eval/transport.mjs';
import {inspectRevision,applyRevision,openDiagnostic,assertReviewedHashes,FROM,TO} from './assistant-eval/revision.mjs';
import {diagnosticP07,revisionOptions,revisionCommand} from './assistant-eval/revision-cli.mjs';
import {run} from './assistant-eval/run.mjs';
let count=0;const assert=new Proxy(strict,{apply(t,s,a){count++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{count++;return t[k](...a);}:t[k];}});
const root=await mkdtemp(join(tmpdir(),'holocron-revision-test-')),loaded=await loadCorpus(),{corpus,cases,hashes}=loaded;
const realFetch=globalThis.fetch;let outbound=0;globalThis.fetch=()=>{outbound++;throw new Error('REAL_OUTBOUND_FORBIDDEN');};
const secret='SYNTHETIC_PRIVATE_MARKER',environment={HOLOCRON_EVAL_OPENAI_API_KEY:'synthetic-not-real'};
let sequence=0;
async function baseline(){
  const baselineIndex=++sequence,directory=join(root,'state-'+baselineIndex),path=directory+'-approval.json';
  const approval={approvalId:'eval-r1-synthetic',model:MODEL,profile:PROFILE,maxCalls:40,maxMicros:2000000,...hashes,pipelineHash:FROM,expiresAt:new Date(Date.now()+3600000).toISOString(),stateDir:directory,retainValidatedOutputsHours:24};
  await writeFile(path,JSON.stringify(approval,null,2),{mode:0o600});
  const b=await openBudget(directory,approval),runtime=await localRuntime({directory});
  try{
    for(const [id,input,output] of [['P01',974,223],['P05',1345,801],['P07',1581,1233]]){
      let r;try{r=await evaluateCase(runtime,corpus,cases.find(c=>c.id===id),{budget:b,mockFetch:async body=>{
        const response=await mockResponse(body).json();response.usage={input_tokens:input,output_tokens:output};
        if(id==='P07')response.output[0].content[0].text='{'+secret;
        return Response.json(response);
      }});}catch(error){console.error(JSON.stringify({baselineIndex,caseId:id,...evaluationFailureReport(error)}));throw error;}
      assert.equal(r.code,id==='P07'?'INVALID_OUTPUT':'OK');assert.equal(r.realOutbound,0);
    }
    assert.deepEqual(b.totals(),{attempts:3,reservedMicros:86400});assert.equal((await audit(runtime,corpus.capturedAt)).ledgerEntries,7);
  }finally{await runtime.close();await b.close();}
  return {directory,path,approval,before:await readFile(join(directory,'budget.jsonl'),'utf8'),approvalBytes:await readFile(path,'utf8')};
}
const totals={attempts:3,reservedMicros:86400};
try{
  assert.equal(hashes.pipelineHash,TO);assert.throws(()=>assertReviewedHashes({...hashes,pipelineHash:FROM}),/UNREVIEWED_REVISION/);assert.throws(()=>assertReviewedHashes({...hashes,casesHash:'changed'}),/UNREVIEWED_REVISION/);
  for(const args of [[],['p07'],['p07','--approval','a'],['inspect','--approval','a','--live'],['apply','--approval','a','--plan-token','a'],['p07','--approval','a','--live','--repeat'],['p07','--approval','a','--live','--case','P01'],['p07','--approval','a','--live','--stage','rest']])assert.throws(()=>revisionOptions(args));
  assert.equal(revisionOptions(['inspect','--approval','a']).action,'inspect');
  const state=await baseline(),{directory,path,approval,before}=state;
  await mkdir(join(directory,'review'),{mode:0o700});
  const oldOutput=join(directory,'review','P01-1.json');
  const snapshot=await inspectRevision(path);assert.equal(snapshot.report.status,'TRANSITION_READY');assert.deepEqual(await revisionCommand(['inspect','--approval',path]),snapshot.report);assert.deepEqual(snapshot.report.totals,totals);assert.equal(snapshot.report.ledgerEntries,7);
  assert.equal(await readFile(join(directory,'budget.jsonl'),'utf8'),before);assert.equal(await readFile(path,'utf8'),state.approvalBytes);
  assert.equal((await inspectRevision(path)).local.digest,snapshot.local.digest);assert.equal((await readdir(directory)).includes('budget.lock'),false);
  // Old approval cannot run the candidate even when a key is present; no implicit transition.
  await assert.rejects(()=>run(['--live','--approval',path],environment),/INVALID_APPROVAL/);
  await assert.rejects(()=>openDiagnostic(path),/REVISION_AUTHORIZATION_MISSING/);
  await writeFile(path,JSON.stringify({...approval,pipelineHash:TO}),{mode:0o600});
  await assert.rejects(()=>run(['--live','--approval',path],environment),/BUDGET_CONFIGURATION_CONFLICT/);
  await assert.rejects(()=>inspectRevision(path),/INVALID_APPROVAL/);
  await writeFile(path,state.approvalBytes);
  for(const patch of [{maxCalls:39},{maxMicros:1900000},{expiresAt:new Date(Date.now()+7200000).toISOString()},{model:'other'},{profile:'other'},{casesHash:'0'.repeat(64)},{rubricHash:'0'.repeat(64)},{corpusHash:'0'.repeat(64)}]){
    await writeFile(path,JSON.stringify({...approval,...patch}));await assert.rejects(()=>inspectRevision(path));
  }
  await writeFile(path,state.approvalBytes);
  await writeFile(oldOutput,'{"synthetic":"validated-envelope-placeholder"}',{mode:0o600});await utimes(oldOutput,new Date(0),new Date(0));
  await assert.rejects(()=>applyRevision(path,'0'.repeat(64)),/PLAN_CHANGED/);
  const raced=await Promise.allSettled([applyRevision(path,snapshot.report.planToken),applyRevision(path,snapshot.report.planToken)]);
  assert(raced.some(r=>r.status==='fulfilled'));assert(raced.every(r=>r.status==='fulfilled'||r.reason.message==='EVALUATION_LOCKED'));
  const applied=await inspectRevision(path);assert.equal(applied.report.status,'REVISION_APPLIED');assert.deepEqual(applied.report.totals,totals);
  assert.equal((await stat(oldOutput)).mtimeMs,0);
  const after=await readFile(join(directory,'budget.jsonl'),'utf8');assert(after.startsWith(before));assert.equal(after.slice(before.length).trim().split('\n').length,1);
  assert.equal(await readFile(path,'utf8'),state.approvalBytes);assert.equal(applied.local.digest,snapshot.local.digest);
  assert.equal((await revisionCommand(['apply','--approval',path,'--plan-token',snapshot.report.planToken,'--confirm'])).status,'REVISION_ALREADY_APPLIED');assert.equal(await readFile(join(directory,'budget.jsonl'),'utf8'),after);
  // Original generic coordinator may not dispatch under a diagnostic grant.
  const generic=await openBudget(directory,approval);await assert.rejects(()=>generic.reserve('P07',33600),/REVISION_SCOPE_REQUIRED/);await generic.close();
  const active=await openDiagnostic(path);await assert.rejects(()=>inspectRevision(path),/EVALUATION_LOCKED/);await assert.rejects(()=>active.budget.reserve('P01',33600),/DIAGNOSTIC_CASE_ONLY/);assert.deepEqual(active.budget.totals(),totals);await active.budget.close();
  // Actual production generation + Miniflare, content-free rejection and full refund.
  let sends=0;
  const transport=async(url,init)=>{sends++;const response=await mockResponse(JSON.parse(init.body)).json(),value=JSON.parse(response.output[0].content[0].text);value.draft[0].text+=' ';response.output[0].content[0].text=JSON.stringify(value);return Response.json(response);};
  const executions=await Promise.allSettled([diagnosticP07(path,{environment,transport}),diagnosticP07(path,{environment,transport})]);
  assert.equal(executions.filter(r=>r.status==='fulfilled').length,1);assert(executions.filter(r=>r.status==='rejected').every(r=>['EVALUATION_LOCKED','DIAGNOSTIC_ATTEMPT_CONSUMED'].includes(r.reason.message)));
  const result=executions.find(r=>r.status==='fulfilled').value;
  await assert.rejects(()=>stat(oldOutput),{code:'ENOENT'}); // Existing purge removes expired bodies only, not budget/D1.

  assert.equal(sends,1);assert.deepEqual(result.totals,{attempts:4,reservedMicros:120000});assert.equal(result.result.code,'INVALID_OUTPUT');assert.equal(result.outputDiagnostic.reason,'DRAFT_FACT_TEXT');assert.deepEqual(result.result.refund,{requested:15,applied:15,forfeited:0,full:true});assert.equal(result.ledger.ledgerEntries,10);
  assert.equal(result.next,'STOP_NO_REST_OR_RETRY');assert.doesNotMatch(JSON.stringify(result),/synthetic-not-real|SYNTHETIC_PRIVATE_MARKER|Bearer|__Host/);
  const inspected=await inspectRevision(path);assert.equal(inspected.report.stop,'DIAGNOSTIC_ATTEMPT_CONSUMED');assert.equal(inspected.report.additionalAttemptsRemaining,0);
  assert.equal((await applyRevision(path,snapshot.report.planToken)).status,'REVISION_ALREADY_APPLIED');
  await assert.rejects(()=>diagnosticP07(path,{environment,transport:()=>{sends++;}}),/DIAGNOSTIC_ATTEMPT_CONSUMED/);assert.equal(sends,1);await assert.rejects(()=>revisionCommand(['p07','--approval',path,'--live']),/DIAGNOSTIC_ATTEMPT_CONSUMED/);
  assert((await readFile(join(directory,'budget.jsonl'),'utf8')).startsWith(before));assert.equal(await readFile(path,'utf8'),state.approvalBytes);
  const originalLedger=JSON.stringify(snapshot.local.entries);assert.equal(JSON.stringify(inspected.local.entries.filter(e=>snapshot.local.entries.some(old=>old.id===e.id))),originalLedger);
  // Tool edits and chain corruption are detected without rewriting existing state.
  const tool='scripts/assistant-eval/transport.mjs',toolBytes=await readFile(tool,'utf8');
  try{await appendFile(tool,'\n// synthetic unreviewed edit\n');await assert.rejects(()=>inspectRevision(path),/UNREVIEWED_TOOL_REVISION/);}finally{await writeFile(tool,toolBytes);}
  const bytes=await readFile(join(directory,'budget.jsonl'),'utf8');
  try{await writeFile(join(directory,'budget.jsonl'),bytes.replace('86400','86401').replace('19200','19201'));await assert.rejects(()=>inspectRevision(path),/INVALID_BUDGET_JOURNAL/);}finally{await writeFile(join(directory,'budget.jsonl'),bytes);}
  // Interrupted append cannot be silently repaired or initialized.
  const corrupt=await baseline();await appendFile(join(corrupt.directory,'budget.jsonl'),'partial');const broken=await readFile(join(corrupt.directory,'budget.jsonl'),'utf8');
  await assert.rejects(()=>inspectRevision(corrupt.path),/INCOMPLETE_BUDGET_JOURNAL/);assert.equal(await readFile(join(corrupt.directory,'budget.jsonl'),'utf8'),broken);
  // Missing and corrupt D1/journal never initialize a replacement.
  const missing=await baseline();await rename(join(missing.directory,'budget.jsonl'),join(missing.directory,'saved.jsonl'));await assert.rejects(()=>inspectRevision(missing.path));assert.equal((await readdir(missing.directory)).includes('budget.jsonl'),false);
  await rename(join(missing.directory,'saved.jsonl'),join(missing.directory,'budget.jsonl'));
  await rename(join(missing.directory,'local-d1'),join(missing.directory,'saved-d1'));await assert.rejects(()=>inspectRevision(missing.path));assert.equal((await readdir(missing.directory)).includes('local-d1'),false);
  await rename(join(missing.directory,'saved-d1'),join(missing.directory,'local-d1'));
  const sqlite=(await readdir(join(missing.directory,'local-d1'),{recursive:true})).find(n=>n.endsWith('.sqlite')&&!n.endsWith('metadata.sqlite'));await rm(join(missing.directory,'local-d1',sqlite+'-wal'),{force:true});await rm(join(missing.directory,'local-d1',sqlite+'-shm'),{force:true});await writeFile(join(missing.directory,'local-d1',sqlite),'invalid');await assert.rejects(()=>inspectRevision(missing.path));
  // Expiry is tested against the original bound timestamp, never re-bound/extended.
  const expired=await baseline();const ep=await inspectRevision(expired.path);await applyRevision(expired.path,ep.report.planToken);const realNow=Date.now;Date.now=()=>Date.parse(expired.approval.expiresAt)+1;
  try{const p=await inspectRevision(expired.path);assert.equal(p.report.stop,'APPROVAL_EXPIRED');await assert.rejects(()=>applyRevision(expired.path,p.report.planToken),/APPROVAL_EXPIRED/);await assert.rejects(()=>diagnosticP07(expired.path,{environment,transport:()=>{outbound++;}}),/APPROVAL_EXPIRED/);assert.deepEqual(p.report.totals,totals);}finally{Date.now=realNow;}
  // Network failure consumes the additional reservation despite the full Credit refund.
  const failed=await baseline(),fp=await inspectRevision(failed.path);await applyRevision(failed.path,fp.report.planToken);
  const fr=await diagnosticP07(failed.path,{environment,transport:()=>{throw new Error(secret);}});assert.equal(fr.result.code,'PROVIDER_UNAVAILABLE');assert.equal(fr.result.refund.applied,15);assert.equal(fr.totals.attempts,4);await assert.rejects(()=>openDiagnostic(failed.path),/DIAGNOSTIC_ATTEMPT_CONSUMED/);
  // Refund failure is not discarded: the call stays consumed and D1 obligation remains visible.
  const pending=await baseline(),pp=await inspectRevision(pending.path);await applyRevision(pending.path,pp.report.planToken);
  const pendingContext=await openDiagnostic(pending.path),pendingRuntime=await localRuntime({directory:pending.directory,requireExisting:true});let pr;
  try{
    await pendingRuntime.db.prepare("CREATE TRIGGER eval_refund_stop BEFORE INSERT ON credit_ledger WHEN NEW.operation='refund' BEGIN SELECT RAISE(IGNORE); END").run();
    pr=await evaluateCase(pendingRuntime,corpus,cases.find(c=>c.id==='P07'),{budget:pendingContext.budget,mockFetch:()=>new Response('',{status:503})});
    assert.equal(pendingContext.budget.totals().attempts,4);
  }finally{await pendingRuntime.close();await pendingContext.budget.close();}
  assert.equal(pr.refund,null);assert.equal(pr.settlement,'refund_pending');
  assert.equal((await inspectRevision(pending.path)).report.unsettled,1);await assert.rejects(()=>openDiagnostic(pending.path),/DIAGNOSTIC_ATTEMPT_CONSUMED/);
  // Lost response/process after durable reservation: no finish exists, no extra call.
  const lost=await baseline(),lp=await inspectRevision(lost.path);await applyRevision(lost.path,lp.report.planToken);
  const lb=await openDiagnostic(lost.path);await lb.budget.reserve('P07',33600);await lb.budget.close();assert.equal((await inspectRevision(lost.path)).report.stop,'DIAGNOSTIC_ATTEMPT_CONSUMED');await assert.rejects(()=>openDiagnostic(lost.path),/DIAGNOSTIC_ATTEMPT_CONSUMED/);
  // Valid synthetic replacement is retained only by the existing 24h envelope policy, no continuation.
  const good=await baseline(),gp=await inspectRevision(good.path);await applyRevision(good.path,gp.report.planToken);
  const gr=await diagnosticP07(good.path,{environment,transport:async(url,init)=>mockResponse(JSON.parse(init.body))});assert.equal(gr.result.code,'OK');assert.equal(gr.result.refund,null);assert.equal(gr.status,'STOP_REVIEW_DIAGNOSTIC_RESULT');assert.equal(gr.ledger.ledgerEntries,9);
  const reviews=await readdir(join(good.directory,'review'));assert.equal(reviews.length,1);const file=join(good.directory,'review',reviews[0]),body=JSON.parse(await readFile(file,'utf8'));assert.equal(body.pipelineHash,TO);assert(Date.parse(body.expiresAt)-(await stat(file)).mtimeMs<=86400000);await rm(file);assert.deepEqual(await readdir(join(good.directory,'review')),[]);
  const journal=await readBudget(good.directory,good.approval);assert.equal(journal.records.filter(r=>r.type==='reserve').length,4);assert.doesNotMatch(JSON.stringify(journal),/synthetic-not-real|SYNTHETIC_PRIVATE_MARKER|Bearer|summary|instructions|output_text/);
  assert.equal(outbound,0);
  console.log(`Assistant evaluation revision: ${count} assertions PASS; real local D1, immutable original approval/history, 3/86400 -> 4/120000, one diagnostic attempt, safe rejection/refund and ZERO real outbound. Synthetic history is not the user's PC evidence.`);
}finally{globalThis.fetch=realFetch;await rm(root,{recursive:true,force:true});}
