import {readFile,readdir,lstat} from 'node:fs/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {dirname} from 'node:path';
import {hash,fail,validateApproval,readBudget,openBudget,privateDirectory} from './budget.mjs';
import {loadCorpus} from './corpus.mjs';
import {inspectLocal} from './inspect-local.mjs';
export const FROM='3033f845d991bbdde172d0ee01c233dfe723d4b54d5bb7589ec789f19804037c';
export const TO='62bf4041d3e3952f609a4cf300964a3f8752b0c2860128f3ba18523e4c48dfa4';
const FIXED={corpusHash:'acd78cd254bc8bb716bbf4f3bafb87bd6e2d3e1dab4618f8b63faff4bc9cce48',casesHash:'fb6cc66a4fb2ed10eb80d27d9ed21488c0db00f9279a90bd9496efdd86212ef4',rubricHash:'ada658ce55acd599598e1865266c1715c5f51c75413fff9b1e94a1fac8d76afa',pipelineHash:TO};
const BASE='917d8284411d5c3552aa77d0f10fc4a44afdccf8';
const SMOKE=[['P01','qa',19200,5,'OK',1734],['P05','planner',33600,7,'OK',4614],['P07','draft',33600,15,'INVALID_OUTPUT',6735]];

export function assertReviewedHashes(hashes){if(Object.entries(FIXED).some(([k,v])=>hashes[k]!==v))fail('UNREVIEWED_REVISION');}
async function requiredJournal(directory,approval){
  try{return await readBudget(directory,approval);}catch(e){if(e.code==='ENOENT')fail('MISSING_CAMPAIGN_JOURNAL');throw e;}
}
async function inputs(path){
  await privateDirectory(dirname(path),{existing:true});
  const stat=await lstat(path);
  if(stat.isSymbolicLink()||!stat.isFile()||stat.size>16384||(stat.mode&0o077))fail('PRIVATE_APPROVAL_REQUIRED');
  const raw=await readFile(path,'utf8');let approval;
  try{approval=JSON.parse(raw);}catch{fail('INVALID_APPROVAL');}
  const loaded=await loadCorpus();
  assertReviewedHashes(loaded.hashes);
  // Freeze supporting runtime/schema/lockfile as well as the manifest's Assistant hash.
  try{await promisify(execFile)('git',['diff','--quiet',BASE,'--','lib','db','drizzle','pnpm-lock.yaml','scripts/test-module-loader.mjs']);}
  catch{fail('UNREVIEWED_RUNTIME_CHANGE');}
  validateApproval(approval,{...FIXED,pipelineHash:FROM},0);
  if(approval.maxCalls!==40||approval.maxMicros!==2000000||approval.retainValidatedOutputsHours!==24)fail('ORIGINAL_APPROVAL_MISMATCH');
  const names=(await readdir('scripts/assistant-eval')).filter(n=>n.endsWith('.mjs')).sort();
  const toolHash=hash((await Promise.all(names.map(async n=>n+'\n'+await readFile('scripts/assistant-eval/'+n,'utf8')))).join('\n'));
  const reviewed=JSON.parse(await readFile('evaluation/assistant/diagnostic-transition.json','utf8'));
  if(reviewed.version!=='E.3.2-R1'||reviewed.toolHash!==toolHash)fail('UNREVIEWED_TOOL_REVISION');
  return {...loaded,approval,approvalFileHash:hash(raw),toolHash};
}
function checkHistory(records,local){
  if(records.filter(r=>r.type==='configuration').length!==1||records.some(r=>!['configuration','reserve','finish','revision'].includes(r.type)))fail('UNEXPECTED_CAMPAIGN_HISTORY');
  const revisions=records.filter(r=>r.type==='revision');if(revisions.length>1)fail('UNEXPECTED_CAMPAIGN_HISTORY');
  const boundary=revisions.length?records.indexOf(revisions[0]):records.length;
  const original=records.slice(1,boundary);
  if(original.length!==6)fail('ORIGINAL_SMOKE_MISMATCH');
  const ids=new Set(),originalProofs=[];
  SMOKE.forEach(([caseId,action,micros,charged,code,actual],i)=>{
    const r=original[i*2],f=original[i*2+1];
    if(r.type!=='reserve'||r.caseId!==caseId||r.micros!==micros||r.revision||ids.has(r.attemptId)||f.type!=='finish'||f.attemptId!==r.attemptId||f.code!==code||f.charged!==charged||f.actualMicros!==actual)fail('ORIGINAL_SMOKE_MISMATCH');
    ids.add(r.attemptId);
    if(i===2?JSON.stringify(f.refund)!==JSON.stringify({requested:15,applied:15,forfeited:0,full:true}):f.refund!==null)fail('ORIGINAL_SMOKE_MISMATCH');
    // Match immutable original debit proof, not only mutable admission labels/counts.
    const candidates=local.admissions.filter(a=>a.action===action&&a.reserved_cost_micros===micros&&a.actual_cost_micros===actual&&a.state===(i===2?'failed':'completed'));
    const matched=candidates.filter(a=>{
      const debit=local.entries.find(e=>e.id===a.debit_entry_id),wallet=local.entries.filter(e=>e.wallet_id===a.principal_id);
      const refunds=wallet.filter(e=>e.original_entry_id===a.debit_entry_id);
      const proof=hash(JSON.stringify({admission:a,entries:wallet}));
      return (!revisions.length||revisions[0].originalProofs?.[i]===proof)&&debit?.operation==='debit'&&debit.kind==='ai_spend'&&debit.wallet_id===a.principal_id&&debit.requested_amount===-charged&&debit.applied_amount===-charged&&debit.reference_id===a.request_id&&
        wallet[0]?.operation==='credit'&&wallet[0]?.applied_amount===100&&wallet.length===(i===2?3:2)&&
        (i===2?refunds.length===1&&refunds[0].requested_amount===15&&refunds[0].applied_amount===15:refunds.length===0);
    });
    if(matched.length!==1)fail('ORIGINAL_LEDGER_MISMATCH');
    originalProofs.push(hash(JSON.stringify({admission:matched[0],entries:local.entries.filter(e=>e.wallet_id===matched[0].principal_id)})));
  });
  const subsequent=records.slice(boundary+1),reserves=subsequent.filter(r=>r.type==='reserve');
  if(reserves.length>1||subsequent.some(r=>!['reserve','finish'].includes(r.type))||subsequent.filter(r=>r.type==='finish').length>reserves.length)fail('DIAGNOSTIC_HISTORY_MISMATCH');
  if(reserves.length){const r=reserves[0];if(r.caseId!=='P07'||r.micros!==33600||r.revision!==revisions[0].digest||r.pipelineHash!==TO||ids.has(r.attemptId)||subsequent[0]!==r||subsequent.some(e=>e.type==='finish'&&e.attemptId!==r.attemptId))fail('DIAGNOSTIC_HISTORY_MISMATCH');}
  if(!reserves.length&&(local.ledger.ledgerEntries!==7||local.walletCount!==3||local.admissions.length!==3))fail('ORIGINAL_LOCAL_STATE_MISMATCH');
  return {transition:revisions[0],consumed:reserves.length===1,originalProofs};
}
export async function inspectRevision(path){
  const input=await inputs(path),{approval}=input;
  // Refuse an active or abandoned coordinator lock. Inspection never removes it.
  try{await lstat(approval.stateDir+'/budget.lock');fail('EVALUATION_LOCKED');}catch(e){if(e.code!=='ENOENT')throw e;}
  return inspectUnlocked(input);
}
async function inspectUnlocked(input){
  const {approval,approvalFileHash,toolHash,corpus}=input,journal=await requiredJournal(approval.stateDir,approval);
  let local;try{local=await inspectLocal(approval.stateDir,corpus.capturedAt);}catch(e){if(e.code==='ENOENT')fail('LOCAL_D1_MISSING');throw e;}
  const {transition,consumed,originalProofs}=checkHistory(journal.records,local);
  if((await requiredJournal(approval.stateDir,approval)).tip!==journal.tip)fail('JOURNAL_TIP_CHANGED');
  const planToken=hash(JSON.stringify({tip:journal.tip,local:local.digest,approvalFileHash,toolHash,from:FROM,to:TO}));
  if(transition&&(transition.fromPipelineHash!==FROM||transition.toPipelineHash!==TO||transition.approvalFileHash!==approvalFileHash||transition.toolHash!==toolHash||transition.caseId!=='P07'||transition.maxAdditionalAttempts!==1||!consumed&&transition.localDigest!==local.digest))fail('REVISION_CONFIGURATION_CONFLICT');
  const expired=Date.parse(approval.expiresAt)<=Date.now();
  const stop=expired?'APPROVAL_EXPIRED':consumed?'DIAGNOSTIC_ATTEMPT_CONSUMED':local.unsettled?'UNSETTLED_LOCAL_ADMISSIONS':null;
  const reserves=journal.records.filter(r=>r.type==='reserve');
  const report={status:stop?'BLOCKED':transition?'REVISION_APPLIED':'TRANSITION_READY',stop,approvalId:approval.approvalId,expiresAt:approval.expiresAt,expired,
    fromPipelineHash:FROM,candidatePipelineHash:TO,corpusHash:input.hashes.corpusHash,casesHash:input.hashes.casesHash,rubricHash:input.hashes.rubricHash,toolHash,
    totals:{attempts:reserves.length,reservedMicros:reserves.reduce((n,r)=>n+r.micros,0)},maxCalls:40,maxMicros:2000000,
    ledgerEntries:local.ledger.ledgerEntries,walletCount:local.walletCount,unsettled:local.unsettled,journalTip:journal.tip,planToken,
    priorSemanticReview:'UNREVIEWED',revision:transition?.digest??null,additionalCase:'P07',additionalAttemptsRemaining:consumed?0:1,providerCalls:0};
  return {input,report,local,transition,journal,originalProofs};
}
export async function applyRevision(path,plan){
  if(!/^[a-f0-9]{64}$/.test(plan??''))fail('EXPLICIT_PLAN_APPROVAL_REQUIRED');
  const input=await inputs(path),budget=await openBudget(input.approval.stateDir,input.approval,{requireExisting:true});
  try{
    const checked=await inspectUnlocked(input);
    if(checked.report.expired)fail('APPROVAL_EXPIRED');
    if(checked.transition){if(checked.transition.planToken!==plan)fail('PLAN_CHANGED');return {...checked.report,status:'REVISION_ALREADY_APPLIED'};}
    if(checked.report.stop)fail(checked.report.stop);
    if(checked.report.planToken!==plan)fail('PLAN_CHANGED');
    const revision=await budget.transition({fromPipelineHash:FROM,toPipelineHash:TO,approvalFileHash:input.approvalFileHash,toolHash:input.toolHash,localDigest:checked.local.digest,
      planToken:plan,originalProofs:checked.originalProofs,caseId:'P07',maxAdditionalAttempts:1,recordedAt:new Date().toISOString()},checked.report.journalTip);
    return {...checked.report,status:'REVISION_APPLIED',revision,journalTip:revision};
  }finally{await budget.close();}
}
// Run acquires the very same coordinator lock and repeats every check under it.
export async function openDiagnostic(path){
  const input=await inputs(path),prior=await requiredJournal(input.approval.stateDir,input.approval),transition=prior.records.find(r=>r.type==='revision');
  if(!transition)fail('REVISION_AUTHORIZATION_MISSING');
  const budget=await openBudget(input.approval.stateDir,input.approval,{requireExisting:true,revision:transition.digest});
  try{const checked=await inspectUnlocked(input);if(checked.report.stop)fail(checked.report.stop);budget.canReserve(33600);return {...checked,budget};}
  catch(e){await budget.close();throw e;}
}
