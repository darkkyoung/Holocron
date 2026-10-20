// Runs in pinned 1512d95 E.5F, never current E.5G. No Worker/private D1 writes.
import {join} from 'node:path';
import {lstat} from 'node:fs/promises';
import {revision,DIRECTORY} from './scripts/assistant-e5f/revision.mjs';
import {historyReader} from './scripts/assistant-e5f/history.mjs';
import {grantFor,checkpoint,totals} from './scripts/assistant-e5f/state.mjs';
import {list,reviewedComplete,validateScores} from './scripts/assistant-e5f/review.mjs';
import {readPrivateJson} from './scripts/assistant-mvp/historical-reader.mjs';
import {fail} from './scripts/assistant-eval/budget.mjs';
let reader;
try{
 const [mode,path]=process.argv.slice(2);if(!['audit','recheck'].includes(mode))fail('INVALID_MODE');
 const loaded=await revision();reader=await historyReader();
 const history=await reader.read(path,mode),a=await readPrivateJson(path),directory=join(a.value.stateDir,DIRECTORY),x={loaded,reader,history,approval:a.value,directory};
 if(a.hash!==history.e3.approvalFileHash||history.attempts!==6||history.reservedMicros!==158400||history.usageEstimateMicros!==21489||history.unknownUsageAttempts!==0)fail('HISTORY_MISMATCH');
 async function inspect(){
  const approval=await readPrivateJson(join(directory,'authorization.json')),g=await grantFor(x),{journal,local}=await checkpoint(x,g),t=totals(journal.records);
  const reserves=journal.records.filter(r=>r.type==='reserve'),finishes=journal.records.filter(r=>r.type==='finish');
  if(journal.records.length!==10||t.attempts!==2||t.reservedMicros!==52800||t.knownUsageEstimateMicros!==6450||t.unknownUsageAttempts||local.admissions.length!==2||local.walletCount!==2||local.ledger.ledgerEntries!==5||local.unsettled)fail('E5F_HISTORY_MISMATCH');
  for(const [i,action,cost,charged,state] of [[0,'qa',2284,5,'completed'],[1,'planner',4166,7,'failed']]){
   const r=reserves[i],f=finishes[i],ad=local.admissions.find(a=>a.action===action),debit=local.entries.find(e=>e.id===ad?.debit_entry_id),fund=local.entries.filter(e=>e.wallet_id===ad?.principal_id&&e.operation==='credit'),refund=local.entries.filter(e=>e.wallet_id===ad?.principal_id&&e.operation==='refund');
   if(r.caseId!==(i?'P44':'P41')||r.micros!==(i?33600:19200)||f.attemptId!==r.attemptId||f.code!==(i?'INVALID_OUTPUT':'OK')||f.charged!==charged||f.actualMicros!==cost||!ad||ad.state!==state||ad.actual_cost_micros!==cost||ad.reserved_cost_micros!==r.micros)fail('E5F_SETTLEMENT_MISMATCH');
   if(!debit||debit.operation!=='debit'||debit.kind!=='ai_spend'||debit.wallet_id!==ad.principal_id||debit.reference_id!==ad.request_id||debit.requested_amount!==-charged||debit.applied_amount!==-charged||fund.length!==1||fund[0].applied_amount!==100)fail('E5F_LEDGER_MISMATCH');
   if(i){const z=refund[0];if(refund.length!==1||!z||z.kind!=='refund'||z.reference_id!==ad.request_id||z.original_entry_id!==ad.debit_entry_id||z.idempotency_key!=='assistant:refund:'+ad.request_id||z.requested_amount!==7||z.applied_amount!==7||JSON.stringify(f.refund)!==JSON.stringify({requested:7,applied:7,forfeited:0,full:true}))fail('E5F_REFUND_MISMATCH');}
   else if(f.refund!==null||refund.length)fail('E5F_REFUND_MISMATCH');
  }
  const review=await list(directory,g),p=review[0],q=review[1];
  await reviewedComplete(directory,g,'E5F-P41');
  if(p.caseId!=='E5F-P41'||p.storage!=='STORED'||p.exists||p.deletion!=='REVIEWED'||p.semanticReview!=='OWNER_PASS'||q.exists||q.storage!=='NOT_STORED'||q.deletion!=='NOT_RECORDED'||q.semanticReview!=='NOT_REVIEWED')fail('E5F_REVIEW_MISMATCH');
  const receipts={};for(const event of ['stored','reviewed','deleted'])receipts[event]=await readPrivateJson(join(directory,'review','E5F-P41.'+event+'.json'));
  const s=receipts.stored.value,v=receipts.reviewed.value,z=receipts.deleted.value;
  for(const [event,r] of Object.entries(receipts))if(r.value.caseId!=='E5F-P41'||r.value.event!==event||r.value.revisionHash!==g.revisionHash)fail('E5F_REVIEW_MISMATCH');
  if(!/^[a-f0-9]{64}$/.test(s.bodyHash)||!Number.isSafeInteger(s.bytes)||s.bytes<=0||s.bytes>60000||v.bodyHash!==s.bodyHash||v.reviewer!=='owner'||validateScores('E5F-P41',{scores:v.scores,critical:v.critical})!=='OWNER_PASS'||!Number.isFinite(Date.parse(v.at))||!Number.isFinite(Date.parse(z.at))||Date.parse(v.at)<Date.parse(s.createdAt)||Date.parse(v.at)>=Date.parse(s.expiresAt)||Date.parse(z.at)<Date.parse(v.at))fail('E5F_REVIEW_MISMATCH');
  for(const name of ['E5F-P41.body.json','E5F-P44.body.json'])try{await lstat(join(directory,'review',name));fail('HISTORICAL_BODY_UNEXPECTED');}catch(e){if(e.code!=='ENOENT')throw e;}
  return {approvalFileHash:approval.hash,journalTip:journal.tip,localDigest:local.digest,expiresAt:g.expiresAt,attempts:2,reservedMicros:52800,usageEstimateMicros:6450,ledgerEntries:5,p41:{program:'OK',semanticReview:'OWNER_PASS',deletion:'REVIEWED',bodyExists:false},p44:{program:'INVALID_OUTPUT',settlement:'failed',refund:7,bodyExists:false,semanticReview:'NOT_REVIEWED',diagnostic:'NOT_PERSISTED_IN_JOURNAL'},receiptHashes:Object.fromEntries(Object.entries(receipts).map(([k,v])=>[k,v.hash]))};
 }
 const first=await inspect();if(JSON.stringify(await reader.read(path,'recheck'))!==JSON.stringify(history)||JSON.stringify(await inspect())!==JSON.stringify(first))fail('HISTORY_CHANGED');
 console.log(JSON.stringify({...history,e5f:first,attempts:8,reservedMicros:211200,usageEstimateMicros:27939,unknownUsageAttempts:0}));
}catch{console.log(JSON.stringify({error:'HISTORY_AUDIT_FAILED'}));process.exitCode=1;}
finally{await reader?.close();}
