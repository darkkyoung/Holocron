import {mkdir,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {historyReader} from './history.mjs';
import {revision,DIRECTORY,ID,SCOPE,ORDER,internal,accepted} from './revision.mjs';
import {readPrivateJson} from '../assistant-mvp/historical-reader.mjs';
import {writeExclusive,HOURS} from '../assistant-mvp/handoff.mjs';
import {fail,hash,privateDirectory,acquireBudgetLock,readBudget,openBudget} from '../assistant-eval/budget.mjs';
import {localRuntime} from '../assistant-eval/local-runtime.mjs';
import {inspectLocal} from '../assistant-eval/inspect-local.mjs';
import {reviewHash,reviewedPass,list} from './review.mjs';
import {syncDir,totals} from '../assistant-e5d/state.mjs';
export {totals};
export const stateDigest=async(dir,local)=>hash(JSON.stringify({version:ID,localDigest:local.digest,reviewHash:await reviewHash(dir)}));
export function parseJournal(records){
 if(records[0]?.type!=='configuration'||records[1]?.type!=='checkpoint'||records[1].ledgerEntries!==0)fail('INVALID_HANDOFF_JOURNAL');
 const runs=[];let p=2;
 while(p<records.length){const id=ORDER[runs.length],[start,reserve,finish,cp]=records.slice(p,p+4);
  if(!id||start?.type!=='checked'||start.caseId!==internal(id)||start.code!=='STARTED'||reserve?.type!=='reserve'||reserve.caseId!==internal(id)||reserve.micros!==SCOPE[id]||finish?.type!=='finish'||finish.attemptId!==reserve.attemptId||cp?.type!=='checkpoint')fail('INVALID_HANDOFF_JOURNAL');
  p+=4;const reviewed=records[p]?.type==='checkpoint';if(reviewed)p++;
  runs.push({id,finish,reviewed});if(p<records.length&&!reviewed)fail('INVALID_HANDOFF_JOURNAL');
 }return runs;
}
export function programAccepted(id,finish){return accepted(id,finish.code)&&Number.isSafeInteger(finish.actualMicros)&&finish.actualMicros>=0;}
export function createState({readHistory=historyReader,loadRevision=revision}={}){
 const planToken=(history,revisionHash)=>hash(JSON.stringify({version:ID,history,revisionHash,scope:SCOPE,order:ORDER,maxCalls:4,maxMicros:105600,validityHours:24,retentionHours:24,checkpoint:'D1_AND_REVIEW_V1'}));
 async function context(path){const loaded=await loadRevision(),reader=await readHistory();try{const history=await reader.read(path),a=await readPrivateJson(path);
  if(a.hash!==history.e3.approvalFileHash||history.attempts!==10||history.reservedMicros!==278400||history.usageEstimateMicros!==35827||history.unknownUsageAttempts!==0)fail('HISTORY_MISMATCH');
  return {path,reader,loaded,history,approval:a.value,directory:join(a.value.stateDir,DIRECTORY)};
 }catch(e){await reader.close();throw e;}}
 async function recheck(x){if(JSON.stringify(await x.reader.read(x.path,'recheck'))!==JSON.stringify(x.history))fail('HISTORY_CHANGED');}
 function configuration(x,id,issuedAt,expiresAt){return {version:ID,approvalId:id,issuedAt,expiresAt,directory:x.directory,history:x.history,revisionHash:x.loaded.hash,model:x.loaded.manifest.model,profile:x.loaded.manifest.profile,scope:SCOPE,order:ORDER,maxCalls:4,maxMicros:105600,globalMaxCalls:40,globalMaxMicros:2000000,retainValidatedOutputsHours:24,checkpoint:'D1_AND_REVIEW_V1',planToken:planToken(x.history,x.loaded.hash)};}
 function validateGrant(g,x){const expected=configuration(x,g.approvalId,g.issuedAt,g.expiresAt);
  if(!/^eval-e6b-[a-f0-9-]{36}$/.test(g.approvalId)||!Number.isFinite(Date.parse(g.issuedAt))||Date.parse(g.expiresAt)-Date.parse(g.issuedAt)!==HOURS||Object.keys(g).sort().join()!==Object.keys(expected).sort().join()||Object.entries(expected).some(([k,v])=>JSON.stringify(g[k])!==JSON.stringify(v)))fail('E6B_CONFIGURATION_CONFLICT');return g;}
 const grantFor=async x=>validateGrant((await readPrivateJson(join(x.directory,'authorization.json'))).value,x);
 async function checkpoint(x,g){const journal=await readBudget(x.directory,g),local=await inspectLocal(x.directory,x.loaded.corpus.capturedAt),last=journal.records.at(-1);
  if(last?.type!=='checkpoint'||last.localDigest!==await stateDigest(x.directory,local)||last.ledgerEntries!==local.ledger.ledgerEntries||local.unsettled)fail('INCOMPLETE_OR_CHANGED_LOCAL_STATE');
  const runs=parseJournal(journal.records);if(local.admissions.length!==runs.length||local.walletCount!==runs.length)fail('SETTLEMENT_MISMATCH');return {journal,local,runs};}
 async function gate(x,g,checked,id){internal(id);if(checked.runs.some(r=>r.id===id))fail('CASE_ALREADY_STARTED');if(ORDER[checked.runs.length]!==id)fail('CASE_ORDER_REQUIRED');
  for(const r of checked.runs)if(!programAccepted(r.id,r.finish)||!r.reviewed||!await reviewedPass(x.directory,g,r.id))fail('PREVIOUS_OWNER_PASS_REQUIRED');
  const pending=(await list(x.directory,g)).filter(r=>!checked.runs.some(run=>run.id===r.caseId));if(pending.some(r=>r.exists||r.storage!=='NOT_STORED'||r.deletion!=='NOT_RECORDED'||r.semanticReview!=='NOT_REVIEWED'))fail('UNEXPECTED_REVIEW_STATE');}
 async function inspect(path){const x=await context(path);try{
  const result={status:'PLAN_ONLY_LIVE_NOT_AUTHORIZED',providerCalls:0,history:x.history,revision:x.loaded.manifest,revisionHash:x.loaded.hash,scope:SCOPE,order:ORDER,additionalCeiling:{attempts:4,reservedMicros:105600},aggregateCeiling:{attempts:14,reservedMicros:384000},planToken:planToken(x.history,x.loaded.hash),stateDir:x.directory};
  try{await lstat(x.directory);}catch(e){if(e.code==='ENOENT')return result;throw e;}
  const g=await grantFor(x),j=await readBudget(x.directory,g),additional=totals(j.records);
  if(j.records.at(-1)?.type!=='checkpoint')return {...result,status:j.records.at(-1)?.code==='OUTPUT_STORAGE_FAILED'?'STOP_OUTPUT_STORAGE_FAILED':'STOP_INCOMPLETE_NO_RETRY',additional,ledger:'NOT_VERIFIED_AFTER_INTERRUPTION'};
  const checked=await checkpoint(x,g),reviews=await list(x.directory,g);let status='INSPECTED_NOT_EXECUTED';
  if(checked.runs.some(r=>!programAccepted(r.id,r.finish))||reviews.some(r=>r.semanticReview==='OWNER_NOT_PASS'))status='STOP_UNEXPECTED_RESULT';
  return {...result,status,approvalId:g.approvalId,expiresAt:g.expiresAt,expired:Date.now()>=Date.parse(g.expiresAt),additional,aggregate:{attempts:10+additional.attempts,reservedMicros:278400+additional.reservedMicros,knownUsageEstimateMicros:35827+additional.knownUsageEstimateMicros,unknownUsageAttempts:additional.unknownUsageAttempts},ledgerEntries:checked.local.ledger.ledgerEntries,results:checked.runs.map(r=>({caseId:r.id,code:r.finish.code,actualMicros:r.finish.actualMicros,reviewCheckpoint:r.reviewed})),review:reviews};
 }finally{await x.reader.close();}}
 async function authorize(path,token,confirmation){
  if(confirmation!=='AUTHORIZE_E6B_PILOT4'||!/^[a-f0-9]{64}$/.test(token??''))fail('EXPLICIT_AUTHORIZATION_REQUIRED');const x=await context(path);let lock,budget;
  try{lock=await acquireBudgetLock(x.approval.stateDir);await recheck(x);if(token!==planToken(x.history,x.loaded.hash))fail('PLAN_CHANGED');
   let exists=true;try{await lstat(x.directory);}catch(e){if(e.code!=='ENOENT')throw e;exists=false;}
   if(exists){const g=await grantFor(x);await checkpoint(x,g);return {status:'ALREADY_AUTHORIZED_NO_EXTENSION',expiresAt:g.expiresAt,providerCalls:0};}
   await mkdir(x.directory,{mode:0o700});await privateDirectory(x.directory,{existing:true});await syncDir(x.approval.stateDir);
   const now=Date.now(),g=configuration(x,'eval-e6b-'+randomUUID(),new Date(now).toISOString(),new Date(now+HOURS).toISOString());await writeExclusive(join(x.directory,'authorization.json'),g);await syncDir(x.directory);
   budget=await openBudget(x.directory,g,{heldLock:lock});const runtime=await localRuntime({directory:x.directory});await runtime.close();const local=await inspectLocal(x.directory,x.loaded.corpus.capturedAt);
   if(local.ledger.ledgerEntries||local.admissions.length||local.unsettled)fail('NEW_STATE_NOT_EMPTY');await budget.checkpoint(await stateDigest(x.directory,local),0);
   return {status:'AUTHORIZED_NOT_EXECUTED',approvalId:g.approvalId,expiresAt:g.expiresAt,providerCalls:0};
  }finally{await budget?.close();await lock?.close();await x.reader.close();}}
 return {context,recheck,planToken,validateGrant,grantFor,checkpoint,gate,inspect,authorize};
}
export const {context,recheck,planToken,validateGrant,grantFor,checkpoint,gate,inspect,authorize}=createState();
