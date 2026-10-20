import assert from 'node:assert/strict';
import {loadTestModules} from './test-module-loader.mjs';
// CURRENT checkout, never the historical evaluation runner. All prose synthetic.
const loaded=await loadTestModules(['lib/assistant/output-validation.ts']);
const validate=loaded.modules['lib/assistant/output-validation.ts'].validateGroundedOutput;
const realFetch=globalThis.fetch;let outbound=0,checks=0;
globalThis.fetch=()=>{outbound++;throw Error('REAL_OUTBOUND_FORBIDDEN');};
const denials=[
 '공식 확인되지 않았다.','아직 공식 발표되지 않았다.','공식적으로 확정된 것은 아니다.',
 '공식 확인이 없는 상태다.','공식 발표된 바 없다.','현재까지 공식 발표는 없었다.',
 '공식적으로 확인된 정보는 없다.','Not officially announced.','Not officially confirmed.',
 '공식 발표가 없습니다.','공식 확인되지 않았지만, 추가 보도를 기다린다.',
 'The project is not officially confirmed.','Not officially announced, but reports are provisional.',
];
const claims=[
 '공식 발표됐다.','공식 확정됐다.','공식 확인됐다.','공식적으로 발표했습니다.',
 'Officially announced.','Officially confirmed.',
 '공식 확인되지 않았지만, 제작사는 공식적으로 개봉일을 확정했다.',
 '공식 발표됐다. 다른 내용은 확인되지 않았다.',
 'Not officially confirmed, but officially announced.',
 '공식 발표된 바 없다. 하지만 공식 확인됐다.',
 '공식적으로 개봉일을 확정했다.',
 '공식 확인되지 않았다는 것은 아니다.',
 '공식 확인이 없다는 주장은 거짓이다.',
 '공식 확인된 것은 아니라고 할 수 없다.',
 'Not not officially confirmed.','Not only officially announced.',
 'Not officially confirmed is a false statement.',
 'It is false that it is not officially confirmed.',
 '공식 확인되지 않았다면 이미 공식 발표됐다는 뜻이다.',
 '보도에서는 “공식 확인됐다”라고 말했다.', // Ambiguous quotation stays conservative.
];
const places=['fact','qa','caveat','heading','creativeNote'];
function fixture(place,text){
 const summary=place==='fact'||place==='qa'?text:'제작 계획은 논의 중이며 공식 확인되지 않았다.';
 const article={evidenceId:'a',articleId:'a',storyId:'s',title:'합성 보도',summary,url:'https://example.invalid/news',source:{sourceClass:'media',label:'Synthetic'},orderUncertain:false};
 const selected={evidence:[{storyId:'s',evidence:[article],omittedArticleCount:0}],archiveWindow:{},asOf:'2026-10-19'};
 const fact={text:summary,evidenceIds:['a'],certainty:'attributed_report',supports:[{evidenceId:'a',field:'summary',span:summary}]};
 const input={mode:place==='qa'?'qa':'script',includeDraft:false};
 const raw=place==='qa'?{status:'ok',answer:[fact],limitations:[]}:{status:'ok',facts:[{factId:'f',...fact}],caveats:[],outline:[{heading:'핵심 소식',factIds:['f'],creativeNote:'구성 제안'}],draft:[]};
 if(place==='caveat')raw.caveats=[{text,evidenceIds:['a']}];
 if(place==='heading'||place==='creativeNote')raw.outline[0][place]=text;
 return {raw,input,selected};
}
function accepted(f){checks++;assert.equal(validate(f.raw,f.input,f.selected).status,'ok');}
function rejected(f,reason='OFFICIAL_PROMOTION',path){checks++;assert.throws(()=>validate(f.raw,f.input,f.selected),e=>{
 assert.equal(e.code,'INVALID_OUTPUT');assert.equal(e.diagnostic.reason,reason);
 if(path)assert.equal(e.diagnostic.path,path);return true;
});}
try{
 for(const text of denials)for(const place of places){if(place==='caveat')rejected(fixture(place,text),'ARRAY_LENGTH','$.caveats');else accepted(fixture(place,text));}
 for(const text of claims)for(const place of places)rejected(fixture(place,text),place==='caveat'?'ARRAY_LENGTH':'OFFICIAL_PROMOTION');
 // Negation never crosses field boundaries or exempts a second occurrence.
 let f=fixture('heading','공식 확인');f.raw.outline[0].creativeNote='되지 않았다.';rejected(f);
 f=fixture('heading','Not');f.raw.outline[0].creativeNote='officially confirmed.';rejected(f);
 f=fixture('fact','공식 확인되지 않았다.');f.raw.outline[0].heading='공식 발표됐다.';rejected(f);
 // Source classification, explicit support and certainty gates are unchanged.
 for(const place of ['fact','qa']){
  f=fixture(place,'공식 발표했다.');const fact=place==='qa'?f.raw.answer[0]:f.raw.facts[0];
  fact.certainty='explicit_announcement';rejected(f);
  f.selected.evidence[0].evidence[0].source.sourceClass='official';accepted(f);
  fact.certainty='attributed_report';rejected(f);
  for(const text of ['공식 확인되지 않았다.','Not officially announced.']){
   f=fixture(place,text);f.selected.evidence[0].evidence[0].source.sourceClass='official';
   (place==='qa'?f.raw.answer[0]:f.raw.facts[0]).certainty='explicit_announcement';rejected(f);
  }
  f=fixture(place,'공식 발표했다.');f.selected.evidence[0].evidence[0].summary+=' 아직 논의 중이다.';
  f.selected.evidence[0].evidence[0].source.sourceClass='official';
  (place==='qa'?f.raw.answer[0]:f.raw.facts[0]).certainty='explicit_announcement';rejected(f);
 }
 // A denial exception grants no exemption from grounding/schema checks.
 const mutations=[
  [x=>{x.raw.facts[0].evidenceIds=['unknown'];},'UNKNOWN_EVIDENCE'],
  [x=>{x.raw.facts[0].supports[0].span='absent';},'SUPPORT_SPAN'],
  [x=>{x.selected.evidence[0].evidence[0].url='javascript:private';},'UNSAFE_CITATION'],
  [x=>{x.raw.facts[0].text='공식 확인되지 않았다. 2029년';},'UNSUPPORTED_NUMBER'],
  [x=>{x.raw.facts[0].text='제작이 진행된다.';},'UNCERTAINTY_LOST'],
  [x=>{x.raw.facts[0].text='공식 확인되지 않았다. https://private.invalid';},'UNSAFE_PROSE'],
  [x=>{x.raw.facts[0].certainty='explicit_speculation';},'SPECULATION_SUPPORT'],
  [x=>{x.raw.outline[0].factIds=['missing'];},'UNKNOWN_FACT'],
  [x=>{x.raw.facts[0].extra='SYNTHETIC_PRIVATE';},'OBJECT_KEYS'],
 ];
 for(const [mutate,reason] of mutations){f=fixture('fact',denials[0]);mutate(f);rejected(f,reason);}
 f=fixture('fact','Not officially announced.');f.raw.facts[0].text='Production is proceeding.';rejected(f,'UNCERTAINTY_LOST');
 // Historical output shape remains checked; live Full Draft admission stays blocked
 // by generation tests. Existing stricter creative boundary is not loosened.
 f=fixture('fact',denials[0]);f.input.includeDraft=true;
 f.raw.draft=[{kind:'fact',text:f.raw.facts[0].text,factIds:['f']},{kind:'creative',text:'공식 확인되지 않았다.',factIds:[]}];accepted(f);
 f.raw.draft[0].text+=' 다른 사실';rejected(f,'DRAFT_FACT_TEXT');
 f.raw.draft[0].text=f.raw.facts[0].text;f.raw.draft[1].text='공식 발표됐다.';rejected(f,'CREATIVE_BOUNDARY');
 f.raw.draft[1].text='공식 확정되지 않았다.';rejected(f,'CREATIVE_BOUNDARY');
 f.raw.draft[1].text='Not officially confirmed.';accepted(f);
 f.raw.draft[1].text='Not officially confirmed, but officially announced.';rejected(f,'CREATIVE_BOUNDARY');
 assert.equal(outbound,0);
 console.log(`Current-runtime grounding negation: ${checks} cases PASS; synthetic only; outbound ZERO; actual P44 cause undetermined.`);
}finally{globalThis.fetch=realFetch;await loaded.dispose();}
