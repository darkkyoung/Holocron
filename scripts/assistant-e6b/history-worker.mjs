// Runs inside exact 36797d0 source. Its official J auditors recurse into each
// older pinned runtime. No current runtime substitution or private DB writes.
import {join} from 'node:path';
import {readdir} from 'node:fs/promises';
import {revision,DIRECTORY} from './scripts/assistant-e5j/revision.mjs';
import {historyReader} from './scripts/assistant-e5j/history.mjs';
import {grantFor,checkpoint,totals} from './scripts/assistant-e5j/state.mjs';
import {list,validateScores} from './scripts/assistant-e5j/review.mjs';
import {readPrivateJson} from './scripts/assistant-mvp/historical-reader.mjs';
import {fail} from './scripts/assistant-eval/budget.mjs';
let reader;
try{
 const [mode,path]=process.argv.slice(2);if(mode!=='audit')fail('INVALID_MODE');
 const loaded=await revision();reader=await historyReader();const history=await reader.read(path),a=await readPrivateJson(path),directory=join(a.value.stateDir,DIRECTORY),x={loaded,reader,history,approval:a.value,directory};
 if(a.hash!==history.e3.approvalFileHash||history.attempts!==9||history.reservedMicros!==244800||history.usageEstimateMicros!==32355||history.unknownUsageAttempts!==0)fail('HISTORY_MISMATCH');
 async function inspect(){
  const approval=await readPrivateJson(join(directory,'authorization.json')),g=await grantFor(x),{journal,local}=await checkpoint(x,g),t=totals(journal.records);
  if(journal.records.length!==6||t.attempts!==1||t.reservedMicros!==33600||t.knownUsageEstimateMicros!==3472||t.unknownUsageAttempts||local.admissions.length!==1||local.walletCount!==1||local.ledger.ledgerEntries!==2||local.unsettled)fail('E5J_HISTORY_MISMATCH');
  const r=journal.records.find(r=>r.type==='reserve'),f=journal.records.find(r=>r.type==='finish'),ad=local.admissions[0],debit=local.entries.find(e=>e.id===ad.debit_entry_id),fund=local.entries.filter(e=>e.operation==='credit');
  if(r.caseId!=='P44'||r.micros!==33600||f.attemptId!==r.attemptId||f.code!=='OK'||f.charged!==7||f.actualMicros!==3472||f.refund!==null||ad.action!=='planner'||ad.state!=='completed'||ad.actual_cost_micros!==3472||ad.reserved_cost_micros!==33600)fail('E5J_SETTLEMENT_MISMATCH');
  if(!debit||debit.operation!=='debit'||debit.kind!=='ai_spend'||debit.wallet_id!==ad.principal_id||debit.reference_id!==ad.request_id||debit.requested_amount!==-7||debit.applied_amount!==-7||fund.length!==1||fund[0].wallet_id!==ad.principal_id||fund[0].applied_amount!==100||local.entries.some(e=>e.operation==='refund'))fail('E5J_LEDGER_MISMATCH');
  const rows=await list(directory,g),p=rows[0];if(rows.length!==1||p.caseId!=='E5J-P44'||p.exists||p.storage!=='STORED'||p.deletion!=='REVIEWED'||p.semanticReview!=='OWNER_PASS')fail('E5J_REVIEW_MISMATCH');
  const receipts={};for(const event of ['stored','reviewed','deleted']){const r=await readPrivateJson(join(directory,'review','E5J-P44.'+event+'.json'));if(r.value.event!==event||r.value.caseId!=='E5J-P44'||r.value.revisionHash!==g.revisionHash)fail('E5J_REVIEW_MISMATCH');receipts[event]=r;}
  const s=receipts.stored.value,v=receipts.reviewed.value,d=receipts.deleted.value;
  if(!/^[a-f0-9]{64}$/.test(s.bodyHash)||!Number.isSafeInteger(s.bytes)||s.bytes<=0||s.bytes>60000||v.bodyHash!==s.bodyHash||v.reviewer!=='owner'||validateScores('E5J-P44',{scores:v.scores,critical:v.critical})!=='OWNER_PASS'||!Number.isFinite(Date.parse(v.at))||!Number.isFinite(Date.parse(d.at))||Date.parse(v.at)<Date.parse(s.createdAt)||Date.parse(v.at)>=Date.parse(s.expiresAt)||Date.parse(d.at)<Date.parse(v.at))fail('E5J_REVIEW_MISMATCH');
  if((await readdir(join(directory,'review'))).sort().join()!==['E5J-P44.deleted.json','E5J-P44.reviewed.json','E5J-P44.stored.json'].join())fail('HISTORICAL_REVIEW_UNEXPECTED');
  return {approvalFileHash:approval.hash,journalTip:journal.tip,localDigest:local.digest,expiresAt:g.expiresAt,attempts:1,reservedMicros:33600,usageEstimateMicros:3472,ledgerEntries:2,p44:{program:'OK',settlement:'completed',charged:7,semanticReview:'OWNER_PASS',deletion:'REVIEWED',bodyExists:false},receiptHashes:Object.fromEntries(Object.entries(receipts).map(([k,v])=>[k,v.hash]))};
 }
 const first=await inspect();if(JSON.stringify(await reader.read(path,'recheck'))!==JSON.stringify(history)||JSON.stringify(await inspect())!==JSON.stringify(first))fail('HISTORY_CHANGED');
 console.log(JSON.stringify({...history,e5j:first,attempts:10,reservedMicros:278400,usageEstimateMicros:35827,unknownUsageAttempts:0}));
}catch{console.log(JSON.stringify({error:'HISTORY_AUDIT_FAILED'}));process.exitCode=1;}finally{await reader?.close();}
