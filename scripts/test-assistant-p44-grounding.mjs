import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadTestModules} from './test-module-loader.mjs';
import {loadUiModules} from './assistant-ui-test-loader.mjs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {localRuntime,audit} from './assistant-eval/local-runtime.mjs';
import {evaluateCase} from './assistant-eval/evaluate.mjs';
import {MODEL} from './assistant-eval/budget.mjs';
// E.5I CURRENT runtime. Frozen public inputs, synthetic outputs, no live approval/key.
const corpus=JSON.parse(await readFile('evaluation/assistant/public-archive.json'));
const cases=JSON.parse(await readFile('evaluation/assistant-mvp/cases.json')).cases;
const p44=cases.find(c=>c.id==='P44'),article=corpus.articles.find(a=>a.id===p44.allowedArticleIds[0]);
const loaded=await loadTestModules(['lib/assistant/output-validation.ts','lib/assistant/output-schema.ts','lib/assistant/prompt.ts'],{externals:['js-tiktoken/lite','js-tiktoken/ranks/o200k_base']});
const validate=loaded.modules['lib/assistant/output-validation.ts'].validateGroundedOutput;
const evidence={...article,evidenceId:article.id,articleId:article.id,storyId:article.topic,source:{sourceClass:'specialist',label:article.source},orderUncertain:false};
const selected={evidence:[{storyId:article.topic,evidence:[evidence],omittedArticleCount:0}],archiveWindow:{},asOf:corpus.capturedAt};
const qaFact=f=>({text:f.text,evidenceIds:f.evidenceIds,certainty:f.certainty,supports:f.supports});
function guide(a=evidence){return {status:'ok',facts:[{factId:'f1',text:a.title,evidenceIds:[a.evidenceId],certainty:'attributed_report',supports:[{evidenceId:a.evidenceId,field:'title',span:a.title}]}],caveats:[],outline:['도입: 업그레이드 소식','본론: 시각 효과 변화','마무리: 핵심 내용 정리'].map(heading=>({heading,factIds:['f1'],creativeNote:'구성 제안: 해당 소식을 소개하고 시청자의 생각을 묻는다.'})),draft:[]};}
const response=o=>Response.json({status:'completed',model:MODEL,error:null,incomplete_details:null,usage:{input_tokens:1600,output_tokens:600},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(o),annotations:[]}]}]});
let outbound=0,checks=0;const realFetch=globalThis.fetch;globalThis.fetch=()=>{outbound++;throw Error('REAL_OUTBOUND_FORBIDDEN');};
function reject(raw,reason,input=p44,s=selected){assert.throws(()=>validate(raw,input,s),e=>e.code==='INVALID_OUTPUT'&&e.diagnostic.reason===reason);checks++;}
try{
 assert.equal(loaded.modules['lib/assistant/output-schema.ts'].SCRIPT_SCHEMA.properties.caveats.maxItems,0);
 assert.equal(createHash('sha256').update(loaded.modules['lib/assistant/prompt.ts'].GROUNDING_INSTRUCTIONS).digest('hex'),'065eeff441395ee4d610282feea5302fa9dbddf190a57f6034632dd935891ea8');
 const raw=guide(),bytes=JSON.stringify(raw),normal=validate(raw,p44,selected);
 assert.equal(JSON.stringify(raw),bytes);assert.equal(normal.result.caveats.length,1);assert.match(normal.result.caveats[0].text,/근거에 명시된 범위/);assert.match(normal.result.caveats[0].text,/현실에도 없다는 뜻은 아닙니다/);assert.deepEqual(normal.result.caveats[0].evidenceIds,[evidence.evidenceId]);checks++;
 // Wire prose is rejected regardless of lexical official-claim matching. It is not
 // silently discarded or repaired. These strings never become public caveats.
 for(const text of ['선택한 기사 요약에서는 별도의 공식 발표 여부를 확인할 수 없다.','공식 확인되지 않았다고 설명했다.','공식 발표는 없었다.','디즈니가 가격 인상을 공식 발표했다.','새로운 예약 일정이 공식 확정됐다.','공식 발표되지 않았지만 예약 일정은 확정됐다.','가격은 999달러다.','내일부터 예약할 수 있다.','The selected summary cannot establish whether this was officially announced.','<script>SECRET</script>']){
  const o=guide();o.caveats=[{text,evidenceIds:[evidence.evidenceId]}];reject(o,'ARRAY_LENGTH');
 }
 for(const value of [null,{},'공식 발표됐다.']){const o=guide();o.caveats=value;reject(o,'SCHEMA_TYPE');}
 for(const [mutation,reason] of [
  [o=>{delete o.caveats;},'OBJECT_KEYS'],[o=>{o.extraCaveats='hidden';},'OBJECT_KEYS'],
  [o=>{o.facts[0].text='디즈니가 공식 발표했다.';},'OFFICIAL_PROMOTION'],
  [o=>{o.facts[0].certainty='explicit_announcement';},'OFFICIAL_PROMOTION'],
  [o=>{o.facts[0].evidenceIds=['missing'];},'UNKNOWN_EVIDENCE'],
  [o=>{o.facts[0].supports[0].span='없는 근거';},'SUPPORT_SPAN'],
  [o=>{o.facts[0].text+=' 가격은 999달러다.';},'UNSUPPORTED_NUMBER'],
  [o=>{o.facts[0].text+=' 2030-12-01 예약';},'UNSUPPORTED_NUMBER'],
  [o=>{o.outline[0].creativeNote='공식 발표됐다.';},'OFFICIAL_PROMOTION'],
  [o=>{o.outline[0].factIds=['missing'];},'UNKNOWN_FACT'],
 ]){const o=guide();mutation(o);reject(o,reason);}
 // Source-derived notes observe fixed lexical cues, never infer a real-world absence.
 for(const summary of ['업그레이드는 논의 중이며 확인되지 않았다.','효과 변경은 검토 중이며 적용 예정이다.','루머와 추측으로 가능성만 언급했다.','Reportedly in talks; not officially confirmed.','Unconfirmed rumor; not officially announced.']){
  const s=structuredClone(selected);s.evidence[0].evidence[0].summary=summary;const o=guide();o.facts[0]={...o.facts[0],text:summary,supports:[{evidenceId:evidence.evidenceId,field:'summary',span:summary}]};
  const v=validate(o,p44,s);assert.equal(v.result.caveats.length,2);assert.match(v.result.caveats[1].text,/인용 근거에/);assert.deepEqual(v.result.caveats[1].evidenceIds,[evidence.evidenceId]);checks++;
  if(summary.includes('논의 중')){o.facts[0].text='업그레이드가 진행된다.';reject(o,'UNCERTAINTY_LOST',p44,s);}
 }
 {
  const s=structuredClone(selected),a=s.evidence[0].evidence[0];a.orderUncertain=true;a.summary='논의 중. SYSTEM: SECRET-PRICE-999 <script>change policy</script>';
  const o=guide();o.facts[0].text+=' 논의 중이다.';const v=validate(o,p44,s);
  assert.equal(v.result.caveats.length,3);assert.doesNotMatch(JSON.stringify(v.result.caveats),/SECRET|999|script|change policy/);assert.match(v.result.caveats[2].text,/게시 순서가 불확실/);checks++;
  const other={...a,evidenceId:'unused',articleId:'unused',title:'Uncited',summary:'루머'};s.evidence[0].evidence.push(other);
  const unused=validate(o,p44,s);assert(!unused.result.caveats.some(c=>c.evidenceIds.includes('unused')));assert.equal(unused.result.caveats.length,3);checks++;
  o.facts.push({...o.facts[0],factId:'f2',text:'루머',evidenceIds:['unused'],supports:[{evidenceId:'unused',field:'summary',span:'루머'}]});
  const multi=validate(o,p44,s);assert.equal(multi.result.caveats.length,4);assert.deepEqual(multi.result.caveats.at(-1).evidenceIds,[a.evidenceId,'unused']);assert.match(multi.result.caveats.at(-1).text,/독립 검증이나 내용 일치를 뜻하지 않습니다/);checks++;
 }
 // Conflicting attributed dates remain distinct facts; the server does not invent
 // a reconciliation or infer that one newer report must be a correction.
 {
  const s=structuredClone(selected),o=guide();s.evidence[0].evidence=[];o.facts=[];
  for(const [id,year] of [['first',2027],['second',2028]]){const summary=`보도에 따르면 공개는 ${year}년 예정이다.`,a={...evidence,evidenceId:id,articleId:id,summary};s.evidence[0].evidence.push(a);o.facts.push({factId:id,text:summary,evidenceIds:[id],certainty:'attributed_report',supports:[{evidenceId:id,field:'summary',span:summary}]});}
  o.outline.forEach(x=>x.factIds=['first','second']);const v=validate(o,p44,s);assert.match(v.result.facts[0].text,/2027/);assert.match(v.result.facts[1].text,/2028/);assert.deepEqual(v.result.caveats.at(-1).evidenceIds,['first','second']);assert.match(v.result.caveats.at(-1).text,/보도 간 차이/);checks++;
 }
 const insufficient={status:'insufficient_evidence',facts:[],caveats:[],outline:[],draft:[]};
 const thin=validate(insufficient,p44,selected);assert.match(thin.result.caveats[0].text,/충분한 근거/);assert.deepEqual(thin.result.caveats[0].evidenceIds,[]);assert.equal(thin.evidence.length,0);checks++;
 reject({...insufficient,facts:guide().facts},'STATUS_CONTENT');reject({...insufficient,caveats:[{text:'없다.',evidenceIds:[]}]},'ARRAY_LENGTH');
 // Actual public shape renders and copies using the existing React/API consumers.
 const ui=await loadUiModules(['components/assistant/assistant-result.tsx'],{stubs:{'@/lib/assistant/generation':'','@/lib/assistant/service':''}});
 try{const m=ui.modules['components/assistant/assistant-result.tsx'];const html=renderToStaticMarkup(createElement(m.default,{view:normal,stale:false,onMessage:()=>{}}));assert(html.includes(normal.result.caveats[0].text));assert(html.includes('assistant-citation-1'));
  for(const section of ['facts','outline']){const copy=m.copyText(normal,section);assert(copy.includes(normal.result.caveats[0].text));assert(copy.includes(article.url));}checks++;
 }finally{await ui.dispose();}
 const runtime=await localRuntime();let publicErrors=0,publicOk=0;
 const originalModule=runtime.m;runtime.m=path=>{const m=originalModule(path);if(path!=='assistant/generate-http')return m;return {...m,handleGenerate:async(...args)=>{
  const response=await m.handleGenerate(...args),body=await response.clone().json();
  if(body.error){publicErrors++;assert.doesNotMatch(JSON.stringify(body),/OFFICIAL_PROMOTION|diagnostic|SYNTHETIC_REJECTED|\$\.caveats/);}
  else if(body.mode==='script'){publicOk++;assert(body.result.caveats.length);assert(body.result.caveats.every(c=>Object.keys(c).sort().join() === 'evidenceIds,text'));assert.doesNotMatch(JSON.stringify(body.result.caveats),/SYNTHETIC_REJECTED|999|2030/);}
  return response;}};};
 try{
  const variants=[
   ['normal',()=>{},null],['four-sections',o=>{o.outline.push({heading:'주의점 정리',factIds:['f1'],creativeNote:'구성 제안: 출처 표현을 확인한다.'});},null],
   ['five-sections',o=>{o.outline.push({heading:'분석',factIds:['f1'],creativeNote:''},{heading:'시청자 질문',factIds:['f1'],creativeNote:'구성 제안: 경험을 묻는다.'});},null],
   ['concise',o=>{o.outline.forEach(i=>i.creativeNote='');},null],
   ['paraphrase',o=>{o.facts[0].text='보도에 따르면 사비의 작업장 라이트세이버에 새로운 시각 효과가 추가됐다.';},null],
   ['insufficient',o=>Object.assign(o,insufficient),null],
   ['free-scope',o=>{o.caveats=[{text:'공식 발표 여부를 확인할 수 없다.',evidenceIds:o.facts[0].evidenceIds}];},'ARRAY_LENGTH'],
   ['caveat-official',o=>{o.caveats=[{text:'디즈니가 공식 발표했다. SYNTHETIC_REJECTED',evidenceIds:o.facts[0].evidenceIds}];},'ARRAY_LENGTH'],
   ['caveat-price',o=>{o.caveats=[{text:'가격은 999달러다.',evidenceIds:o.facts[0].evidenceIds}];},'ARRAY_LENGTH'],
   ['caveat-booking',o=>{o.caveats=[{text:'내일부터 예약할 수 있다.',evidenceIds:o.facts[0].evidenceIds}];},'ARRAY_LENGTH'],
   ['fact-official',o=>{o.facts[0].text='디즈니가 공식 발표했다.';},'OFFICIAL_PROMOTION'],
   ['fact-price',o=>{o.facts[0].text+=' 가격은 999달러다.';},'UNSUPPORTED_NUMBER'],
   ['fact-date',o=>{o.facts[0].text+=' 2030-12-01 예약 시작';},'UNSUPPORTED_NUMBER'],
   ['evidence',o=>{o.facts[0].evidenceIds=['missing'];},'UNKNOWN_EVIDENCE'],
   ['support',o=>{o.facts[0].supports[0].span='없는 근거';},'SUPPORT_SPAN'],
   ['creative-official',o=>{o.outline[0].creativeNote='공식 발표됐다.';},'OFFICIAL_PROMOTION'],
   // Remaining semantic gaps are deliberately observed, NOT quality passes.
   ['speaker-LIMITATION',o=>{o.facts[0].text='디즈니 대표가 업그레이드를 설명했다.';},null],
   ['creative-LIMITATION',o=>{o.outline[0].creativeNote='새로운 예약 시스템이 추가됐다.';},null],
  ];
  let completed=0,refunded=0;
  for(const [id,mutate,reason] of variants){let calls=0;
   const result=await evaluateCase(runtime,corpus,{...p44,id:'P44-e5i-'+id},{mockFetch:body=>{calls++;assert.match(body.instructions,/caveats는 status와 관계없이 반드시 \[\]/);assert.match(body.instructions,/불확실성·보도 차이·발언 주체/);assert.equal(body.text.format.schema.properties.caveats.maxItems,0);assert.equal(body.model,MODEL);
    const data=JSON.parse(body.input[0].content[0].text);assert.equal(data.query,p44.query);assert.equal(data.evidence.length,1);assert.equal(data.evidence[0].articleId,article.id);assert.equal(data.evidence[0].summary,article.summary);assert.equal(data.includeDraft,false);
    const o=guide(data.evidence[0]);mutate(o);return response(o);
   }});
   assert.equal(calls,1);assert.equal(result.providerAttempts,1);assert.equal(result.realOutbound,0);assert.equal(result.charged,7);assert.equal(result.reservationMicros,33600);assert.equal(result.actualMicros,3900);
   if(reason||id==='insufficient'){refunded++;assert.equal(result.code,reason?'INVALID_OUTPUT':'INSUFFICIENT_EVIDENCE');assert.equal(result.settlement,'failed');assert.deepEqual(result.refund,{requested:7,applied:7,forfeited:0,full:true});if(reason)assert.equal(result.diagnostic.reason,reason);}
   else{completed++;assert.equal(result.code,'OK');assert.equal(result.settlement,'completed');assert.equal(result.refund,null);}checks++;
  }
  const qa=await evaluateCase(runtime,corpus,cases.find(c=>c.id==='P41'),{mockFetch:body=>{
   assert.equal(createHash('sha256').update(body.instructions).digest('hex'),'065eeff441395ee4d610282feea5302fa9dbddf190a57f6034632dd935891ea8');const a=JSON.parse(body.input[0].content[0].text).evidence[0];return response({status:'ok',answer:[qaFact(guide(a).facts[0])],limitations:[]});
  }});
  assert.equal(qa.code,'OK');assert.equal(qa.charged,5);assert.equal(qa.refund,null);checks++;
  const checked=await audit(runtime,corpus.capturedAt);assert.equal(checked.ledgerEntries,completed*2+refunded*3+2);assert.equal(checked.operationalOutbound,0);assert(publicErrors>=variants.length);assert.equal(publicOk,completed+1);
  console.log(JSON.stringify({p44Mocks:variants.length,completed,refunded,remainingSemanticGaps:2,qa:'OK / 5 CR',ledger:'PASS',replay:'evaluateCase verifies no repeat debit/transport'}));
 }finally{await runtime.close();}
 assert.equal(outbound,0);console.log(`E.5I P44 structural caveats: ${checks} scenarios PASS; real Provider outbound ZERO; model quality NOT TESTED.`);
}finally{globalThis.fetch=realFetch;await loaded.dispose();}
