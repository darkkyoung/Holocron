import strict from 'node:assert/strict';
import {loadTestModules} from './test-module-loader.mjs';
import {mvpOutput} from './fixtures/assistant/mvp-output.mjs';
let count=0;const assert=new Proxy(strict,{apply(t,s,a){count++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{count++;return t[k](...a);}:t[k];}});
const loaded=await loadTestModules(['lib/assistant/output-validation.ts','lib/assistant/output-diagnostic.ts','lib/assistant/provider.ts','lib/assistant/provider-profile.ts']);
const validation=loaded.modules['lib/assistant/output-validation.ts'],diag=loaded.modules['lib/assistant/output-diagnostic.ts'],provider=loaded.modules['lib/assistant/provider.ts'];
const profiles=loaded.modules['lib/assistant/provider-profile.ts'],profile=profiles.providerProfile(profiles.ASSISTANT_PROFILE,'planner');
const privateText='SYNTHETIC_PRIVATE_MARKER';
const article={evidenceId:'a',articleId:'a',storyId:'s',title:'제작 계획',summary:'보도에 따르면 2027년 제작 계획이 논의 중이다.',url:'https://example.invalid/a',source:{sourceClass:'media',label:'Synthetic'},orderUncertain:false};
const selected={evidence:[{storyId:'s',evidence:[article],omittedArticleCount:0}],archiveWindow:{},asOf:'2026-10-28'};
const input={mode:'script',includeDraft:false},good=mvpOutput('script',[article]);
function rejected(raw,reason,path){
 let error;try{validation.validateGroundedOutput(raw,input,selected);}catch(e){error=e;}
 assert.equal(error?.code,'INVALID_OUTPUT');assert.deepEqual(error?.diagnostic,diag.outputDiagnostic(reason,path));assert.doesNotMatch(JSON.stringify(error),new RegExp(privateText));
}
const envelope=output=>({status:'completed',model:profile.model,error:null,incomplete_details:null,usage:{input_tokens:1581,output_tokens:1233},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(output),annotations:[]}]}]});
const realFetch=globalThis.fetch;let outbound=0;globalThis.fetch=()=>{outbound++;throw Error('REAL_OUTBOUND_FORBIDDEN');};
try{
 assert.equal(validation.validateGroundedOutput(good,input,selected).status,'ok');
 for(const [mutate,reason,path] of [
  [x=>{x.direction=1;},'SCHEMA_TYPE','$.direction'],
  [x=>{x.direction=' ';},'STRING_LENGTH','$.direction'],
  [x=>{x.status=privateText;},'STRING_ENUM','$.status'],
  [x=>{x.titles=Array(4).fill('title');},'ARRAY_LENGTH','$.titles'],
  [x=>{x[privateText]=privateText;},'OBJECT_KEYS','$'],
  [x=>{x.direction='<script>'+privateText;},'UNSAFE_PROSE','$.direction'],
  [x=>{x.sections[0].evidenceIds=[privateText];},'UNKNOWN_EVIDENCE','$.sections[0].evidenceIds[0]'],
  [x=>{x.sections[0].evidenceIds=['a','a'];},'DUPLICATE_REFERENCE','$.sections[0].evidenceIds'],
  [x=>{x.sections[0].evidenceIds=[];},'MISSING_REFERENCE','$.sections[0].evidenceIds'],
  [x=>{x.direction='공식 발표했다.';},'OFFICIAL_PROMOTION','$.direction'],
  [x=>{x.direction='제작이 확정됐다.';},'UNCERTAINTY_LOST','$.direction'],
  [x=>{x.direction='2028년 제작을 논의 중이다.';},'UNSUPPORTED_NUMBER','$.direction'],
  [x=>{x.status='insufficient_evidence';},'STATUS_CONTENT','$'],
  [x=>{x.draft=[];},'OBJECT_KEYS','$'],
 ]){const raw=structuredClone(good);mutate(raw);rejected(raw,reason,path);}
 assert.deepEqual(diag.outputDiagnostic('UNKNOWN_EVIDENCE','$.sections.'+privateText),{stage:'grounding',reason:'UNKNOWN_EVIDENCE',path:'$'});
 assert.deepEqual(diag.outputDiagnostic(privateText,privateText),{stage:'response_envelope',reason:'RESPONSE_METADATA',path:'$'});
 let observed=0;diag.observeOutput(d=>{observed++;assert(Object.isFrozen(d));throw Error(privateText);},diag.outputDiagnostic('OUTPUT_JSON'));diag.observeOutput(async()=>{throw Error(privateText);},diag.outputDiagnostic('OUTPUT_JSON'));assert.equal(observed,1);
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

 assert.equal(outbound,0);console.log(`Current output diagnostics: ${count} assertions PASS; content-free classification and Provider envelope errors. Refund/replay/D1 covered by test-assistant-generation. Historical campaigns not run.`);
}finally{globalThis.fetch=realFetch;await loaded.dispose();}
