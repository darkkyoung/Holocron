import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadMvp} from './fixture.mjs';
import {inspectPrior,PROPOSAL} from './prior.mjs';
import {localRuntime,audit} from '../assistant-eval/local-runtime.mjs';
import {evaluateCase} from '../assistant-eval/evaluate.mjs';
import {openBudget,fail,MODEL,PROFILE} from '../assistant-eval/budget.mjs';
import {evaluationFailureReport} from '../assistant-eval/receipt-diagnostic.mjs';
export async function run(args=process.argv.slice(2)){
  // Preparation only: no key reads, live transport, user-selected state or approval creation.
  if(args.includes('--live'))fail('MVP_LIVE_NOT_AUTHORIZED_OR_IMPLEMENTED');
  const inspect=args.length===2&&args[0]==='--inspect-prior';
  if(!inspect&&(args.length>1||args.length===1&&!['--dry-run','--mock'].includes(args[0])))fail('INVALID_ARGUMENTS');
  const loaded=await loadMvp();
  if(inspect){try{return await inspectPrior(args[1],loaded.corpus);}catch(error){if(error.code==='ENOENT')fail('REQUIRED_PRIOR_STATE_MISSING');throw error;}}
  const mode=args[0]==='--mock'?'mock':'dry-run',directory=await mkdtemp(join(tmpdir(),'holocron-mvp-preparation-'));
  let runtime,budget;
  try{
    budget=await openBudget(directory,{mode,profile:PROFILE,...loaded.hashes,maxCalls:6,maxMicros:200000});
    runtime=await localRuntime({directory});
    const results=[];
    for(const c of [...loaded.cases].sort((a,b)=>Number(a.stage!=='control')-Number(b.stage!=='control'))){
      // Controls need the real HTTP rejection boundary even in a dry-run (mock transport only).
      const result=await evaluateCase(runtime,loaded.corpus,c,{mode:c.stage==='control'?'mock':mode,budget});
      results.push({...result,stage:c.stage});
      if(!result.pass)break;
    }
    const ledger=await audit(runtime,loaded.corpus.capturedAt);
    return {status:results.every(r=>r.pass)?'PREPARATION_PASS':'STOP_UNEXPECTED_RESULT',mode,model:MODEL,profile:PROFILE,...loaded.hashes,results,totals:budget.totals(),ledger,proposal:PROPOSAL,
      realProviderCalls:0,semanticQuality:'NOT_TESTED',live:'BLOCKED_PENDING_NEW_APPROVAL_AND_CARRY_FORWARD_ENFORCEMENT',next:'Owner reviews P41/P44 after separately authorized live smoke; never automatic rest.'};
  }finally{await runtime?.close();await budget?.close();await rm(directory,{recursive:true,force:true});}
}
if(import.meta.url===new URL(process.argv[1],'file:').href){
  try{const report=await run();console.log(JSON.stringify(report,null,2));if(report.status==='STOP_UNEXPECTED_RESULT')process.exitCode=1;}
  catch(error){console.error(JSON.stringify(evaluationFailureReport(error)));process.exitCode=1;}
}
