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
export async function privateDirectory(path){
  if(!isAbsolute(path))fail('ABSOLUTE_PRIVATE_DIRECTORY_REQUIRED');
  await mkdir(path,{recursive:true,mode:0o700});
  const actual=await realpath(path),repo=await realpath(process.cwd()),rel=relative(repo,actual);
  if(!rel||!(rel==='..'||rel.startsWith('../'))||actual!==resolve(path)||(await lstat(path)).mode&0o077)fail('PRIVATE_DIRECTORY_OUTSIDE_REPOSITORY_REQUIRED');
  return actual;
}
/** Single local coordinator, exclusive lock, append+fsync BEFORE dispatch.
 * Full maximum reservations are never reclaimed, even for known lower usage.
 * Interruption/unknown outcomes therefore cannot replenish budget on resume. */
export async function openBudget(directory,configuration){
  await privateDirectory(directory);
  const lockPath=resolve(directory,'budget.lock'),file=resolve(directory,'budget.jsonl');
  let lock;try{lock=await open(lockPath,'wx',0o600);}catch{fail('EVALUATION_LOCKED');}
  let handle;
  try{
    const configHash=hash(JSON.stringify(configuration));let records=[];
    try{
      const stat=await lstat(file);if(stat.isSymbolicLink()||stat.size>1024*1024||(stat.mode&0o077))fail('INVALID_BUDGET_JOURNAL');
      const raw=await readFile(file,'utf8');if(!raw.endsWith('\n'))fail('INCOMPLETE_BUDGET_JOURNAL');
      records=raw.trimEnd().split('\n').map(s=>JSON.parse(s));
      if(records[0]?.type!=='configuration'||records[0].configHash!==configHash)fail('BUDGET_CONFIGURATION_CONFLICT');
    }catch(e){if(e.code!=='ENOENT')throw e;}
    let previous='0'.repeat(64);
    for(const r of records){const {digest,...data}=r;if(data.previous!==previous||hash(JSON.stringify(data))!==digest)fail('INVALID_BUDGET_JOURNAL');previous=digest;}
    handle=await open(file,'a',0o600);
    async function append(data){const event={...data,previous},digest=hash(JSON.stringify(event));await handle.write(JSON.stringify({...event,digest})+'\n');await handle.sync();records.push({...event,digest});previous=digest;}
    if(!records.length){await append({type:'configuration',configHash});const parent=await open(directory,'r');try{await parent.sync();}finally{await parent.close();}}
    let sequence=Promise.resolve(),broken=false;
    function exclusive(operation){const next=sequence.then(()=>{if(broken)fail('BUDGET_IO_STOP');return operation();});sequence=next.catch(()=>{});return next;}
    const reservations=()=>records.filter(r=>r.type==='reserve');
    function totals(){const rows=reservations();return {attempts:rows.length,reservedMicros:rows.reduce((n,r)=>n+r.micros,0)};}
    function canReserve(micros){const t=totals();if(!Number.isSafeInteger(micros)||micros<=0||micros>33600)fail('INVALID_RESERVATION');if(t.attempts>=configuration.maxCalls||t.reservedMicros+micros>configuration.maxMicros)fail('EVALUATION_BUDGET_STOP');}
    return {totals,records,canReserve,
      seen:caseId=>records.some(r=>['reserve','checked'].includes(r.type)&&r.caseId===caseId),
      async checked(caseId,code){return exclusive(async()=>{if(!/^[PS][0-9]{2}$/.test(caseId)||!/^[A-Z_]+$/.test(code))fail('INVALID_METRICS');await append({type:'checked',caseId,code});});},
      async reserve(caseId,micros){return exclusive(async()=>{if(!/^[PS][0-9]{2}$/.test(caseId))fail('INVALID_CASE');canReserve(micros);const attemptId=randomUUID();try{await append({type:'reserve',attemptId,caseId,micros});}catch(e){broken=true;throw e;}return attemptId;});},
      async finish(attemptId,metrics){return exclusive(async()=>{if(!reservations().some(r=>r.attemptId===attemptId)||records.some(r=>r.type==='finish'&&r.attemptId===attemptId))fail('INVALID_SETTLEMENT');
        // Explicit allowlist: no request/response text, IDs from operational DB, or raw errors.
        const {code,latencyMs,inputTokens,outputTokens,actualMicros,charged,refund}=metrics;
        if(!/^[A-Z_]+$/.test(code)||[latencyMs,inputTokens,outputTokens,actualMicros,charged].some(v=>v!==null&&(!Number.isSafeInteger(v)||v<0)))fail('INVALID_METRICS');
        let safeRefund=null;if(refund){const {requested,applied,forfeited,full}=refund;if([requested,applied,forfeited].some(n=>!Number.isSafeInteger(n)||n<0)||requested!==applied+forfeited||full!==(forfeited===0))fail('INVALID_METRICS');safeRefund={requested,applied,forfeited,full};}
        try{await append({type:'finish',attemptId,code,latencyMs,inputTokens,outputTokens,actualMicros,charged,refund:safeRefund});}catch(e){broken=true;throw e;}});},
      async close(){await sequence;await handle.close();await lock.close();await unlink(lockPath);},
    };
  }catch(e){await handle?.close();await lock.close();await unlink(lockPath);throw e;}
}
