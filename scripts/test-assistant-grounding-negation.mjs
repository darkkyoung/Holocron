import {mvpOutput} from './fixtures/assistant/mvp-output.mjs';
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
const places=['point','qa','limitation','heading','transition'];
function fixture(place,text){
 const summary=place==='point'||place==='qa'?text:'제작 계획은 논의 중이며 공식 확인되지 않았다.';
 const article={evidenceId:'a',articleId:'a',storyId:'s',title:'합성 보도',summary,url:'https://example.invalid/news',source:{sourceClass:'media',label:'Synthetic'},orderUncertain:false};
 const selected={evidence:[{storyId:'s',evidence:[article],omittedArticleCount:0}],archiveWindow:{},asOf:'2026-10-19'};
 const input={mode:place==='qa'?'qa':'script',includeDraft:false},raw=mvpOutput(input.mode,[article]);
 if(place==='qa')raw.answer=text;
 else if(place==='point')raw.sections[0].points[0]=text;
 else if(place==='limitation')raw.limitations=[text];
 else raw.sections[0][place]=text;
 return {raw,input,selected};
}
function accepted(f){checks++;assert.equal(validate(f.raw,f.input,f.selected).status,'ok');}
function rejected(f,reason='OFFICIAL_PROMOTION',path){checks++;assert.throws(()=>validate(f.raw,f.input,f.selected),e=>{
 assert.equal(e.code,'INVALID_OUTPUT');assert.equal(e.diagnostic.reason,reason);
 if(path)assert.equal(e.diagnostic.path,path);return true;
});}
try{
 for(const text of denials)for(const place of places)accepted(fixture(place,text));
 for(const text of claims)for(const place of places)rejected(fixture(place,text));
 let f=fixture('heading','공식 확인');f.raw.sections[0].transition='되지 않았다.';accepted(f); // Neutral heading is not an affirmative claim.
 f=fixture('heading','Not');f.raw.sections[0].transition='officially confirmed.';rejected(f);
 for(const place of ['point','qa']){
  f=fixture(place,'공식 발표했다.');rejected(f);
  f.selected.evidence[0].evidence[0].source.sourceClass='official';accepted(f);
  // Official outlet alone never establishes announcement authority.
  f.selected.evidence[0].evidence[0].summary='공식 발표 여부는 확인되지 않았다.';rejected(f);
 }
 for(const [mutate,reason] of [
  [x=>{x.raw.evidenceIds=['unknown'];},'UNKNOWN_EVIDENCE'],
  [x=>{x.selected.evidence[0].evidence[0].url='javascript:private';},'UNSAFE_CITATION'],
  [x=>{x.raw.answer+=' 2029년';},'UNSUPPORTED_NUMBER'],
  [x=>{x.raw.answer+=' https://private.invalid';},'UNSAFE_PROSE'],
  [x=>{x.raw.extra='PRIVATE';},'OBJECT_KEYS'],
 ]){f=fixture('qa',denials[0]);mutate(f);rejected(f,reason);}
 for(const place of places)accepted(fixture(place,'공식 발표와 보도를 구분하세요.'));
 // A draft-shaped response is no longer part of either product contract.
 f=fixture('point',denials[0]);f.raw.draft=[];rejected(f,'OBJECT_KEYS');
 assert.equal(outbound,0);
 console.log(`Current-runtime grounding negation: ${checks} cases PASS; synthetic only; outbound ZERO; actual P44 cause undetermined.`);
}finally{globalThis.fetch=realFetch;await loaded.dispose();}
