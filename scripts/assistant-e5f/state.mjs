import {mkdir,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {historyReader} from './history.mjs';
import {revision,DIRECTORY,ID,SCOPE} from './revision.mjs';
import {readPrivateJson} from '../assistant-mvp/historical-reader.mjs';
import {writeExclusive,HOURS,validateRecords} from '../assistant-mvp/handoff.mjs';
import {fail,hash,privateDirectory,acquireBudgetLock,readBudget,openBudget} from '../assistant-eval/budget.mjs';
import {localRuntime} from '../assistant-eval/local-runtime.mjs';
import {inspectLocal} from '../assistant-eval/inspect-local.mjs';
export {syncDir,totals} from '../assistant-e5d/state.mjs';
import {syncDir,totals} from '../assistant-e5d/state.mjs';
export function planToken(history,revisionHash){return hash(JSON.stringify({version:ID,history,revisionHash,scope:SCOPE,maxCalls:2,maxMicros:52800,validityHours:24,retentionHours:24}));}
export async function context(path){
 const loaded=await revision(),reader=await historyReader();
 try{const history=await reader.read(path),a=await readPrivateJson(path);
  if(a.hash!==history.e3.approvalFileHash||history.attempts!==6||history.reservedMicros!==158400||history.usageEstimateMicros!==21489||history.unknownUsageAttempts!==0)fail('HISTORY_MISMATCH');
  return {path,reader,loaded,history,approval:a.value,directory:join(a.value.stateDir,DIRECTORY)};
 }catch(e){await reader.close();throw e;}
}
export async function recheck(x){if(JSON.stringify(await x.reader.read(x.path,'recheck'))!==JSON.stringify(x.history))fail('HISTORY_CHANGED');}
export function validateGrant(g,x){
 const expected={version:ID,approvalId:g.approvalId,issuedAt:g.issuedAt,expiresAt:g.expiresAt,directory:x.directory,history:x.history,revisionHash:x.loaded.hash,model:x.loaded.manifest.model,profile:x.loaded.manifest.profile,scope:SCOPE,maxCalls:2,maxMicros:52800,globalMaxCalls:40,globalMaxMicros:2000000,retainValidatedOutputsHours:24,planToken:planToken(x.history,x.loaded.hash)};
 if(!/^eval-e5f-[a-f0-9-]{36}$/.test(g.approvalId)||!Number.isFinite(Date.parse(g.issuedAt))||Date.parse(g.expiresAt)-Date.parse(g.issuedAt)!==HOURS||Object.keys(g).sort().join()!==Object.keys(expected).sort().join()||Object.entries(expected).some(([k,v])=>JSON.stringify(g[k])!==JSON.stringify(v)))fail('E5F_CONFIGURATION_CONFLICT');
 return g;
}
export async function grantFor(x){return validateGrant((await readPrivateJson(join(x.directory,'authorization.json'))).value,x);}
export async function checkpoint(x,g){
 const journal=await readBudget(x.directory,g),local=await inspectLocal(x.directory,x.loaded.corpus.capturedAt),last=journal.records.at(-1);
 if(last?.type!=='checkpoint'||last.localDigest!==local.digest||last.ledgerEntries!==local.ledger.ledgerEntries||local.unsettled)fail('INCOMPLETE_OR_CHANGED_LOCAL_STATE');
 validateRecords(journal.records);return {journal,local};
}
export async function inspect(path){
 const x=await context(path);
 try{
  const result={status:'PLAN_ONLY_LIVE_NOT_AUTHORIZED',providerCalls:0,history:x.history,revision:x.loaded.manifest,revisionHash:x.loaded.hash,scope:SCOPE,additionalCeiling:{attempts:2,reservedMicros:52800},aggregateCeiling:{attempts:8,reservedMicros:211200},planToken:planToken(x.history,x.loaded.hash),stateDir:x.directory};
  try{await lstat(x.directory);}catch(e){if(e.code==='ENOENT')return result;throw e;}
  const g=await grantFor(x),j=await readBudget(x.directory,g),additional=totals(j.records);
  if(j.records.at(-1)?.type!=='checkpoint')return {...result,status:j.records.at(-1)?.code==='OUTPUT_STORAGE_FAILED'?'STOP_OUTPUT_STORAGE_FAILED':'STOP_INCOMPLETE_NO_RETRY',additional,ledger:'NOT_VERIFIED_AFTER_INTERRUPTION'};
  const {local}=await checkpoint(x,g);
  return {...result,status:'INSPECTED_NOT_EXECUTED',approvalId:g.approvalId,expiresAt:g.expiresAt,expired:Date.now()>=Date.parse(g.expiresAt),additional,aggregate:{attempts:x.history.attempts+additional.attempts,reservedMicros:x.history.reservedMicros+additional.reservedMicros,knownUsageEstimateMicros:x.history.usageEstimateMicros+additional.knownUsageEstimateMicros,unknownUsageAttempts:additional.unknownUsageAttempts},ledgerEntries:local.ledger.ledgerEntries,results:j.records.filter(r=>r.type==='finish').map((r,i)=>({caseId:['E5F-P41','E5F-P44'][i],...Object.fromEntries(Object.entries(r).filter(([k])=>!['digest','previous','attemptId','type'].includes(k)))})),review:await (await import('./review.mjs')).list(x.directory,g)};
 }finally{await x.reader.close();}
}
// Only the owner's later explicit command calls this. Tests use synthetic history.
export async function authorize(path,token,confirmation){
 if(confirmation!=='AUTHORIZE_E5F_TWO_CASES'||!/^[a-f0-9]{64}$/.test(token??''))fail('EXPLICIT_AUTHORIZATION_REQUIRED');
 const x=await context(path);let lock,budget;
 try{
  lock=await acquireBudgetLock(x.approval.stateDir);await recheck(x);
  if(token!==planToken(x.history,x.loaded.hash))fail('PLAN_CHANGED');
  let exists=true;try{await lstat(x.directory);}catch(e){if(e.code!=='ENOENT')throw e;exists=false;}
  if(exists){const g=await grantFor(x);await checkpoint(x,g);return {status:'ALREADY_AUTHORIZED_NO_EXTENSION',expiresAt:g.expiresAt,providerCalls:0};}
  await mkdir(x.directory,{mode:0o700});await privateDirectory(x.directory,{existing:true});await syncDir(x.approval.stateDir);
  const now=Date.now(),g={version:ID,approvalId:'eval-e5f-'+randomUUID(),issuedAt:new Date(now).toISOString(),expiresAt:new Date(now+HOURS).toISOString(),directory:x.directory,history:x.history,revisionHash:x.loaded.hash,model:x.loaded.manifest.model,profile:x.loaded.manifest.profile,scope:SCOPE,maxCalls:2,maxMicros:52800,globalMaxCalls:40,globalMaxMicros:2000000,retainValidatedOutputsHours:24,planToken:token};
  await writeExclusive(join(x.directory,'authorization.json'),g);await syncDir(x.directory);
  budget=await openBudget(x.directory,g,{heldLock:lock});const runtime=await localRuntime({directory:x.directory});await runtime.close();
  const local=await inspectLocal(x.directory,x.loaded.corpus.capturedAt);if(local.ledger.ledgerEntries||local.admissions.length||local.unsettled)fail('NEW_STATE_NOT_EMPTY');
  await budget.checkpoint(local.digest,0);
  return {status:'AUTHORIZED_NOT_EXECUTED',approvalId:g.approvalId,expiresAt:g.expiresAt,providerCalls:0};
 }finally{await budget?.close();await lock?.close();await x.reader.close();}
}
