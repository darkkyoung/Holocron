import {readFile,lstat} from 'node:fs/promises';
import {dirname} from 'node:path';
import {hash,fail,privateDirectory,readBudget,validateApproval} from '../assistant-eval/budget.mjs';
import {inspectLocal} from '../assistant-eval/inspect-local.mjs';
const ORIGINAL={corpusHash:'acd78cd254bc8bb716bbf4f3bafb87bd6e2d3e1dab4618f8b63faff4bc9cce48',casesHash:'fb6cc66a4fb2ed10eb80d27d9ed21488c0db00f9279a90bd9496efdd86212ef4',rubricHash:'ada658ce55acd599598e1865266c1715c5f51c75413fff9b1e94a1fac8d76afa',pipelineHash:'3033f845d991bbdde172d0ee01c233dfe723d4b54d5bb7589ec789f19804037c'};
export const PROPOSAL={maxAdditionalCalls:6,maxAdditionalMicros:200000,globalMaxCalls:40,globalMaxMicros:2000000,plannedMicros:158400,smokeMicros:52800};
/** No locks, recovery, migrations, writes, expiry extension or authorization issuance. */
export async function inspectPrior(path,corpus){
  await privateDirectory(dirname(path),{existing:true});
  const stat=await lstat(path);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>16384||(stat.mode&0o077))fail('PRIVATE_APPROVAL_REQUIRED');
  const raw=await readFile(path,'utf8');let approval;try{approval=JSON.parse(raw);}catch{fail('INVALID_APPROVAL');}
  // Structural validation only at epoch; actual expiration is reported below, never extended.
  validateApproval(approval,ORIGINAL,0);
  if(approval.maxCalls!==40||approval.maxMicros!==2000000)fail('ORIGINAL_LIMIT_MISMATCH');
  try{await lstat(approval.stateDir+'/budget.lock');fail('EVALUATION_LOCKED');}catch(e){if(e.code!=='ENOENT')throw e;}
  const journal=await readBudget(approval.stateDir,approval),local=await inspectLocal(approval.stateDir,corpus.capturedAt);
  const expected=[['P01','qa',19200,5,'OK',1734],['P05','planner',33600,7,'OK',4614],['P07','draft',33600,15,'INVALID_OUTPUT',6735]];
  if(journal.records.length!==7||local.ledger.ledgerEntries!==7||local.walletCount!==3||local.admissions.length!==3||local.unsettled)fail('PRIOR_STATE_DIFFERS_STOP');
  const ids=new Set(),debits=new Set();
  expected.forEach(([id,action,cost,charge,code,actual],i)=>{
    const r=journal.records[1+i*2],f=journal.records[2+i*2];
    if(r.type!=='reserve'||r.caseId!==id||r.micros!==cost||r.revision||ids.has(r.attemptId)||f.type!=='finish'||f.attemptId!==r.attemptId||f.code!==code||f.charged!==charge||f.actualMicros!==actual)fail('PRIOR_STATE_DIFFERS_STOP');
    ids.add(r.attemptId);
    const matches=local.admissions.filter(a=>a.action===action&&a.reserved_cost_micros===cost&&a.actual_cost_micros===actual&&a.state===(i===2?'failed':'completed'));
    if(matches.length!==1)fail('PRIOR_LEDGER_MISMATCH');
    const a=matches[0],d=local.entries.find(e=>e.id===a.debit_entry_id),rows=local.entries.filter(e=>e.wallet_id===a.principal_id),refunds=rows.filter(e=>e.original_entry_id===a.debit_entry_id);
    if(!d||debits.has(d.id)||d.operation!=='debit'||d.kind!=='ai_spend'||d.reference_id!==a.request_id||d.wallet_id!==a.principal_id||d.requested_amount!==-charge||d.applied_amount!==-charge||rows[0]?.operation!=='credit'||rows[0]?.applied_amount!==100||rows.length!==(i===2?3:2))fail('PRIOR_LEDGER_MISMATCH');
    debits.add(d.id);
    if(i===2?refunds.length!==1||refunds[0].requested_amount!==15||refunds[0].applied_amount!==15||JSON.stringify(f.refund)!==JSON.stringify({requested:15,applied:15,forfeited:0,full:true}):refunds.length!==0||f.refund!==null)fail('PRIOR_REFUND_MISMATCH');
  });
  if((await readBudget(approval.stateDir,approval)).tip!==journal.tip||hash(await readFile(path,'utf8'))!==hash(raw))fail('PRIOR_STATE_CHANGED');
  const expired=Date.parse(approval.expiresAt)<=Date.now();
  return {status:'PRIOR_AUDIT_PASS_LIVE_BLOCKED',providerCalls:0,approvalFileHash:hash(raw),journalTip:journal.tip,localDigest:local.digest,expired,expiresAt:approval.expiresAt,
    prior:{attempts:3,reservedMicros:86400,usageEstimateMicros:13083,ledgerEntries:7,semanticReview:'UNREVIEWED'},proposal:PROPOSAL,
    aggregatePlanned:{attempts:9,reservedMicros:244800},aggregateCeiling:{attempts:9,reservedMicros:286400},
    stop:expired?'EXPLICIT_NEW_SCOPE_AND_DEADLINE_DECISION_REQUIRED':'EXPLICIT_NEW_SCOPE_APPROVAL_REQUIRED'};
}
