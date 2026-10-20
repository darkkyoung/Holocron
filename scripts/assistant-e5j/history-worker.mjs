// Executed inside exact 6fc7ac7 E.5H source. Read-only original auditors recurse
// through E.5F/E.5D/E.5B/E.3.2. No current-runtime substitution or raw recovery.
import {join} from 'node:path';
import {readdir} from 'node:fs/promises';
import {revision,DIRECTORY} from './scripts/assistant-e5h/revision.mjs';
import {historyReader} from './scripts/assistant-e5h/history.mjs';
import {grantFor,checkpoint,totals} from './scripts/assistant-e5h/state.mjs';
import {list} from './scripts/assistant-e5h/review.mjs';
import {readPrivateJson} from './scripts/assistant-mvp/historical-reader.mjs';
import {fail} from './scripts/assistant-eval/budget.mjs';
let reader;
try{
 const [mode,path]=process.argv.slice(2);if(!['audit','recheck'].includes(mode))fail('INVALID_MODE');
 const loaded=await revision();reader=await historyReader();
 const history=await reader.read(path,mode),a=await readPrivateJson(path),directory=join(a.value.stateDir,DIRECTORY),x={loaded,reader,history,approval:a.value,directory};
 if(a.hash!==history.e3.approvalFileHash||history.attempts!==8||history.reservedMicros!==211200||history.usageEstimateMicros!==27939||history.unknownUsageAttempts!==0)fail('HISTORY_MISMATCH');
 async function inspect(){
  const approval=await readPrivateJson(join(directory,'authorization.json')),g=await grantFor(x),{journal,local}=await checkpoint(x,g),t=totals(journal.records);
  if(journal.records.length!==6||t.attempts!==1||t.reservedMicros!==33600||t.knownUsageEstimateMicros!==4416||t.unknownUsageAttempts||local.admissions.length!==1||local.walletCount!==1||local.ledger.ledgerEntries!==3||local.unsettled)fail('E5H_HISTORY_MISMATCH');
  const r=journal.records.find(r=>r.type==='reserve'),f=journal.records.find(r=>r.type==='finish'),ad=local.admissions[0];
  if(r.caseId!=='P44'||r.micros!==33600||f.attemptId!==r.attemptId||f.code!=='INVALID_OUTPUT'||f.charged!==7||f.actualMicros!==4416||ad.action!=='planner'||ad.state!=='failed'||ad.actual_cost_micros!==4416||ad.reserved_cost_micros!==33600)fail('E5H_SETTLEMENT_MISMATCH');
  const debit=local.entries.find(e=>e.id===ad.debit_entry_id),fund=local.entries.filter(e=>e.operation==='credit'),refund=local.entries.filter(e=>e.operation==='refund'),z=refund[0];
  if(!debit||debit.operation!=='debit'||debit.kind!=='ai_spend'||debit.wallet_id!==ad.principal_id||debit.reference_id!==ad.request_id||debit.requested_amount!==-7||debit.applied_amount!==-7||fund.length!==1||fund[0].wallet_id!==ad.principal_id||fund[0].applied_amount!==100)fail('E5H_LEDGER_MISMATCH');
  if(refund.length!==1||z.kind!=='refund'||z.wallet_id!==ad.principal_id||z.reference_id!==ad.request_id||z.original_entry_id!==ad.debit_entry_id||z.idempotency_key!=='assistant:refund:'+ad.request_id||z.requested_amount!==7||z.applied_amount!==7||JSON.stringify(f.refund)!==JSON.stringify({requested:7,applied:7,forfeited:0,full:true}))fail('E5H_REFUND_MISMATCH');
  const rows=await list(directory,g),p=rows[0];
  if(rows.length!==1||p.caseId!=='E5H-P44'||p.exists||p.storage!=='NOT_STORED'||p.deletion!=='NOT_RECORDED'||p.semanticReview!=='NOT_REVIEWED')fail('E5H_REVIEW_MISMATCH');
  // Reject even empty/foreign review receipts, rather than reconstructing evidence.
  try{if((await readdir(join(directory,'review'))).length)fail('HISTORICAL_REVIEW_UNEXPECTED');}catch(e){if(e.code!=='ENOENT')throw e;}
  return {approvalFileHash:approval.hash,journalTip:journal.tip,localDigest:local.digest,expiresAt:g.expiresAt,attempts:1,reservedMicros:33600,usageEstimateMicros:4416,ledgerEntries:3,p44:{program:'INVALID_OUTPUT',settlement:'failed',refund:7,bodyExists:false,semanticReview:'NOT_REVIEWED',diagnostic:'NOT_PERSISTED_IN_JOURNAL'}};
 }
 const first=await inspect();if(JSON.stringify(await reader.read(path,'recheck'))!==JSON.stringify(history)||JSON.stringify(await inspect())!==JSON.stringify(first))fail('HISTORY_CHANGED');
 console.log(JSON.stringify({...history,e5h:first,attempts:9,reservedMicros:244800,usageEstimateMicros:32355,unknownUsageAttempts:0}));
}catch{console.log(JSON.stringify({error:'HISTORY_AUDIT_FAILED'}));process.exitCode=1;}
finally{await reader?.close();}
