import {mkdir,open,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {loadLiveRevision,SCOPE} from './live-revision.mjs';
import {historicalReader,readPrivateJson,priorBinding,recheckPrior} from './historical-reader.mjs';
import {acquireBudgetLock,openBudget,readBudget,hash,fail,privateDirectory} from '../assistant-eval/budget.mjs';
import {localRuntime} from '../assistant-eval/local-runtime.mjs';
import {inspectLocal} from '../assistant-eval/inspect-local.mjs';
export const HANDOFF='mvp-smoke-e5b-v1';
export const HOURS=86400000;
export async function writeExclusive(path,value){
  const file=await open(path,'wx',0o600);
  try{await file.writeFile(JSON.stringify(value)+'\n');await file.sync();}finally{await file.close();}
}
export function planToken(prior,revisionHash){return hash(JSON.stringify({prior,revisionHash,scope:SCOPE,maxCalls:2,maxMicros:52800,validityHours:24,retentionHours:24}));}
export function validateGrant(g,prior,loaded,directory){
  const expected={version:HANDOFF,approvalId:g.approvalId,issuedAt:g.issuedAt,expiresAt:g.expiresAt,directory,prior,revisionHash:loaded.revisionHash,
    model:loaded.manifest.model,profile:loaded.manifest.profile,scope:SCOPE,maxCalls:2,maxMicros:52800,globalMaxCalls:40,globalMaxMicros:2000000,retainValidatedOutputsHours:24,planToken:planToken(prior,loaded.revisionHash)};
  if(!/^eval-mvp-[a-f0-9-]{36}$/.test(g.approvalId)||!Number.isFinite(Date.parse(g.issuedAt))||Date.parse(g.expiresAt)-Date.parse(g.issuedAt)!==HOURS||
    Object.keys(g).sort().join()!==Object.keys(expected).sort().join()||Object.entries(expected).some(([k,v])=>JSON.stringify(g[k])!==JSON.stringify(v)))fail('HANDOFF_CONFIGURATION_CONFLICT');
  return g;
}
export function requireActive(grant,now=Date.now()){
  if(now<Date.parse(grant.issuedAt)||now>=Date.parse(grant.expiresAt))fail('HANDOFF_APPROVAL_EXPIRED');
}
export async function freshAudit(path){
  const loaded=await loadLiveRevision(),reader=await historicalReader();
  try{
    const prior=priorBinding(await reader.audit(path)),a=await readPrivateJson(path);
    if(a.hash!==prior.approvalFileHash)fail('PRIOR_STATE_CHANGED');
    return {loaded,reader,prior,approval:a.value,directory:join(a.value.stateDir,HANDOFF)};
  }catch(e){await reader.close();throw e;}
}
export async function assertCheckpoint(directory,grant,loaded){
  const journal=await readBudget(directory,grant),local=await inspectLocal(directory,loaded.corpus.capturedAt);
  const last=journal.records.at(-1);
  if(last?.type!=='checkpoint'||last.localDigest!==local.digest||last.ledgerEntries!==local.ledger.ledgerEntries||local.unsettled)fail('INCOMPLETE_OR_CHANGED_LOCAL_STATE');
  validateRecords(journal.records);
  return {journal,local};
}
export function validateRecords(records){
  // Exact sequence: configuration, initial checkpoint, then at most two cases.
  if(records[0]?.type!=='configuration'||records[1]?.type!=='checkpoint'||records[1].ledgerEntries!==0)fail('INVALID_HANDOFF_JOURNAL');
  let at=2;
  for(const id of Object.keys(SCOPE)){
    if(at===records.length)break;
    const [s,r,f,c]=records.slice(at,at+4);
    if(s?.type!=='checked'||s.caseId!==id||s.code!=='STARTED'||r?.type!=='reserve'||r.caseId!==id||r.micros!==SCOPE[id]||
      f?.type!=='finish'||f.attemptId!==r.attemptId||c?.type!=='checkpoint')fail('INCOMPLETE_OR_CHANGED_LOCAL_STATE');
    // A failed first case can be inspected, but never followed by another case.
    if(f.code!=='OK'&&at+4!==records.length)fail('INVALID_HANDOFF_JOURNAL');
    at+=4;
  }
  if(at!==records.length)fail('INVALID_HANDOFF_JOURNAL');
}
export async function inspectHandoff(path){
  const x=await freshAudit(path);
  try{
    const base={status:'HANDOFF_PLAN_ONLY',providerCalls:0,prior:x.prior,revision:x.loaded.manifest,revisionHash:x.loaded.revisionHash,
      scope:SCOPE,maxAdditionalCalls:2,maxAdditionalMicros:52800,aggregateCeiling:{attempts:5,reservedMicros:139200},planToken:planToken(x.prior,x.loaded.revisionHash),newValidityHours:24,retentionHours:24};
    try{await lstat(x.directory);}catch(e){if(e.code==='ENOENT')return base;throw e;}
    const grant=validateGrant((await readPrivateJson(join(x.directory,'authorization.json'))).value,x.prior,x.loaded,x.directory);
    const existing=await readBudget(x.directory,grant);
    if(existing.records.at(-1)?.type!=='checkpoint'){
      const reserved=existing.records.filter(r=>r.type==='reserve');
      return {...base,status:'BLOCKED_INCOMPLETE_ATTEMPT',stop:'NO_RETRY_PRESERVE_STATE',approvalId:grant.approvalId,expiresAt:grant.expiresAt,
        additional:{attempts:reserved.length,reservedMicros:reserved.reduce((n,r)=>n+r.micros,0)},ledgerAudit:'NOT_VERIFIED_AFTER_INTERRUPTION',semanticReview:'NOT_REVIEWED'};
    }
    const {journal,local}=await assertCheckpoint(x.directory,grant,x.loaded);
    const reservations=journal.records.filter(r=>r.type==='reserve'),finishes=journal.records.filter(r=>r.type==='finish');
    return {...base,status:'HANDOFF_INSPECTED',approvalId:grant.approvalId,expiresAt:grant.expiresAt,expired:Date.now()>=Date.parse(grant.expiresAt),
      execution:Date.now()>=Date.parse(grant.expiresAt)?'BLOCKED_EXPIRED':reservations.length?'BLOCKED_ALREADY_STARTED':'AWAITING_EXPLICIT_SMOKE_COMMAND',
      additional:{attempts:reservations.length,reservedMicros:reservations.reduce((n,r)=>n+r.micros,0),usageEstimateMicros:finishes.reduce((n,r)=>n+(r.actualMicros??0),0),unknownUsageAttempts:finishes.filter(r=>r.actualMicros===null).length},
      ledgerEntries:local.ledger.ledgerEntries,semanticReview:'NOT_REVIEWED',reviewFiles:await (await import('./review-output.mjs')).reviewFiles(x.directory),
      results:finishes.map((f,i)=>({caseId:reservations[i].caseId,...Object.fromEntries(Object.entries(f).filter(([k])=>!['digest','previous','attemptId','type'].includes(k)))}))};
  }finally{await x.reader.close();}
}
export async function authorizeHandoff(path,token,confirmation){
  if(confirmation!=='AUTHORIZE_P41_P44_ONCE'||!/^[a-f0-9]{64}$/.test(token??''))fail('EXPLICIT_LOCAL_AUTHORIZATION_REQUIRED');
  const x=await freshAudit(path);let lock,budget;
  try{
    lock=await acquireBudgetLock(x.approval.stateDir);
    await recheckPrior(path,x.prior,x.reader);
    if(token!==planToken(x.prior,x.loaded.revisionHash))fail('PLAN_CHANGED');
    try{
      await lstat(x.directory);
      const g=validateGrant((await readPrivateJson(join(x.directory,'authorization.json'))).value,x.prior,x.loaded,x.directory);
      await assertCheckpoint(x.directory,g,x.loaded);
      return {status:'ALREADY_AUTHORIZED_NO_EXTENSION',approvalId:g.approvalId,expiresAt:g.expiresAt,providerCalls:0};
    }catch(e){if(e.code!=='ENOENT')throw e;/* Missing inner files must never reinitialize an existing directory. */}
    // mkdir without recursive is a durable one-shot gate. Partial initialization STOPs.
    await mkdir(x.directory,{mode:0o700});await privateDirectory(x.directory,{existing:true});
    const originalParent=await open(x.approval.stateDir,'r');try{await originalParent.sync();}finally{await originalParent.close();}
    const issued=Date.now(),grant={version:HANDOFF,approvalId:'eval-mvp-'+randomUUID(),issuedAt:new Date(issued).toISOString(),expiresAt:new Date(issued+HOURS).toISOString(),directory:x.directory,
      prior:x.prior,revisionHash:x.loaded.revisionHash,model:x.loaded.manifest.model,profile:x.loaded.manifest.profile,scope:SCOPE,maxCalls:2,maxMicros:52800,globalMaxCalls:40,globalMaxMicros:2000000,retainValidatedOutputsHours:24,planToken:token};
    await writeExclusive(join(x.directory,'authorization.json'),grant);
    const parent=await open(x.directory,'r');try{await parent.sync();}finally{await parent.close();}
    budget=await openBudget(x.directory,grant,{heldLock:lock});
    const runtime=await localRuntime({directory:x.directory});await runtime.close();
    const local=await inspectLocal(x.directory,x.loaded.corpus.capturedAt);
    if(local.ledger.ledgerEntries||local.admissions.length||local.unsettled)fail('NEW_LOCAL_STATE_NOT_EMPTY');
    await budget.checkpoint(local.digest,0);
    return {status:'AUTHORIZED_NOT_EXECUTED',approvalId:grant.approvalId,expiresAt:grant.expiresAt,providerCalls:0,maxAdditionalCalls:2,maxAdditionalMicros:52800};
  }finally{await budget?.close();await lock?.close();await x.reader.close();}
}
