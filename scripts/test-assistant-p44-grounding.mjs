import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadTestModules} from './test-module-loader.mjs';
import {localRuntime,audit} from './assistant-eval/local-runtime.mjs';
import {evaluateCase} from './assistant-eval/evaluate.mjs';
import {MODEL} from './assistant-eval/budget.mjs';
// Public frozen inputs; all outputs below are synthetic, never recovered model prose.
const corpus=JSON.parse(await readFile('evaluation/assistant/public-archive.json'));
const cases=JSON.parse(await readFile('evaluation/assistant-mvp/cases.json')).cases;
const p44=cases.find(c=>c.id==='P44'),article=corpus.articles.find(a=>a.id===p44.allowedArticleIds[0]);
// BEFORE decisions were executed on 1512d95 before the production edit.
const loaded=await loadTestModules(['lib/assistant/output-validation.ts']);
const validate=loaded.modules['lib/assistant/output-validation.ts'].validateGroundedOutput;
const evidence={...article,evidenceId:article.id,articleId:article.id,storyId:article.topic,source:{sourceClass:'specialist',label:article.source},orderUncertain:false};
const selected={evidence:[{storyId:article.topic,evidence:[evidence],omittedArticleCount:0}],archiveWindow:{},asOf:corpus.capturedAt};
const qaFact=f=>({text:f.text,evidenceIds:f.evidenceIds,certainty:f.certainty,supports:f.supports});
function guide(a=evidence){return {status:'ok',facts:[{factId:'f1',text:a.title,evidenceIds:[a.evidenceId],certainty:'attributed_report',supports:[{evidenceId:a.evidenceId,field:'title',span:a.title}]}],caveats:[{text:'선택된 기사 요약에는 구체적인 가격이 제시되지 않았다.',evidenceIds:[a.evidenceId]}],outline:['도입: 업그레이드 소식','본론: 시각 효과 변화','마무리: 핵심 내용 정리'].map(heading=>({heading,factIds:['f1'],creativeNote:'구성 제안: 해당 소식을 소개하고 시청자의 생각을 묻는다.'})),draft:[]};}
// Expected editorial status and pre/post lexical decision, not model quality scores.
const examples=[
 ['price-scope','선택된 기사 요약에는 구체적인 가격이 제시되지 않았다.','safe',true,true],
 ['booking-scope','현재 선택된 근거로는 예약 가능 여부를 확인할 수 없다.','safe',true,true],
 ['announcement-scope','기사 요약만으로는 별도의 공식 발표 여부를 판단할 수 없다.','safe',false,true],
 ['confirmation-scope','공식 확인 여부는 선택된 자료에서 확인할 수 없다.','safe',false,true],
 ['selected-summary','선택한 기사 요약에서는 별도의 공식 발표 여부를 확인할 수 없다.','safe',false,true],
 ['design-scope','선택한 아카이브 근거에서는 공식 발표를 확인할 수 없습니다.','safe',false,true],
 ['english-scope','The selected article summary does not establish whether this was officially announced.','safe',false,false],
 ['unbacked-quote','공식 확인되지 않았다고 설명했다.','unknown',false,false],
 ['absence-is-not-evidence','공식 발표는 없었다.','unsafe',true,true],
 ['price-promotion','디즈니가 가격 인상을 공식 발표했다.','unsafe',false,false],
 ['booking-promotion','새로운 예약 일정이 공식 확정됐다.','unsafe',false,false],
 ['mixed-implicit','공식 발표되지 않았지만 이미 예약 일정은 확정됐다.','unsafe',false,false],
 ['mixed-comma','공식 발표되지 않았지만, 이미 예약 일정은 확정됐다.','unsafe',true,false],
 ['secondhand','언론 보도를 근거로 디즈니가 공식 확정했다고 주장한다.','unsafe',false,false],
 ['double-negative','공식 발표가 없었다는 이야기는 거짓이며 이미 확정됐다.','unsafe',false,false],
 ['quoted-positive','보도에서는 “공식 확인됐다”라고 말했다.','unknown',false,false],
 ['nested-quote','A는 B가 “공식 확인되지 않았다”고 말했다고 전했다.','unknown',false,false],
 ['denial','Not officially confirmed.','unknown',true,true],
 ['english-mixed','Not officially confirmed, but officially announced.','unsafe',false,false],
 ['scope-double-negative','공식 확인 여부는 선택된 자료에서 확인할 수 없다는 것은 아니다.','unsafe',false,false],
 ['scope-quotation','“공식 확인 여부는 선택된 자료에서 확인할 수 없다”는 주장은 거짓이다.','unsafe',false,false],
 ['scope-plus-positive','기사 요약만으로는 별도의 공식 발표 여부를 판단할 수 없다. 디즈니가 공식 발표했다.','unsafe',false,false],
 ['scope-plus-confirmed','기사 요약만으로는 별도의 공식 발표 여부를 판단할 수 없다. 예약 일정은 확정됐다.','unsafe',false,false],
 ['scope-mixed-clause','공식 확인 여부는 선택된 자료에서 확인할 수 없다, 그러나 공식 확정됐다.','unsafe',false,false],
];
let outbound=0,checks=0;const realFetch=globalThis.fetch;
globalThis.fetch=()=>{outbound++;throw Error('REAL_OUTBOUND_FORBIDDEN');};
function decision(raw,input=p44,s=selected){try{validate(raw,input,s);return null;}catch(e){assert.equal(e.code,'INVALID_OUTPUT');return e.diagnostic;}}
const counts={CORRECT_ACCEPT:0,CORRECT_REJECT:0,FALSE_POSITIVE:0,FALSE_NEGATIVE:0,SEMANTICALLY_UNDETERMINED:0};
try{
 for(const [id,text,meaning,,after] of examples){const raw=guide();raw.caveats[0].text=text;const d=decision(raw),accepted=!d;
  assert.equal(accepted,after,id);checks++;
  if(d)assert.deepEqual(d,{stage:'grounding',reason:'OFFICIAL_PROMOTION',path:'$.caveats[0].text'});
  const category=meaning==='unknown'?'SEMANTICALLY_UNDETERMINED':meaning==='safe'?(accepted?'CORRECT_ACCEPT':'FALSE_POSITIVE'):(accepted?'FALSE_NEGATIVE':'CORRECT_REJECT');counts[category]++;
 }
 // Known supported indirect denial remains conservative, including fact/QA and caveat.
 const summary='A는 프로젝트가 공식 확인되지 않았다고 설명했다.';
 for(const place of ['fact','qa','caveat']){const s=structuredClone(selected);s.evidence[0].evidence[0].summary=summary;const raw=guide();
  raw.facts[0]={...raw.facts[0],text:summary,supports:[{evidenceId:evidence.evidenceId,field:'summary',span:summary}]};
  if(place==='caveat'){raw.facts[0].text='A에 따르면 프로젝트는 공식 확인되지 않았다.';raw.caveats[0].text=summary;}
  const data=place==='qa'?{status:'ok',answer:raw.facts.map(qaFact),limitations:[]}:raw;
  assert.equal(decision(data,{...p44,mode:place==='qa'?'qa':'script'},s)?.reason,'OFFICIAL_PROMOTION');checks++;
 }
 console.log(JSON.stringify({phase:'AFTER',syntheticCaveatClassification:counts,supportedIndirectDenialFalsePositives:3}));
 {
  // Scope exception is caveat-only; it never changes QA/fact/outline/draft gates.
  for(const place of ['fact','qa','heading','creativeNote','draft']){const raw=guide(),text=examples[2][1];let input=p44;
   if(place==='fact'||place==='qa')raw.facts[0].text=text;
   else if(place==='draft'){input={...p44,includeDraft:true};raw.draft=[{kind:'creative',text,factIds:[]}];}
   else raw.outline[0][place]=text;
   const data=place==='qa'?{status:'ok',answer:raw.facts.map(qaFact),limitations:[]}:raw;
   assert(decision(data,place==='qa'?{...input,mode:'qa'}:input));checks++;
  }
  const raw=guide();raw.caveats[0].text=examples[2][1];raw.outline[0].heading='공식 발표됐다.';assert.equal(decision(raw)?.reason,'OFFICIAL_PROMOTION');checks++;
  const r=await localRuntime();
  const originalModule=r.m;let publicErrors=0;
  r.m=path=>{const m=originalModule(path);if(path!=='assistant/generate-http')return m;
   return {...m,handleGenerate:async(...args)=>{const response=await m.handleGenerate(...args),body=await response.clone().json();
    if(body.error){publicErrors++;const serialized=JSON.stringify(body);assert(!serialized.includes('OFFICIAL_PROMOTION'));assert(!serialized.includes('diagnostic'));assert(!serialized.includes('$.caveats'));assert(!serialized.includes('SYNTHETIC_REJECTED_PROSE'));}
    return response;}};
  };
  try{
   const variants=[
    ['normal',()=>{},null],
    ...examples.filter(e=>e[2]==='safe'&&e[4]).map(([id,text])=>[id,o=>{o.caveats[0].text=text;},null]),
    ['invented-official',o=>{o.caveats[0].text='디즈니가 가격 인상을 공식 발표했다. SYNTHETIC_REJECTED_PROSE';},'OFFICIAL_PROMOTION'],
    ['invented-booking',o=>{o.caveats[0].text='새로운 예약 일정이 공식 확정됐다.';},'OFFICIAL_PROMOTION'],
    ['mixed-confirmation',o=>{o.caveats[0].text=examples[12][1];},'OFFICIAL_PROMOTION'],
    ['price-fact',o=>{o.facts[0].text+=' 가격은 999달러다.';},'UNSUPPORTED_NUMBER'],
    ['date-fact',o=>{o.facts[0].text+=' 예약은 2030-12-01 시작한다.';},'UNSUPPORTED_NUMBER'],
    ['evidence',o=>{o.caveats[0].evidenceIds=['missing'];},'UNKNOWN_EVIDENCE'],
    ['support',o=>{o.facts[0].supports[0].span='없는 근거';},'SUPPORT_SPAN'],
    // Deliberately accepted bad outputs expose remaining semantic gaps, never PASS quality.
    ['speaker-LIMITATION',o=>{o.facts[0].text='디즈니 대표가 업그레이드를 설명했다.';},null],
    ['creative-LIMITATION',o=>{o.outline[0].creativeNote='새로운 예약 시스템이 추가됐다.';},null],
    ['caveat-number-LIMITATION',o=>{o.caveats[0].text='가격은 999달러다.';},null],
   ];
   let successful=0,failed=0;
   for(const [id,mutate,reason] of variants){let transport=0;
    const result=await evaluateCase(r,corpus,{...p44,id:'P44-mock-'+id},{mockFetch:body=>{transport++;assert(body.instructions.includes('공식 발표가 존재하거나 존재하지 않는다고 단정하지 마세요'));assert.equal(body.model,MODEL);assert.equal(body.text.format.name,'archive_script');
     const data=JSON.parse(body.input[0].content[0].text);assert.equal(data.query,p44.query);assert.equal(data.evidence.length,1);const a=data.evidence[0];assert.equal(a.articleId,article.id);assert.equal(a.summary,article.summary);assert.equal(data.includeDraft,false);
     const o=guide(a);mutate(o);return Response.json({status:'completed',model:MODEL,error:null,incomplete_details:null,usage:{input_tokens:1600,output_tokens:600},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(o),annotations:[]}]}]});}});
    assert.equal(transport,1,JSON.stringify({id,result}));assert.equal(result.providerAttempts,1);assert.equal(result.realOutbound,0);assert.equal(result.charged,7);assert.equal(result.reservationMicros,33600);assert.equal(result.actualMicros,3900);
    if(reason){failed++;assert.equal(result.code,'INVALID_OUTPUT',id);assert.equal(result.settlement,'failed');assert.equal(result.diagnostic.reason,reason);assert.deepEqual(result.refund,{requested:7,applied:7,forfeited:0,full:true});}
    else{successful++;assert.equal(result.code,'OK',id);assert.equal(result.settlement,'completed');assert.equal(result.refund,null);}
    checks++;
   }
   const qa=await evaluateCase(r,corpus,cases.find(c=>c.id==='P41'),{mockFetch:body=>{
    assert(!body.instructions.includes('공식 발표가 존재하거나 존재하지 않는다고 단정하지 마세요'));
    assert(body.instructions.includes('발언자·발언 대상·주장·보도 매체의 관계를 보존하세요'));
    const a=JSON.parse(body.input[0].content[0].text).evidence[0],fact=qaFact(guide(a).facts[0]);
    return Response.json({status:'completed',model:MODEL,error:null,incomplete_details:null,usage:{input_tokens:1000,output_tokens:200},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify({status:'ok',answer:[fact],limitations:[]}),annotations:[]}]}]});
   }});
   assert.equal(qa.code,'OK');assert.equal(qa.charged,5);assert.equal(qa.refund,null);assert.equal(qa.providerAttempts,1);checks++;
   const checked=await audit(r,corpus.capturedAt);assert.equal(checked.ledgerEntries,successful*2+failed*3+2);assert.equal(checked.operationalOutbound,0);
   assert(publicErrors>=variants.length);
   console.log(JSON.stringify({p44FullPathMocks:variants.length,qaFullPathMock:'PASS / 5 CR',programCompleted:successful,refunded:failed,knownSemanticLimitations:3,ledgerAudit:'PASS',replay:'checked by evaluateCase'}));
  }finally{await r.close();}
 }
 assert.equal(outbound,0);console.log(`P44 current runtime: ${checks} scenarios; real Provider outbound ZERO; historical P44 cause UNKNOWN.`);
}finally{globalThis.fetch=realFetch;await loaded.dispose();}
