// Runs only inside the pinned 2363363 E.5D checkout. No worker/DB writes or body recovery.
import {join} from 'node:path';
import {lstat} from 'node:fs/promises';
import {revision,DIRECTORY} from './scripts/assistant-e5d/revision.mjs';
import {historyReader} from './scripts/assistant-e5d/history.mjs';
import {grantFor,checkpoint} from './scripts/assistant-e5d/state.mjs';
import {list,validateScores} from './scripts/assistant-e5d/review.mjs';
import {readPrivateJson} from './scripts/assistant-mvp/historical-reader.mjs';
import {fail} from './scripts/assistant-eval/budget.mjs';
let reader;
try{
 const [mode,path]=process.argv.slice(2);if(!['audit','recheck'].includes(mode))fail('INVALID_MODE');
 const loaded=await revision();reader=await historyReader();
 const history=await reader.read(path,mode),a=await readPrivateJson(path),directory=join(a.value.stateDir,DIRECTORY),x={loaded,reader,history,approval:a.value,directory};
 if(a.hash!==history.e3.approvalFileHash||history.attempts!==5||history.reservedMicros!==139200||history.usageEstimateMicros!==19398||history.unknownUsageAttempts!==0)fail('HISTORY_MISMATCH');
 async function inspect(){
  const approval=await readPrivateJson(join(directory,'authorization.json')),g=await grantFor(x),{journal,local}=await checkpoint(x,g);
  const reserves=journal.records.filter(r=>r.type==='reserve'),finishes=journal.records.filter(r=>r.type==='finish'),r=reserves[0],f=finishes[0],ad=local.admissions[0];
  if(journal.records.length!==6||reserves.length!==1||finishes.length!==1||r.caseId!=='P41'||r.micros!==19200||f.code!=='OK'||f.charged!==5||f.refund!==null||f.actualMicros!==2091||local.admissions.length!==1||local.walletCount!==1||local.ledger.ledgerEntries!==2||local.unsettled)fail('E5D_HISTORY_MISMATCH');
  if(ad.action!=='qa'||ad.state!=='completed'||ad.actual_cost_micros!==2091||ad.reserved_cost_micros!==19200)fail('E5D_SETTLEMENT_MISMATCH');
  const rows=local.entries,d=rows.find(e=>e.id===ad.debit_entry_id),fund=rows.find(e=>e.operation==='credit');
  if(rows.length!==2||!fund||fund.applied_amount!==100||!d||d.operation!=='debit'||d.kind!=='ai_spend'||d.wallet_id!==ad.principal_id||d.reference_id!==ad.request_id||d.requested_amount!==-5||d.applied_amount!==-5||rows.some(e=>e.operation==='refund'))fail('E5D_LEDGER_MISMATCH');
  const review=await list(directory,g),p=review[0],q=review[1];
  if(p.caseId!=='E5D-P41'||p.storage!=='STORED'||p.exists||p.deletion!=='REVIEWED'||p.semanticReview!=='OWNER_NOT_PASS'||q.exists||q.storage!=='NOT_STORED'||q.deletion!=='NOT_RECORDED'||q.semanticReview!=='NOT_REVIEWED')fail('E5D_REVIEW_MISMATCH');
  const receipts={};for(const suffix of ['stored','reviewed','deleted'])receipts[suffix]=await readPrivateJson(join(directory,'review','E5D-P41.'+suffix+'.json'));
  const s=receipts.stored.value,v=receipts.reviewed.value,z=receipts.deleted.value;
  for(const [event,receipt] of Object.entries(receipts)){if(receipt.value.caseId!=='E5D-P41'||receipt.value.event!==event||receipt.value.revisionHash!==g.revisionHash)fail('E5D_REVIEW_MISMATCH');}
  if(!/^[a-f0-9]{64}$/.test(s.bodyHash)||!Number.isSafeInteger(s.bytes)||s.bytes<=0||s.bytes>60000||v.bodyHash!==s.bodyHash||v.reviewer!=='owner'||v.verdict!=='OWNER_NOT_PASS'||validateScores('E5D-P41',{scores:v.scores,critical:v.critical})!=='OWNER_NOT_PASS'||z.reason!=='REVIEWED'||!Number.isFinite(Date.parse(v.at))||!Number.isFinite(Date.parse(z.at))||Date.parse(v.at)<Date.parse(s.createdAt)||Date.parse(v.at)>=Date.parse(s.expiresAt)||Date.parse(z.at)<Date.parse(v.at))fail('E5D_REVIEW_MISMATCH');
  // Receipts are sufficient after the legitimate score/delete operation. Never require/recreate a body.
  try{await lstat(join(directory,'review','E5D-P41.body.json'));fail('E5D_BODY_STILL_PRESENT');}catch(e){if(e.code!=='ENOENT')throw e;}
  return {approvalFileHash:approval.hash,journalTip:journal.tip,localDigest:local.digest,expiresAt:g.expiresAt,attempts:1,reservedMicros:19200,usageEstimateMicros:2091,ledgerEntries:2,semanticReview:'OWNER_NOT_PASS',deletion:'REVIEWED',bodyExists:false,p44:'NOT_EXECUTED',receiptHashes:Object.fromEntries(Object.entries(receipts).map(([k,v])=>[k,v.hash]))};
 }
 const first=await inspect();if(JSON.stringify(await reader.read(path,'recheck'))!==JSON.stringify(history)||JSON.stringify(await inspect())!==JSON.stringify(first))fail('HISTORY_CHANGED');
 console.log(JSON.stringify({...history,e5d:first,attempts:6,reservedMicros:158400,usageEstimateMicros:21489,unknownUsageAttempts:0}));
}catch{console.log(JSON.stringify({error:'HISTORY_AUDIT_FAILED'}));process.exitCode=1;}
finally{await reader?.close();}
