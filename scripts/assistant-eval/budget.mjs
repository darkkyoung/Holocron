import {open,readFile,mkdir,realpath,lstat,unlink} from 'node:fs/promises';
import {resolve,isAbsolute,relative} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export const hash=value=>createHash('sha256').update(value).digest('hex');
export const fail=code=>{throw new Error(code);};
export const PROFILE='gpt-5.4-mini-2026-03-17-o200k-v1';
export const MODEL='gpt-5.4-mini-2026-03-17';
export function validateApproval(a,hashes,now=Date.now()){
  const fields=['approvalId','model','profile','maxCalls','maxMicros','corpusHash','casesHash','rubricHash','pipelineHash','expiresAt','stateDir','retainValidatedOutputsHours'];
  if(!a||Object.keys(a).sort().join()!==fields.sort().join()||!/^eval-[a-zA-Z0-9-]{1,60}$/.test(a.approvalId)||a.model!==MODEL||a.profile!==PROFILE||
    !Number.isSafeInteger(a.maxCalls)||a.maxCalls<1||a.maxCalls>40||!Number.isSafeInteger(a.maxMicros)||a.maxMicros<1||a.maxMicros>2000000||
    Object.entries(hashes).some(([k,v])=>a[k]!==v)||!Number.isFinite(Date.parse(a.expiresAt))||Date.parse(a.expiresAt)<=now||
    !isAbsolute(a.stateDir)||![0,24].includes(a.retainValidatedOutputsHours))fail('INVALID_APPROVAL');
  return a;
}
export async function privateDirectory(path,{existing=false}={}){
  if(!isAbsolute(path))fail('ABSOLUTE_PRIVATE_DIRECTORY_REQUIRED');
  if(existing){if(!(await lstat(path)).isDirectory())fail('LOCAL_STATE_MISSING');}
  else await mkdir(path,{recursive:true,mode:0o700});
  const actual=await realpath(path),repo=await realpath(process.cwd()),rel=relative(repo,actual);
  if(!rel||!(rel==='..'||rel.startsWith('../'))||actual!==resolve(path)||(await lstat(path)).mode&0o077)fail('PRIVATE_DIRECTORY_OUTSIDE_REPOSITORY_REQUIRED');
  return actual;
}
/** Read without creating directories, locks, configuration or journal files. */
export async function readBudget(directory,configuration){
  await privateDirectory(directory,{existing:true});
  const file=resolve(directory,'budget.jsonl'),stat=await lstat(file);
  if(stat.isSymbolicLink()||stat.size>1024*1024||(stat.mode&0o077))fail('INVALID_BUDGET_JOURNAL');
  const raw=await readFile(file,'utf8');if(!raw.endsWith('\n'))fail('INCOMPLETE_BUDGET_JOURNAL');
  let records;try{records=raw.trimEnd().split('\n').map(s=>JSON.parse(s));}catch{fail('INVALID_BUDGET_JOURNAL');}
  if(records[0]?.type!=='configuration'||records[0].configHash!==hash(JSON.stringify(configuration)))fail('BUDGET_CONFIGURATION_CONFLICT');
  let previous='0'.repeat(64);
  for(const r of records){const {digest,...data}=r;if(data.previous!==previous||hash(JSON.stringify(data))!==digest)fail('INVALID_BUDGET_JOURNAL');previous=digest;}
  return {records,tip:previous};
}
// Shared lease lets a handoff journal use the original campaign's coordinator.
// Only the creator closes the lease; abandoned locks are never removed on retry.
const leases=new WeakSet();
export async function acquireBudgetLock(directory){
  await privateDirectory(directory,{existing:true});
  const path=resolve(directory,'budget.lock');let handle;
  try{handle=await open(path,'wx',0o600);}catch{fail('EVALUATION_LOCKED');}
  const lease={directory,async close(){if(!leases.delete(lease))fail('INVALID_COORDINATOR_LEASE');await handle.close();await unlink(path);}};
  leases.add(lease);return lease;
}
/** Single local coordinator, exclusive lock, append+fsync BEFORE dispatch.
 * Full maximum reservations are never reclaimed, even for known lower usage.
 * Interruption/unknown outcomes therefore cannot replenish budget on resume. */
