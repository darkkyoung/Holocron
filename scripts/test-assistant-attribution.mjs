import assert from 'node:assert/strict';
import {loadTestModules} from './test-module-loader.mjs';
// Synthetic editorial counterexamples, NOT captured model answers or a semantic judge.
const loaded=await loadTestModules(['lib/assistant/output-validation.ts','lib/assistant/prompt.ts','lib/assistant/provider-profile.ts'],{externals:['js-tiktoken/lite','js-tiktoken/ranks/o200k_base']});
const validate=loaded.modules['lib/assistant/output-validation.ts'].validateGroundedOutput;
const prepare=loaded.modules['lib/assistant/prompt.ts'].prepareProviderInput;
const {providerProfile,ASSISTANT_PROFILE}=loaded.modules['lib/assistant/provider-profile.ts'];
const pairs=[
 ['speaker/subject','기술 감독 A는 영화감독 B가 즉흥 연출을 선호한다고 설명했다.','A에 따르면 B는 즉흥 연출을 선호한다.','B는 즉흥 연출을 선호한다고 설명했다.'],
 ['nested quote','A quoted B as saying that rehearsals help.','A가 전한 B의 발언은 리허설이 도움이 된다는 것이다.','A said that rehearsals help.'],
 ['outlet','매체 M은 관계자 A가 촬영 방식을 설명했다고 보도했다.','M의 보도에 따르면 촬영 방식을 설명한 사람은 A다.','M이 촬영 방식을 결정했다.'],
 ['possibility','관계자 A는 프로젝트 가능성을 언급했다.','A는 프로젝트의 가능성을 언급한 것으로 전해졌다.','B는 프로젝트 가능성을 언급했다.'],
 ['reported/official','매체 M은 A의 제작 접근법을 보도했다.','M이 보도한 내용은 A의 제작 접근법이다.','A가 제작 접근법을 공식 발표했다.','OFFICIAL_PROMOTION'],
 ['different reports','매체 M은 A가 리허설을 중시한다고, N은 A가 즉흥 연출을 선호한다고 보도했다.','M과 N은 A의 접근법을 서로 다르게 전했다.','A는 두 방식 모두 선호한다고 직접 밝혔다.'],
 ['unknown speaker','The report describes a flexible filming process without identifying a speaker.','보도는 유연한 촬영 과정을 설명하지만 발언자는 특정하지 않는다.','Director B described a flexible filming process.'],
 ['multiple speakers','A와 B는 함께 제작 과정을 설명했다.','제작 과정을 설명한 사람은 A와 B다.','C가 제작 과정을 설명했다.'],
 ['negation','A는 B의 프로젝트가 공식 확인되지 않았다고 설명했다.','A에 따르면 B의 프로젝트는 공식 확인되지 않았다.','B에 따르면 프로젝트는 공식 확인되지 않았다.'],
 ['paraphrase','A said B favors improvisation during filming.','A가 전한 B의 연출 취향은 현장에서의 즉흥성이다.','B said A favors improvisation during filming.'],
];
function fixture(mode,summary,text){
 const article={evidenceId:'a',articleId:'a',storyId:'s',title:'Synthetic report',summary,url:'https://example.invalid/news',source:{sourceClass:'media',label:'M'},orderUncertain:false};
 const selected={request:{query:'제작 접근법',filters:{}},evidence:[{storyId:'s',evidence:[article],omittedArticleCount:0}],archiveWindow:{},asOf:'2026-10-19'};
 const fact={text,evidenceIds:['a'],certainty:'attributed_report',supports:[{evidenceId:'a',field:'summary',span:summary}]};
 const input={mode,includeDraft:false,instructions:''};
 const raw=mode==='qa'?{status:'ok',answer:[fact],limitations:[]}:{status:'ok',facts:[{factId:'f',...fact}],caveats:[],outline:[{heading:'핵심 설명',factIds:['f'],creativeNote:'구성 제안: 발언과 보도 출처를 소개한다.'}],draft:[]};
 return {raw,input,selected};
}
const realFetch=globalThis.fetch;let outbound=0,correct=0,limited=0,blocked=0,conservativeDenials=0;
globalThis.fetch=()=>{outbound++;throw Error('REAL_OUTBOUND_FORBIDDEN');};
const accept=f=>assert.equal(validate(f.raw,f.input,f.selected).status,'ok');
const reject=(f,reason)=>assert.throws(()=>validate(f.raw,f.input,f.selected),e=>e.code==='INVALID_OUTPUT'&&e.diagnostic.reason===reason);
try{
 for(const mode of ['qa','script']){
  for(const [category,summary,good,bad,reason] of pairs){
   accept(fixture(mode,summary,good));correct++;
   const f=fixture(mode,summary,bad);
   if(reason){reject(f,reason);blocked++;}
   else{
    // Passing lexical validation is the LIMITATION under test, not approval of bad prose.
    accept(f);limited++;
   }
   if(mode==='script'){
    for(const place of ['caveat','heading','creativeNote']){
     const g=fixture(mode,summary,good);
     const set=text=>{if(place==='caveat')g.raw.caveats=[{text,evidenceIds:['a']}];else g.raw.outline[0][place]=text;};
     set(good);accept(g);correct++;
     set(bad);if(reason){reject(g,reason);blocked++;}else{accept(g);limited++;}
    }
   }
   assert(category);
  }
  const f=fixture(mode,pairs[0][1],pairs[0][2]);
  const wire=prepare(f.selected,f.input,providerProfile(ASSISTANT_PROFILE,mode==='qa'?'qa':'planner'));
  assert(wire.inputTokens<16000);assert(wire.bytes<48*1024);
  assert.equal(wire.body.store,false);assert.deepEqual(wire.body.tools,[]);
  assert.equal(wire.body.text.format.strict,true);
  const data=JSON.parse(wire.body.input[0].content[0].text);
  assert.equal(data.evidence[0].summary,pairs[0][1]);
  console.log(`${mode}: current wire ${wire.inputTokens} reserved input tokens; ${wire.bytes} bytes`);
  const fact=x=>mode==='qa'?x.raw.answer[0]:x.raw.facts[0];
  for(const [mutate,reason] of [
   [x=>{fact(x).evidenceIds=['missing'];},'UNKNOWN_EVIDENCE'],
   [x=>{fact(x).supports[0].span='fabricated support';},'SUPPORT_SPAN'],
   [x=>{fact(x).text+=' 2030';},'UNSUPPORTED_NUMBER'],
   [x=>{fact(x).text+='<script>';},'UNSAFE_PROSE'],
   [x=>{x.selected.evidence[0].evidence[0].url='javascript:bad';},'UNSAFE_CITATION'],
   [x=>{fact(x).certainty='explicit_announcement';},'OFFICIAL_PROMOTION'],
  ]){const g=structuredClone(f);mutate(g);reject(g,reason);blocked++;}
  // Existing conservative embedded-denial limitation is recorded, not silently loosened.
  reject(fixture(mode,pairs[8][1],'A는 프로젝트가 공식 확인되지 않았다고 설명했다.'),'OFFICIAL_PROMOTION');conservativeDenials++;
  const g=fixture(mode,'제작은 논의 중이다.','제작을 시작했다.');reject(g,'UNCERTAINTY_LOST');blocked++;
 }
 assert.equal(outbound,0);
 console.log(JSON.stringify({correctParaphrases:correct,deterministicRejections:blocked,promptOnlySemanticLimitations:limited,knownEmbeddedDenialOverRejections:conservativeDenials,modelQuality:'NOT_TESTED',providerOutbound:outbound}));
}finally{globalThis.fetch=realFetch;await loaded.dispose();}
