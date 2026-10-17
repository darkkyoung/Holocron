import {readFile,mkdtemp,rm,writeFile,readdir,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadCorpus} from './corpus.mjs';
import {localRuntime,audit} from './local-runtime.mjs';
import {evaluateCase} from './evaluate.mjs';
import {openBudget,validateApproval,privateDirectory,PROFILE,MODEL,fail} from './budget.mjs';
const SMOKE=['P01','P05','P07'];
export function options(args){
  const out={mode:'dry-run',stage:'smoke'};let modeSet=false;
  while(args.length){const key=args.shift();if(['--mock','--live','--dry-run'].includes(key)){if(modeSet)fail('CONFLICTING_MODE');modeSet=true;out.mode=key.slice(2);}
    else if(['--approval','--state','--stage','--case'].includes(key)){const name=key.slice(2);if(!args.length||args[0].startsWith('--')||Object.hasOwn(out,name)&&name!=='stage')fail('INVALID_ARGUMENTS');out[name]=args.shift();}
    else if(key==='--smoke-reviewed'||key==='--repeat'||key==='--purge')out[key.slice(2)]=true;else fail('INVALID_ARGUMENTS');}
  if(!['smoke','rest'].includes(out.stage)||out.repeat&&!out.case||out.mode==='live'&&out.state)fail('INVALID_ARGUMENTS');return out;
}
export async function purgeOutputs(directory,now=Date.now()){
  await privateDirectory(directory);const folder=join(directory,'review');
  try{for(const name of await readdir(folder)){if(!/^[PS][0-9]{2}-[0-9]+\.json$/.test(name))fail('UNKNOWN_REVIEW_FILE');const file=join(folder,name);if(now-(await stat(file)).mtimeMs>=24*3600000)await rm(file);}}catch(e){if(e.code!=='ENOENT')throw e;}
}
export async function run(args=process.argv.slice(2),environment=process.env){
  const o=options([...args]),{corpus,cases,hashes}=await loadCorpus();let configuration,temporary=false,directory;
  if(o.mode==='live'){
    if(!o.approval)fail('LIVE_AUTHORIZATION_REQUIRED');
    configuration=validateApproval(JSON.parse(await readFile(o.approval,'utf8')),hashes);
    if(!environment.HOLOCRON_EVAL_OPENAI_API_KEY||/[\s\u0000-\u001f]/.test(environment.HOLOCRON_EVAL_OPENAI_API_KEY))fail('DEDICATED_EVALUATION_KEY_REQUIRED');
    directory=configuration.stateDir;
  }else{
    directory=o.state??await mkdtemp(join(tmpdir(),'holocron-evaluation-'));temporary=!o.state;
    configuration={mode:o.mode,profile:PROFILE,...hashes,maxCalls:40,maxMicros:2000000};
  }
  await privateDirectory(directory);await purgeOutputs(directory);
  if(o.purge)return {status:'EXPIRED_REVIEW_FILES_PURGED'};
  const budget=await openBudget(directory,configuration);let runtime;
  try{
    let selected=cases;
    if(o.mode==='live'){
      if(o.stage==='rest'){
        if(!o['smoke-reviewed']||SMOKE.some(id=>!budget.records.some(r=>r.type==='reserve'&&r.caseId===id&&budget.records.some(f=>f.type==='finish'&&f.attemptId===r.attemptId&&f.code==='OK'))))fail('SMOKE_REVIEW_REQUIRED');
        selected=cases.filter(c=>!SMOKE.includes(c.id));
      }else selected=cases.filter(c=>SMOKE.includes(c.id));
    }
    // Exercise free/pre-call controls before exhausting the shared paid-attempt cap.
    selected=[...selected].sort((a,b)=>Number(a.expected==='generate')-Number(b.expected==='generate'));
    if(o.case){selected=selected.filter(c=>c.id===o.case);if(!selected.length)fail('UNKNOWN_CASE_OR_STAGE');}
    runtime=await localRuntime({directory,requireExisting:budget.totals().attempts>0});
    if(!budget.totals().attempts&&await runtime.db.prepare("SELECT request_id FROM assistant_admissions WHERE action!='retrieve' LIMIT 1").first())fail('MISSING_BUDGET_HISTORY');
    // Recover only local expired obligations. Never re-dispatch a provider after ambiguity.
    const pending=(await runtime.db.prepare("SELECT request_id FROM assistant_admissions WHERE state IN ('started','refund_pending') AND action!='retrieve'").all()).results;
    for(const row of pending)await runtime.m('assistant/admission').recoverExpiredGeneration(runtime.db,row.request_id,Date.parse(corpus.capturedAt)+3600000);
    const results=[];
    for(const c of selected){
      if(o.mode==='live')validateApproval(configuration,hashes);
      if(budget.seen(c.id)&&!o.repeat)continue;
      const result=await evaluateCase(runtime,corpus,c,{mode:o.mode,budget,liveKey:o.mode==='live'?environment.HOLOCRON_EVAL_OPENAI_API_KEY:undefined,
        onResult:configuration.retainValidatedOutputsHours===24?async(id,output)=>{const folder=join(directory,'review');await privateDirectory(folder);await writeFile(join(folder,`${id}-${Date.now()}.json`),JSON.stringify({caseId:id,expiresAt:new Date(Date.now()+86400000).toISOString(),result:output}),{flag:'wx',mode:0o600});}:undefined});
      results.push(result);
      if(o.mode!=='dry-run'&&!result.providerAttempts&&result.pass)await budget.checked(c.id,result.code.toUpperCase());
      if(!result.pass)break; // Stop on the first unexpected result; no automated retry.
    }
    const ledger=await audit(runtime,corpus.capturedAt);
    return {mode:o.mode,profile:PROFILE,model:MODEL,...hashes,results,totals:budget.totals(),ledger,realProviderCalls:results.reduce((n,r)=>n+r.realOutbound,0),semanticQuality:'NOT_TESTED',status:!results.length?'NO_NEW_CASES':results.every(r=>r.pass)?'HARNESS_PASS':'STOP_UNEXPECTED_RESULT',...(o.mode==='live'?{next:o.stage==='smoke'?'REVIEW_SMOKE_BEFORE_REST':'REVIEW_ALL_OUTPUTS'}:{})};
  }finally{await runtime?.close();await budget.close();if(temporary)await rm(directory,{recursive:true,force:true});}
}
// Importable for tests; CLI never prints raw exceptions (which may include transport data).
if(import.meta.url===new URL(process.argv[1],'file:').href){
  try{const report=await run();console.log(JSON.stringify(report,null,2));if(report.status==='STOP_UNEXPECTED_RESULT')process.exitCode=1;}
  catch(error){console.error(JSON.stringify({status:'STOP',code:/^[A-Z_]+$/.test(error.message)?error.message:'EVALUATION_FAILED'}));process.exitCode=1;}
}
