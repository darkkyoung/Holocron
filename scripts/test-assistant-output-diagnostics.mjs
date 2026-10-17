import strict from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadTestModules} from './test-module-loader.mjs';
import {localRuntime,audit} from './assistant-eval/local-runtime.mjs';
import {loadCorpus} from './assistant-eval/corpus.mjs';
import {evaluateCase} from './assistant-eval/evaluate.mjs';
import {mockResponse} from './assistant-eval/transport.mjs';
import {openBudget,PROFILE,validateApproval} from './assistant-eval/budget.mjs';
let count=0;const assert=new Proxy(strict,{apply(t,s,a){count++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{count++;return t[k](...a);}:t[k];}});
const loaded=await loadTestModules(['lib/assistant/output-validation.ts','lib/assistant/output-schema.ts','lib/assistant/output-diagnostic.ts','lib/assistant/provider.ts','lib/assistant/provider-profile.ts']);
const validation=loaded.modules['lib/assistant/output-validation.ts'],schema=loaded.modules['lib/assistant/output-schema.ts'],diag=loaded.modules['lib/assistant/output-diagnostic.ts'],provider=loaded.modules['lib/assistant/provider.ts'];
const profile=loaded.modules['lib/assistant/provider-profile.ts'].providerProfile(PROFILE,'draft');
const privateText='SYNTHETIC_PRIVATE_MARKER';
const article={evidenceId:'a',articleId:'a',storyId:'s',title:'탐사 계획',summary:'보도에 따르면 2027년 탐사 계획이 논의 중이다.',url:'https://example.invalid/a',source:{sourceClass:'media',label:'Synthetic'},orderUncertain:false};
const selected={request:{mode:'script',query:'탐사',filters:{}},evidence:[{storyId:'s',evidence:[article],omittedArticleCount:0}],archiveWindow:{},asOf:'2026-10-17'};
const input={mode:'script',includeDraft:true};
const fact={factId:'f1',text:article.summary,evidenceIds:['a'],certainty:'attributed_report',supports:[{evidenceId:'a',field:'summary',span:article.summary}]};
const good={status:'ok',facts:[fact],caveats:[],outline:[{heading:'소식 소개',factIds:['f1'],creativeNote:'창작 연결'}],draft:[{kind:'fact',text:fact.text,factIds:['f1']},{kind:'creative',text:'여러분은 어떻게 생각하시나요?',factIds:[]}]};
function rejected(raw,reason,path,selection=selected,request=input){
 let error;try{validation.validateGroundedOutput(raw,request,selection);}catch(e){error=e;}
 assert.equal(error?.code,'INVALID_OUTPUT');assert.equal(error?.status,502);assert.deepEqual(error?.diagnostic,diag.outputDiagnostic(reason,path));
 assert.doesNotMatch(JSON.stringify(error),new RegExp(privateText));return error;
}
const envelope=output=>({status:'completed',model:profile.model,error:null,incomplete_details:null,usage:{input_tokens:1581,output_tokens:1233},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(output),annotations:[]}]}]});
let runtime;const directory=await mkdtemp(join(tmpdir(),'holocron-diagnostics-'));
const realFetch=globalThis.fetch;let outbound=0;globalThis.fetch=()=>{outbound++;throw new Error('REAL_OUTBOUND_FORBIDDEN');};
try{
 assert.equal(validation.validateGroundedOutput(good,input,selected).status,'ok');
 const planner={...good,draft:[]};assert.equal(validation.validateGroundedOutput(planner,{...input,includeDraft:false},selected).status,'ok');
 const {factId: _factId,...qaFact}=fact;void _factId;
 assert.equal(validation.validateGroundedOutput({status:'ok',answer:[qaFact],limitations:[]},{mode:'qa'},selected).status,'ok');
 const sparse=structuredClone(good);sparse.facts=Array(1);rejected(sparse,'SCHEMA_TYPE','$.facts[0]');
 const mutations=[
  [x=>{x.facts[0].text=1;},'SCHEMA_TYPE','$.facts[0].text'],
  [x=>{x.facts[0].text=' ';},'STRING_LENGTH','$.facts[0].text'],
  [x=>{x.facts[0].text='a'.repeat(601);},'STRING_LENGTH','$.facts[0].text'],
  [x=>{x.facts[0].certainty=privateText;},'STRING_ENUM','$.facts[0].certainty'],
  [x=>{x.facts=Array(17).fill(fact);},'ARRAY_LENGTH','$.facts'],
  [x=>{x.facts[0][privateText]=privateText;},'OBJECT_KEYS','$.facts[0]'],
  [x=>{delete x.facts[0].text;},'OBJECT_KEYS','$.facts[0]'],
  [x=>{x.facts[0].text='<script>'+privateText;},'UNSAFE_PROSE','$.facts[0].text'],
  [x=>{x.facts[0].evidenceIds=[privateText];},'UNKNOWN_EVIDENCE','$.facts[0].evidenceIds[0]'],
  [x=>{x.facts[0].evidenceIds=['a','a'];},'DUPLICATE_REFERENCE','$.facts[0].evidenceIds'],
  [x=>{x.facts[0].evidenceIds=[];},'MISSING_REFERENCE','$.facts[0].evidenceIds'],
  [x=>{x.facts[0].supports=[];},'MISSING_SUPPORT','$.facts[0].supports'],
  [x=>{x.facts[0].supports[0].evidenceId=privateText;},'SUPPORT_REFERENCE','$.facts[0].supports[0].evidenceId'],
  [x=>{x.facts[0].supports[0].span=privateText;},'SUPPORT_SPAN','$.facts[0].supports[0].span'],
  [x=>{x.facts[0].certainty='explicit_announcement';},'OFFICIAL_PROMOTION','$.facts[0].certainty'],
  [x=>{x.facts[0].certainty='explicit_speculation';},'SPECULATION_SUPPORT','$.facts[0].certainty'],
  [x=>{x.facts[0].text='2027년 탐사가 확정됐다.';},'UNCERTAINTY_LOST','$.facts[0].text'],
  [x=>{x.facts[0].text='2028년 탐사가 논의 중이다.';},'UNSUPPORTED_NUMBER','$.facts[0].text'],
  [x=>{x.outline[0].factIds=[privateText];},'UNKNOWN_FACT','$.outline[0].factIds[0]'],
  [x=>{x.draft[0].factIds=[privateText];},'UNKNOWN_FACT','$.draft[0].factIds[0]'],
  [x=>{x.draft[0].text+=' ';},'DRAFT_FACT_TEXT','$.draft[0].text'],
  [x=>{x.draft[0].text='보도상 탐사 계획이 논의 중입니다.';},'DRAFT_FACT_TEXT','$.draft[0].text'],
  [x=>{x.draft[1].text='2028년의 이야기를 상상해 볼까요?';},'CREATIVE_BOUNDARY','$.draft[1]'],
  [x=>{x.draft[1].factIds=['f1'];},'CREATIVE_BOUNDARY','$.draft[1]'],
  [x=>{x.draft=[];},'DRAFT_PRESENCE','$.draft'],
  [x=>{x.status='insufficient_evidence';},'STATUS_CONTENT','$'],
 ];
 for(const [mutate,reason,path] of mutations){const raw=structuredClone(good);mutate(raw);rejected(raw,reason,path);}
 const unsafe=structuredClone(selected);unsafe.evidence[0].evidence[0].url='javascript:'+privateText;rejected(good,'UNSAFE_CITATION','$.facts[0].evidenceIds[0]',unsafe);
 const missing=structuredClone(selected);missing.evidence[0].evidence.push({...article,evidenceId:'b'});const uncovered=structuredClone(good);uncovered.facts[0].evidenceIds.push('b');rejected(uncovered,'UNCOVERED_EVIDENCE','$.facts[0].supports',missing);
 const dateOnly=structuredClone(selected);dateOnly.evidence[0].evidence[0].orderUncertain=true;const earliest=structuredClone(good);earliest.facts[0].text='최초 '+fact.text;rejected(earliest,'DATE_ORDER','$.facts[0].text',dateOnly);
 // Synthetic over-rejection: "First" inside a title is mistaken for source ordering.
 // Record, do not relax this existing lexical rule or infer it caused the live P07.
 const named=structuredClone(dateOnly);named.evidence[0].evidence[0].summary='First Jedi 소식이 보도됐다.';
 const namedRaw=structuredClone(good);namedRaw.facts[0].text=named.evidence[0].evidence[0].summary;namedRaw.facts[0].supports[0].span=namedRaw.facts[0].text;namedRaw.draft[0].text=namedRaw.facts[0].text;
 rejected(namedRaw,'DATE_ORDER','$.facts[0].text',named);
 const combined=structuredClone(good);combined.facts.push({...fact,factId:'f2'});combined.draft[0]={kind:'fact',factIds:['f1','f2'],text:fact.text+' '+fact.text};assert.equal(validation.validateGroundedOutput(combined,input,selected).status,'ok');combined.draft[0].text= fact.text+'\n'+fact.text;rejected(combined,'DRAFT_FACT_TEXT','$.draft[0].text');
 // JSON schema accepts paraphrase structurally; prompt and semantic validator explicitly prohibit it.
 const paraphrase=structuredClone(good);paraphrase.draft[0].text='다른 문장';assert.doesNotThrow(()=>schema.validateShape(paraphrase,schema.SCRIPT_SCHEMA));rejected(paraphrase,'DRAFT_FACT_TEXT','$.draft[0].text');
 assert.deepEqual(diag.outputDiagnostic('SUPPORT_SPAN','$.facts.'+privateText),{stage:'grounding',reason:'SUPPORT_SPAN',path:'$'});
 assert.deepEqual(diag.outputDiagnostic(privateText,privateText),{stage:'response_envelope',reason:'RESPONSE_METADATA',path:'$'});
 let observed=0;diag.observeOutput(d=>{observed++;assert(Object.isFrozen(d));throw new Error(privateText);},diag.outputDiagnostic('OUTPUT_JSON'));diag.observeOutput(async()=>{throw new Error(privateText);},diag.outputDiagnostic('OUTPUT_JSON'));assert.equal(observed,1);
 const transports=[
  ['CONTENT_TYPE',()=>new Response(privateText)],
  ['MISSING_BODY',()=>new Response(null,{headers:{'Content-Type':'application/json'}})],
  ['ENVELOPE_JSON',()=>new Response('{'+privateText,{headers:{'Content-Type':'application/json'}})],
  ['ENVELOPE_OBJECT',()=>Response.json([])],
  ['BODY_READ_OR_ENCODING',()=>new Response(new Uint8Array([0xff]),{headers:{'Content-Type':'application/json'}})],
  ['RESPONSE_STATUS',()=>Response.json({...envelope(good),status:privateText})],
  ['RESPONSE_METADATA',()=>Response.json({...envelope(good),model:privateText})],
  ['OUTPUT_COUNT',()=>Response.json({...envelope(good),output:[]})],
  ['MESSAGE_SHAPE',()=>{const p=envelope(good);p.output[0].role=privateText;return Response.json(p);}],
  ['INVALID_USAGE',()=>Response.json({...envelope(good),usage:{input_tokens:privateText}})],
  ['OUTPUT_JSON',()=>{const p=envelope(good);p.output[0].content[0].text='{'+privateText;return Response.json(p);}],
 ];
 for(const [reason,fetcher] of transports){let calls=0;await assert.rejects(()=>provider.callResponses('{}',profile,'synthetic-key',new AbortController().signal,()=>{calls++;return fetcher();}),e=>{assert.equal(e.code,'INVALID_OUTPUT');assert.deepEqual(e.diagnostic,diag.outputDiagnostic(reason));assert.doesNotMatch(JSON.stringify(e),new RegExp(privateText));return true;});assert.equal(calls,1);}
 // Full unchanged service + real D1: diagnosis cannot leak into public response or alter refund.
 runtime=await localRuntime();const {corpus,cases,hashes}=await loadCorpus();let sequence=20;
 const base=cases.find(c=>c.id==='S12'),config={profile:PROFILE,...hashes,maxCalls:40,maxMicros:2000000};
 for(const mode of ['qa','planner','draft']){
  const c={...base,id:'S'+sequence++,mode:mode==='qa'?'qa':'script',instructions:'',includeDraft:mode==='draft'};
  const r=await evaluateCase(runtime,corpus,c);assert.equal(r.code,'OK');assert.equal(r.diagnostic,null);assert.equal(r.charged,{qa:5,planner:7,draft:15}[mode]);assert.equal(r.refund,null);
 }
 const p07=await evaluateCase(runtime,corpus,cases.find(c=>c.id==='P07'));assert.equal(p07.code,'OK');assert.equal(p07.diagnostic,null); // Synthetic P07 response, NOT the missing live output.
 const failures=[
  ['ENVELOPE_JSON',()=>new Response('{'+privateText,{headers:{'Content-Type':'application/json'}})],
  ['OUTPUT_JSON',async body=>{const p=await mockResponse(body).json();p.output[0].content[0].text='{'+privateText;return Response.json(p);}],
  ...[['OBJECT_KEYS',v=>{v[privateText]=privateText;}],['SUPPORT_SPAN',v=>{v.facts[0].supports[0].span=privateText;}],['UNKNOWN_EVIDENCE',v=>{v.facts[0].evidenceIds=[privateText];}],['UNKNOWN_FACT',v=>{v.draft[0].factIds=[privateText];}],['DRAFT_FACT_TEXT',v=>{v.draft[0].text+=' ';}],['CREATIVE_BOUNDARY',v=>{v.draft[1].text='2028년 발표했다.';}]].map(([reason,mutate])=>[reason,async body=>{const p=await mockResponse(body).json(),v=JSON.parse(p.output[0].content[0].text);mutate(v);p.output[0].content[0].text=JSON.stringify(v);return Response.json(p);}]),
 ];
 for(const [reason,transport] of failures){
  let publicResult;const original=runtime.m('assistant/generate-http');const wrapped={...runtime,m:name=>name==='assistant/generate-http'?{...original,handleGenerate:async(req,deps)=>{const response=await original.handleGenerate(req,deps);if(!publicResult)publicResult=await response.clone().json();return response;}}:runtime.m(name)};
  const r=await evaluateCase(wrapped,corpus,{...base,id:'S'+sequence++},{mockFetch:transport});
  assert.equal(r.code,'INVALID_OUTPUT');assert.equal(r.providerAttempts,1);assert.equal(r.realOutbound,0);assert.equal(r.diagnostic.reason,reason);assert.equal(r.charged,15);assert.deepEqual(r.refund,{requested:15,applied:15,forfeited:0,full:true});assert.equal(r.settlement,'failed');
  assert.equal(publicResult.error.code,'INVALID_OUTPUT');assert.deepEqual(publicResult.credit.refund,r.refund);
  assert.doesNotMatch(JSON.stringify(publicResult),/diagnostic|stage|reason|path|SYNTHETIC_PRIVATE_MARKER/);assert.doesNotMatch(JSON.stringify(r),new RegExp(privateText));
 }
 // Observer absence and both sync/async failures leave identical public status and settlement.
 for(const observer of [undefined,()=>{throw new Error(privateText);},async()=>{throw new Error(privateText);}]){
  const original=runtime.m('assistant/generate-http');const wrapped={...runtime,m:name=>name==='assistant/generate-http'?{handleGenerate:(req,deps)=>original.handleGenerate(req,{...deps,onOutputDiagnostic:observer})}:runtime.m(name)};
  const r=await evaluateCase(wrapped,corpus,{...base,id:'S'+sequence++},{mockFetch:failures[0][1]});assert.equal(r.code,'INVALID_OUTPUT');assert.equal(r.refund.applied,15);assert.equal(r.diagnostic,null);
 }
 const ledger=await audit(runtime,corpus.capturedAt);assert.equal(ledger.operationalOutbound,0);assert.equal(ledger.ledgerEntries,41);assert.equal(outbound,0);
 // Approval and journal from the old code remain incompatible. Never auto-rebind budgets.
 const oldHash='3033f845d991bbdde172d0ee01c233dfe723d4b54d5bb7589ec789f19804037c';assert.notEqual(hashes.pipelineHash,oldHash);
 const b=await openBudget(directory,{...config,pipelineHash:oldHash});await b.reserve('P01',19200);await b.reserve('P05',33600);await b.reserve('P07',33600);await b.close();const before=await readFile(join(directory,'budget.jsonl'),'utf8');
 await assert.rejects(()=>openBudget(directory,config),/BUDGET_CONFIGURATION_CONFLICT/);assert.equal(await readFile(join(directory,'budget.jsonl'),'utf8'),before);
 const old=await openBudget(directory,{...config,pipelineHash:oldHash});assert.deepEqual(old.totals(),{attempts:3,reservedMicros:86400});await old.close();
 assert.throws(()=>validateApproval({approvalId:'eval-synthetic',model:profile.model,...config,pipelineHash:oldHash,expiresAt:new Date(Date.now()+60000).toISOString(),stateDir:directory,retainValidatedOutputsHours:24},hashes),/INVALID_APPROVAL/);
 console.log(`Assistant output diagnostics: ${count} assertions PASS; synthetic classification, existing rejection/refund semantics, real local D1 audit, public redaction, budget conflict preserved. Real outbound ZERO; live P07 cause NOT DETERMINED.`);
}finally{globalThis.fetch=realFetch;await runtime?.close();await loaded.dispose();await rm(directory,{recursive:true,force:true});}
