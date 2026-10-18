import {evaluationFailureReport} from './receipt-diagnostic.mjs';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {inspectRevision,applyRevision,openDiagnostic,TO} from './revision.mjs';
import {localRuntime,audit} from './local-runtime.mjs';
import {evaluateCase} from './evaluate.mjs';
import {purgeOutputs} from './run.mjs';
import {privateDirectory,fail} from './budget.mjs';

export function revisionOptions(args){
  const action=args.shift();if(!['inspect','apply','p07'].includes(action))fail('INVALID_REVISION_COMMAND');
  const o={action};
  while(args.length){
    const key=args.shift();
    if(['--approval','--plan-token'].includes(key)){if(o[key]||!args.length||args[0].startsWith('--'))fail('INVALID_ARGUMENTS');o[key]=args.shift();}
    else if(key==='--confirm'||key==='--live'){if(o[key])fail('INVALID_ARGUMENTS');o[key]=true;}
    else fail('INVALID_ARGUMENTS');
  }
  if(!o['--approval']||(action==='apply'?(!o['--confirm']||!o['--plan-token']||o['--live']):o['--confirm']||o['--plan-token'])||(action==='p07'?!o['--live']:o['--live']))fail('INVALID_ARGUMENTS');
  return o;
}
/** Only the transport is injected by local tests. CLI always uses native fetch.
 * No case, repeat, stage, model, expiry, budget or state-directory override exists. */
export async function diagnosticP07(path,{environment=process.env,transport=globalThis.fetch}={}){
  const context=await openDiagnostic(path);let runtime;
  const {input,budget,transition}=context,configuration=input.approval;
  try{
    const key=environment.HOLOCRON_EVAL_OPENAI_API_KEY;
    if(!key||/[\s\u0000-\u001f]/.test(key))fail('DEDICATED_EVALUATION_KEY_REQUIRED');
    await purgeOutputs(configuration.stateDir);
    runtime=await localRuntime({directory:configuration.stateDir,requireExisting:true});
    const result=await evaluateCase(runtime,input.corpus,input.cases.find(c=>c.id==='P07'),{mode:'live',budget,liveKey:key,liveFetch:(url,init)=>{if(Date.now()>=Date.parse(configuration.expiresAt))fail('APPROVAL_EXPIRED');return transport(url,init);},
      onResult:async(id,output)=>{
        const folder=join(configuration.stateDir,'review');await privateDirectory(folder);
        await writeFile(join(folder,`${id}-${Date.now()}.json`),JSON.stringify({caseId:id,pipelineHash:TO,revision:transition.digest,expiresAt:new Date(Date.now()+86400000).toISOString(),result:output}),{flag:'wx',mode:0o600});
      }});
    const ledger=await audit(runtime,input.corpus.capturedAt);
    return {status:result.pass?'STOP_REVIEW_DIAGNOSTIC_RESULT':'STOP_UNEXPECTED_RESULT',pipelineHash:TO,revision:transition.digest,caseId:'P07',
      result,outputDiagnostic:result.diagnostic,totals:budget.totals(),ledger,semanticReview:'NOT_REVIEWED',next:'STOP_NO_REST_OR_RETRY'};
  }finally{await runtime?.close();await budget.close();}
}
export async function revisionCommand(args=process.argv.slice(2)){
  const o=revisionOptions([...args]);
  if(o.action==='inspect')return (await inspectRevision(o['--approval'])).report;
  if(o.action==='apply')return applyRevision(o['--approval'],o['--plan-token']);
  return diagnosticP07(o['--approval']);
}
if(import.meta.url===new URL(process.argv[1],'file:').href){
  try{const report=await revisionCommand();console.log(JSON.stringify(report,null,2));if(['BLOCKED','STOP_UNEXPECTED_RESULT'].includes(report.status))process.exitCode=1;}
  catch(error){console.error(JSON.stringify(evaluationFailureReport(error)));process.exitCode=1;}
}
