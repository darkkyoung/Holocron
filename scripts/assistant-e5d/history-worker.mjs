// Copied into a pinned E.5B source checkout by history.mjs; read-only inspection.
import {join} from 'node:path';
import {freshAudit,validateGrant,assertCheckpoint,HANDOFF} from './scripts/assistant-mvp/handoff.mjs';
import {historicalReader,readPrivateJson,recheckPrior} from './scripts/assistant-mvp/historical-reader.mjs';
import {loadLiveRevision} from './scripts/assistant-mvp/live-revision.mjs';
import {fail} from './scripts/assistant-eval/budget.mjs';
let x;
try{
 const [mode,path]=process.argv.slice(2);
 if(mode==='audit')x=await freshAudit(path);
 else if(mode==='recheck'){
  const a=await readPrivateJson(path),b=await readPrivateJson(join(a.value.stateDir,HANDOFF,'authorization.json'));
  x={approval:a.value,directory:join(a.value.stateDir,HANDOFF),prior:b.value.prior,loaded:await loadLiveRevision(),reader:await historicalReader()};
 }else fail('INVALID_MODE');
 await recheckPrior(path,x.prior,x.reader);
 const a=await readPrivateJson(join(x.directory,'authorization.json'));
 const g=validateGrant(a.value,x.prior,x.loaded,x.directory),{journal,local}=await assertCheckpoint(x.directory,g,x.loaded);
 const r=journal.records.filter(r=>r.type==='reserve'),f=journal.records.filter(r=>r.type==='finish');
 if(journal.records.length!==10||r.length!==2||f.length!==2||local.admissions.length!==2||local.walletCount!==2||local.ledger.ledgerEntries!==5||local.unsettled)fail('E5B_HISTORY_MISMATCH');
 for(const [i,action,charge,code] of [[0,'qa',5,'OK'],[1,'planner',7,'INVALID_OUTPUT']]){
  const finish=f[i],admissions=local.admissions.filter(a=>a.action===action);
  if(admissions.length!==1)fail('E5B_HISTORY_MISMATCH');
  const admission=admissions[0],rows=local.entries.filter(e=>e.wallet_id===admission.principal_id),d=rows.find(e=>e.id===admission.debit_entry_id),refunds=rows.filter(e=>e.original_entry_id===admission.debit_entry_id);
  if(finish.code!==code||finish.charged!==charge||!Number.isSafeInteger(finish.actualMicros)||finish.actualMicros<0||admission.actual_cost_micros!==finish.actualMicros||admission.reserved_cost_micros!==r[i].micros||admission.state!==(i?'failed':'completed')||rows.length!==(i?3:2)||rows[0].operation!=='credit'||rows[0].applied_amount!==100||!d||d.kind!=='ai_spend'||d.operation!=='debit'||d.reference_id!==admission.request_id||d.requested_amount!==-charge||d.applied_amount!==-charge)fail('E5B_LEDGER_MISMATCH');
  if(i?refunds.length!==1||refunds[0].kind!=='refund'||refunds[0].operation!=='refund'||refunds[0].requested_amount!==7||refunds[0].applied_amount!==7||JSON.stringify(finish.refund)!==JSON.stringify({requested:7,applied:7,forfeited:0,full:true}):refunds.length!==0||finish.refund!==null)fail('E5B_REFUND_MISMATCH');
 }
 if(f.reduce((n,f)=>n+f.actualMicros,0)!==6315)fail('E5B_COST_MISMATCH');
 const report={e3:x.prior,e5b:{approvalFileHash:a.hash,journalTip:journal.tip,localDigest:local.digest,expiresAt:g.expiresAt,attempts:2,reservedMicros:52800,usageEstimateMicros:6315,ledgerEntries:5},attempts:5,reservedMicros:139200,usageEstimateMicros:19398,unknownUsageAttempts:0};
 await recheckPrior(path,x.prior,x.reader);
 const again=await readPrivateJson(join(x.directory,'authorization.json')),check=await assertCheckpoint(x.directory,g,x.loaded);
 if(again.hash!==a.hash||check.journal.tip!==journal.tip||check.local.digest!==local.digest)fail('HISTORY_CHANGED');
 console.log(JSON.stringify(report));
}catch{console.log(JSON.stringify({error:'HISTORY_AUDIT_FAILED'}));process.exitCode=1;}
finally{await x?.reader.close();}
