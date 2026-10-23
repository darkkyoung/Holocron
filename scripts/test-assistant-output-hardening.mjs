import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadTestModules} from './test-module-loader.mjs';
const loaded=await loadTestModules(['lib/assistant/output-validation.ts','lib/assistant/output-logger.ts']);
const validate=loaded.modules['lib/assistant/output-validation.ts'].validateGroundedOutput;
const {outputLoggerFactory}=loaded.modules['lib/assistant/output-logger.ts'];
let checks=0,outbound=0;const original=globalThis.fetch;
globalThis.fetch=()=>{outbound++;throw Error('REAL_OUTBOUND_FORBIDDEN');};
function fixture(mode,summary,span,text){
 const a={evidenceId:'a',articleId:'a',storyId:'s',title:'제작 현장 보도',summary,url:'https://example.invalid/news',source:{sourceClass:'media',label:'M'},orderUncertain:false};
 const f={text,evidenceIds:['a'],certainty:'attributed_report',supports:[{evidenceId:'a',field:'summary',span}]};
 return {input:{mode,includeDraft:false},selected:{evidence:[{storyId:'s',evidence:[a],omittedArticleCount:0}],archiveWindow:{},asOf:'2026-10-23'},raw:mode==='qa'?{status:'ok',answer:[f],limitations:[]}:{status:'ok',facts:[{factId:'f',...f}],caveats:[],outline:[{heading:'핵심 소개',factIds:['f'],creativeNote:'구성 제안'}],draft:[]}};
}
const test=(f,reason)=>{checks++;if(reason)assert.throws(()=>validate(f.raw,f.input,f.selected),e=>e.code==='INVALID_OUTPUT'&&e.diagnostic.reason===reason);else assert.equal(validate(f.raw,f.input,f.selected).status,'ok');};
try{
 for(const mode of ['qa','script']){
  const sentence='감독은 현장에서 모형을 사용했다고 설명했다.';
  test(fixture(mode,'개봉은 내년으로 예정돼 있다. '+sentence,sentence,'보도에 따르면 감독은 현장에서 모형을 사용했다.'));
  for(const [summary,span,text] of [
   ['개봉은 내년으로 예정돼 있다.','개봉은 내년','개봉일은 확정됐다.'],
   ['제작은 논의 중이다.','제작','제작이 확정됐다.'],
   ['출연설은 루머다.','출연설','출연은 사실이다.'],
   ['프로젝트 제작을 검토한다. 아직 논의 중이며 확정되지 않았다.','프로젝트 제작을 검토한다.','프로젝트 제작이 시작됐다.'],
   ['아직 확정되지 않았다. 제작 계획을 소개했다.','제작 계획을 소개했다.','제작이 시작됐다.'],
   ['프로젝트 제작을 소개했다. 프로젝트 제작은 관계자들의 여러 의견을 반영하는 논의 중 단계다.','프로젝트 제작을 소개했다.','프로젝트 제작이 시작됐다.'],
   ['스타파이터 제작 계획을 소개했다. 감독의 다른 작품도 소개했다. 스타파이터 제작 계획은 논의 중이다.','스타파이터 제작 계획을 소개했다.','스타파이터 제작이 시작됐다.'],
   ['제작은 시작되지 않았다.','제작은 시작','제작은 시작됐다.'],
   ['Production is in talks.','Production','Production started.'],
   ['제작 계획은 논의 중이다. 다른 소식이다. 제작 계획은 논의 중이다.','제작 계획','제작이 시작됐다.'],
  ])test(fixture(mode,summary,span,text),'UNCERTAINTY_LOST');
  test(fixture(mode,sentence,sentence,'제작사는 공식 발표했다.'),'OFFICIAL_PROMOTION');
  test(fixture(mode,sentence,sentence,'2035년 5월 8일 개봉한다.'),'UNSUPPORTED_NUMBER');
  test(fixture(mode,sentence,'없는 구절','감독의 설명이다.'),'SUPPORT_SPAN');
  const f=fixture(mode,sentence,sentence,'감독의 설명이다.');
  const fact=mode==='qa'?f.raw.answer[0]:f.raw.facts[0];
  fact.supports[0].evidenceId='other-source';test(f,'SUPPORT_REFERENCE');
  fact.supports[0].evidenceId='a';fact.supports[0].span='다른 화자가 한 말';test(f,'SUPPORT_SPAN');
  const multi=fixture(mode,sentence,sentence,'제작이 확정됐다.');
  const other={...multi.selected.evidence[0].evidence[0],evidenceId:'b',summary:'제작은 논의 중이다.'};multi.selected.evidence[0].evidence.push(other);
  const mf=mode==='qa'?multi.raw.answer[0]:multi.raw.facts[0];mf.evidenceIds.push('b');mf.supports.push({evidenceId:'b',field:'summary',span:'제작'});test(multi,'UNCERTAINTY_LOST');
  // A title-only citation must not shed the summary's qualification.
  const title=fixture(mode,'아직 논의 중이다.','제작 현장 보도','제작이 시작됐다.');(mode==='qa'?title.raw.answer[0]:title.raw.facts[0]).supports[0].field='title';test(title,'UNCERTAINTY_LOST');
 }
 let clock=100000;const events=[];const create=outputLoggerFactory(e=>events.push(e),()=>clock);
 const observer=create();await observer({stage:'SECRET',reason:'UNCERTAINTY_LOST',path:'$.answer[0].text',raw:'SECRET'});await observer({reason:'OUTPUT_JSON',path:'$'});
 assert.equal(events.length,1);assert.deepEqual(events[0],{event:'ASSISTANT_OUTPUT_DIAGNOSTIC_V1',stage:'grounding',reason:'UNCERTAINTY_LOST',path:'$.answer[0].text'});
 for(let i=0;i<30;i++)await create()({reason:'bad SECRET',path:'$.SECRET'});
 assert.equal(events.length,20);assert(!JSON.stringify(events).includes('SECRET'));clock+=60000;await create()({reason:'OUTPUT_JSON',path:'$'});assert.equal(events.length,21);
 await outputLoggerFactory(()=>{throw Error('SECRET');})()({reason:'OUTPUT_JSON',path:'$'});
 await outputLoggerFactory(()=>Promise.reject(Error('SECRET')))()({reason:'OUTPUT_JSON',path:'$'});
 const route=await readFile('app/api/assistant/generate/route.ts','utf8');assert(route.includes('onOutputDiagnostic:createOutputLogger()'));
 assert.equal(outbound,0);console.log(`Output hardening: ${checks} grounding scenarios + content-free logging/dedup/cap/failure isolation PASS; Provider outbound 0. Semantic speaker substitution remains a documented limitation.`);
}finally{globalThis.fetch=original;await loaded.dispose();}
