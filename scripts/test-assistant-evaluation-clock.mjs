import strict from 'node:assert/strict';
import {evaluationClock} from './assistant-eval/clock.mjs';
import {EvaluationEvidenceError,evidenceFailure,evaluationFailureReport} from './assistant-eval/receipt-diagnostic.mjs';
import {localRuntime,audit,secrets,request} from './assistant-eval/local-runtime.mjs';
import {loadCorpus} from './assistant-eval/corpus.mjs';
import {evaluateCase} from './assistant-eval/evaluate.mjs';
import {mockResponse} from './assistant-eval/transport.mjs';
let count=0;const assert=new Proxy(strict,{apply(t,s,a){count++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{count++;return t[k](...a);}:t[k];}});
const {corpus,cases}=await loadCorpus(),epoch=Date.parse(corpus.capturedAt);
let ticks=10.25;const clock=evaluationClock(corpus.capturedAt,()=>ticks);
assert.equal(clock.now(),epoch);ticks+=0.5;assert.equal(clock.now(),epoch);ticks+=0.5;assert.equal(clock.now(),epoch+1);
clock.advance(600001);assert.equal(clock.now(),epoch+600002);assert.equal(clock.elapsedMs(),1);
assert.throws(()=>clock.advance(-1),/INVALID_EVALUATION_CLOCK/);ticks=10;assert.throws(()=>clock.now(),/EVALUATION_CLOCK_REGRESSION/);
assert.throws(()=>evaluationClock('invalid'),/INVALID_EVALUATION_CLOCK/);
assert.throws(()=>evaluationClock(corpus.capturedAt,()=>NaN),/INVALID_EVALUATION_CLOCK/);
const realNow=Date.now,realFetch=globalThis.fetch;let outbound=0;
globalThis.fetch=()=>{outbound++;throw Error('NO_REAL_OUTBOUND');};
const runtime=await localRuntime();
try{
  let saved;
  const capture={...runtime,m:name=>name!=='assistant/http'?runtime.m(name):{...runtime.m(name),handleRetrieve:async(req,deps)=>{
    const response=await runtime.m(name).handleRetrieve(req,deps),found=await response.clone().json();
    saved={cookie:response.headers.get('set-cookie').split(';')[0],receipt:found.receipt,issuedAt:Date.parse(found.asOf)};return response;
  }}};
  const prepared=await evaluateCase(capture,corpus,cases.find(c=>c.id==='P01'),{mode:'dry-run',elapsedNow:()=>0});
  assert.equal(prepared.code,'PREPARED');assert.equal(prepared.providerAttempts,0);
  const identity=runtime.m('assistant/identity'),receipts=runtime.m('assistant/receipts');
  saved.binding=(await identity.assistantSession(request('/',{},saved.cookie),secrets.secret,saved.issuedAt)).binding;
  const verify=at=>receipts.verifyReceipt(saved.receipt,saved.binding,secrets.secret,at);
  // Exercise unchanged production checks at exact boundaries; this also proves
  // the legacy Date.now()-start vulnerability without claiming the PC jumped.
  await assert.rejects(()=>verify(saved.issuedAt-1),e=>e.code==='EVIDENCE_CHANGED');
  assert.equal((await verify(saved.issuedAt)).issued,saved.issuedAt);
  assert.equal((await verify(saved.issuedAt+599999)).expires,saved.issuedAt+600000);
  await assert.rejects(()=>verify(saved.issuedAt+600000),e=>e.code==='EVIDENCE_CHANGED');
  await assert.rejects(()=>receipts.verifyReceipt(saved.receipt,'wrong-binding',secrets.secret,saved.issuedAt),e=>e.code==='EVIDENCE_CHANGED');
  for(const [shift,reason] of [[-1,'RECEIPT_NOT_YET_VALID'],[600000,'RECEIPT_EXPIRED']]){
    const diagnostic=evaluationFailureReport(await evidenceFailure(runtime,{...saved,caseId:'P01',verifiedAt:saved.issuedAt+shift}));
    assert.equal(diagnostic.evaluationDiagnostic.reason,reason);assert.equal(diagnostic.evaluationDiagnostic.bindingSame,true);
    assert.equal(diagnostic.evaluationDiagnostic.issuedDeltaMs,shift);assert.equal(diagnostic.code,'EVIDENCE_CHANGED');
  }
  const rotated=await identity.assistantSession(request('/',{},saved.cookie),secrets.secret,saved.issuedAt-1000);
  assert(rotated.setCookie);assert.notEqual(rotated.binding,saved.binding);
  const rotation=await evidenceFailure(runtime,{...saved,caseId:'P01',binding:rotated.binding,verifiedAt:saved.issuedAt-1000});
  assert.equal(rotation.evaluationDiagnostic.reason,'SESSION_BINDING_CHANGED');
  assert.equal((await identity.assistantSession(request('/',{},saved.cookie),secrets.secret,saved.issuedAt+1000)).binding,saved.binding);
  assert((await identity.assistantSession(request('/',{},saved.cookie),secrets.secret,saved.issuedAt+7*86400000)).setCookie);

  // Actual service pipeline/local D1 with wall corrections after issuance.
  // No retry/retrieval replacement; all three supported modes still complete.
  for(const [id,jump] of [['P01',-1],['P05',-1000],['P07',600000]]){
    let wall=realNow(),retrievals=0;Date.now=()=>wall;
    const wrapped={...runtime,m:name=>name!=='assistant/http'?runtime.m(name):{...runtime.m(name),handleRetrieve:async(req,deps)=>{
      retrievals++;const response=await runtime.m(name).handleRetrieve(req,deps);wall+=jump;return response;
    }}};
    try{
      const result=await evaluateCase(wrapped,corpus,cases.find(c=>c.id===id));
      assert.equal(result.code,'OK');assert.equal(result.providerAttempts,1);assert.equal(result.refund,null);assert.equal(result.realOutbound,0);assert.equal(retrievals,1);assert(result.latencyMs>=0);
    }finally{Date.now=realNow;}
  }
  // Monotonic elapsed time is NOT frozen: a real ten-minute elapsed interval
  // still rejects preparation, with bounded diagnostics and no provider call.
  let elapsed=0,sends=0;
  const aged={...runtime,m:name=>name!=='assistant/http'?runtime.m(name):{...runtime.m(name),handleRetrieve:async(req,deps)=>{
    const response=await runtime.m(name).handleRetrieve(req,deps);elapsed=600000;return response;
  }}};
  await assert.rejects(()=>evaluateCase(aged,corpus,cases.find(c=>c.id==='P01'),{elapsedNow:()=>elapsed,mockFetch:()=>{sends++;}}),e=>e instanceof EvaluationEvidenceError&&e.evaluationDiagnostic.reason==='RECEIPT_EXPIRED'&&e.evaluationDiagnostic.expiryRemainingMs===0);
  assert.equal(sends,0);
  const expired=await evaluateCase(runtime,corpus,cases.find(c=>c.scenario==='expired-receipt'),{elapsedNow:()=>0});
  assert.equal(expired.code,'EVIDENCE_CHANGED');assert.equal(expired.providerAttempts,0);assert.equal(expired.charged,0);
  // Service deadline remains active and full compensation is audited locally.
  elapsed=0;
  const timed=await evaluateCase(runtime,corpus,cases.find(c=>c.id==='P01'),{elapsedNow:()=>elapsed,mockFetch:body=>{elapsed=35000;return mockResponse(body);}});
  assert.equal(timed.code,'SERVICE_TIMEOUT');assert.equal(timed.providerAttempts,1);assert.equal(timed.refund.applied,5);assert.equal(timed.refund.full,true);assert.equal(timed.latencyMs,35000);
  const marker='SYNTHETIC_PRIVATE_COOKIE_RESPONSE';
  for(const [patch,reason] of [[{cookie:marker},'SESSION_COOKIE_INVALID_AT_ISSUE'],[{receipt:marker},'RECEIPT_INVALID_AT_ISSUE'],[{},'EVIDENCE_SNAPSHOT_OR_SELECTION']]){
    const report=evaluationFailureReport(await evidenceFailure(runtime,{...saved,...patch,caseId:'P01',verifiedAt:saved.issuedAt}));
    assert.equal(report.evaluationDiagnostic.reason,reason);assert.doesNotMatch(JSON.stringify(report),new RegExp(marker));
  }
  const sanitized=evaluationFailureReport(new EvaluationEvidenceError(marker,{reason:marker,issuedDeltaMs:Infinity,expiryRemainingMs:1e16,bindingSame:marker,receiptValidAtIssue:marker}));
  assert.deepEqual(sanitized,{status:'STOP',code:'EVIDENCE_CHANGED',evaluationDiagnostic:{phase:'selected_evidence_preparation',caseId:'UNKNOWN',reason:'RECEIPT_DIAGNOSTIC_UNAVAILABLE',issuedDeltaMs:null,expiryRemainingMs:null,bindingSame:null,receiptValidAtIssue:false}});
  assert.deepEqual(evaluationFailureReport(new Error('raw response '+marker)),{status:'STOP',code:'EVALUATION_FAILED'});
  assert.equal((await audit(runtime,corpus.capturedAt)).operationalOutbound,0);assert.equal(outbound,0);assert.equal(Date.now,realNow);
  console.log(`Assistant evaluation clock: ${count} assertions PASS; real local D1, wall-jump isolation, exact receipt/session boundaries, expiry/deadline/refund retained, safe diagnostics, ZERO real outbound. Synthetic clock corrections do not prove the user's PC clock changed.`);
}finally{Date.now=realNow;globalThis.fetch=realFetch;await runtime.close();}