export async function openBudget(directory,configuration,{requireExisting=false,revision,heldLock}={}){
  await privateDirectory(directory,{existing:requireExisting});
  const file=resolve(directory,'budget.jsonl');
  if(heldLock&&!leases.has(heldLock))fail('INVALID_COORDINATOR_LEASE');
  const lock=heldLock??await acquireBudgetLock(directory);
  const release=async()=>{if(!heldLock)await lock.close();};
  let handle;
  try{
    const configHash=hash(JSON.stringify(configuration));let records=[],previous='0'.repeat(64);
    try{({records,tip:previous}=await readBudget(directory,configuration));}
    catch(e){if(e.code!=='ENOENT'||requireExisting)throw e;}
    handle=await open(file,'a',0o600);
    async function append(data){const event={...data,previous},digest=hash(JSON.stringify(event));await handle.write(JSON.stringify({...event,digest})+'\n');await handle.sync();records.push({...event,digest});previous=digest;}
    if(!records.length){await append({type:'configuration',configHash});const parent=await open(directory,'r');try{await parent.sync();}finally{await parent.close();}}
    let sequence=Promise.resolve(),broken=false;
    function exclusive(operation){const next=sequence.then(()=>{if(broken)fail('BUDGET_IO_STOP');return operation();});sequence=next.catch(()=>{});return next;}
    const reservations=()=>records.filter(r=>r.type==='reserve');
    function totals(){const rows=reservations();return {attempts:rows.length,reservedMicros:rows.reduce((n,r)=>n+r.micros,0)};}
    function canReserve(micros){
      const transition=records.find(r=>r.type==='revision');
      if(transition){
        if(revision!==transition.digest)fail('REVISION_SCOPE_REQUIRED');
        if(Date.parse(configuration.expiresAt)<=Date.now())fail('APPROVAL_EXPIRED');
        if(records.some(r=>r.type==='reserve'&&r.revision===revision))fail('DIAGNOSTIC_ATTEMPT_CONSUMED');
      }else if(revision)fail('REVISION_AUTHORIZATION_MISSING');
      const t=totals();if(!Number.isSafeInteger(micros)||micros<=0||micros>33600)fail('INVALID_RESERVATION');if(t.attempts>=configuration.maxCalls||t.reservedMicros+micros>configuration.maxMicros)fail('EVALUATION_BUDGET_STOP');}
    return {totals,records,canReserve,
      get tip(){return previous;},
      async checkpoint(digest,ledgerEntries){return exclusive(async()=>{
        if(!/^[a-f0-9]{64}$/.test(digest)||!Number.isSafeInteger(ledgerEntries)||ledgerEntries<0)fail('INVALID_CHECKPOINT');
        try{await append({type:'checkpoint',localDigest:digest,ledgerEntries});}catch(e){broken=true;throw e;}
      });},
      async transition(data,expectedTip){return exclusive(async()=>{
        if(records.some(r=>r.type==='revision'))fail('REVISION_ALREADY_RECORDED');
        if(previous!==expectedTip)fail('JOURNAL_TIP_CHANGED');
        try{await append({type:'revision',...data});}catch(e){broken=true;throw e;}
        return previous;
      });},
      seen:caseId=>records.some(r=>['reserve','checked'].includes(r.type)&&r.caseId===caseId),
      async checked(caseId,code){return exclusive(async()=>{if(!/^[PS][0-9]{2}$/.test(caseId)||!/^[A-Z_]+$/.test(code))fail('INVALID_METRICS');await append({type:'checked',caseId,code});});},
      async reserve(caseId,micros){return exclusive(async()=>{if(!/^[PS][0-9]{2}$/.test(caseId))fail('INVALID_CASE');canReserve(micros);if(revision&&(caseId!=='P07'||micros!==33600))fail('DIAGNOSTIC_CASE_ONLY');const attemptId=randomUUID();try{await append({type:'reserve',attemptId,caseId,micros,...(revision?{revision,pipelineHash:records.find(r=>r.type==='revision').toPipelineHash}:{})});}catch(e){broken=true;throw e;}return attemptId;});},
      async finish(attemptId,metrics){return exclusive(async()=>{if(!reservations().some(r=>r.attemptId===attemptId)||records.some(r=>r.type==='finish'&&r.attemptId===attemptId))fail('INVALID_SETTLEMENT');
        // Explicit allowlist: no request/response text, IDs from operational DB, or raw errors.
        const {code,latencyMs,inputTokens,outputTokens,actualMicros,charged,refund}=metrics;
        if(!/^[A-Z_]+$/.test(code)||[latencyMs,inputTokens,outputTokens,actualMicros,charged].some(v=>v!==null&&(!Number.isSafeInteger(v)||v<0)))fail('INVALID_METRICS');
        let safeRefund=null;if(refund){const {requested,applied,forfeited,full}=refund;if([requested,applied,forfeited].some(n=>!Number.isSafeInteger(n)||n<0)||requested!==applied+forfeited||full!==(forfeited===0))fail('INVALID_METRICS');safeRefund={requested,applied,forfeited,full};}
        try{await append({type:'finish',attemptId,code,latencyMs,inputTokens,outputTokens,actualMicros,charged,refund:safeRefund});}catch(e){broken=true;throw e;}});},
      async close(){await sequence;await handle.close();await release();},
    };
  }catch(e){await handle?.close();await release();throw e;}
}
