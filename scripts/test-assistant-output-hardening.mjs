import {mvpOutput} from './fixtures/assistant/mvp-output.mjs';
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
 const raw=mvpOutput(mode,[a]);if(mode==='qa')raw.answer=text;else raw.sections[0].points[0]=text;
 return {input:{mode,includeDraft:false},selected:{evidence:[{storyId:'s',evidence:[a],omittedArticleCount:0}],archiveWindow:{},asOf:'2026-10-23'},raw};
}
const test=(f,reason)=>{checks++;if(reason)assert.throws(()=>validate(f.raw,f.input,f.selected),e=>e.code==='INVALID_OUTPUT'&&e.diagnostic.reason===reason);else assert.equal(validate(f.raw,f.input,f.selected).status,'ok');};
try{
 for(const mode of ['qa','script']){
  const sentence='감독은 현장에서 모형을 사용했다고 설명했다.';
  test(fixture(mode,'개봉은 내년으로 예정돼 있다. '+sentence,sentence,'보도에 따르면 감독은 현장에서 모형을 사용했다.'));
  for(const [summary,text] of [
   ['개봉은 내년으로 예정돼 있다.','개봉일은 확정됐다.'],
   ['제작은 논의 중이다.','제작이 확정됐다.'],
   ['출연설은 루머다.','출연은 사실이다.'],
   ['제작은 시작되지 않았다.','제작은 시작됐다.'],
  ])test(fixture(mode,summary,'',text),'UNCERTAINTY_LOST');
  test(fixture(mode,sentence,'','제작사는 공식 발표했다.'),'OFFICIAL_PROMOTION');
  test(fixture(mode,sentence,'','공식 발표 여부는 선택한 자료에서 확인할 수 없습니다.'));
  test(fixture(mode,sentence,'','공식 발표와 보도를 구분하세요.'));
  test(fixture(mode,sentence,'','2035년 5월 8일 개봉한다.'),'UNSUPPORTED_NUMBER');
  // No exact quote required for a safe paraphrase.
  test(fixture(mode,sentence,'','감독은 모형을 활용한 현장 작업을 설명했습니다.'));
  const unknown=fixture(mode,sentence,'',sentence);
  if(mode==='qa')unknown.raw.evidenceIds=['unselected'];else unknown.raw.sections[0].evidenceIds=['unselected'];test(unknown,'UNKNOWN_EVIDENCE');
  const multi=fixture(mode,'제작은 논의 중이다.','','제작이 확정됐다.');
  multi.selected.evidence[0].evidence.push({...multi.selected.evidence[0].evidence[0],evidenceId:'b',summary:'개봉도 검토 중이다.'});test(multi,'UNCERTAINTY_LOST');
 }

 let clock=100000;const events=[];const create=outputLoggerFactory(e=>events.push(e),()=>clock);
 const observer=create();await observer({stage:'SECRET',reason:'UNCERTAINTY_LOST',path:'$.answer[0].text',raw:'SECRET'});await observer({reason:'OUTPUT_JSON',path:'$'});
 assert.equal(events.length,1);assert.deepEqual(events[0],{event:'ASSISTANT_OUTPUT_DIAGNOSTIC_V1',stage:'grounding',reason:'UNCERTAINTY_LOST',path:'$.answer[0].text'});
 for(let i=0;i<30;i++)await create()({reason:'bad SECRET',path:'$.SECRET'});
 assert.equal(events.length,20);assert(!JSON.stringify(events).includes('SECRET'));clock+=60000;await create()({reason:'OUTPUT_JSON',path:'$'});assert.equal(events.length,21);
 await outputLoggerFactory(()=>{throw Error('SECRET');})()({reason:'OUTPUT_JSON',path:'$'});
 await outputLoggerFactory(()=>Promise.reject(Error('SECRET')))()({reason:'OUTPUT_JSON',path:'$'});
 const route=await readFile('app/api/assistant/free/route.ts','utf8');assert(route.includes('onOutputDiagnostic:createOutputLogger()'));
 assert.equal(outbound,0);console.log(`Output hardening: ${checks} grounding scenarios + content-free logging/dedup/cap/failure isolation PASS; Provider outbound 0. Semantic speaker substitution remains a documented limitation.`);
}finally{globalThis.fetch=original;await loaded.dispose();}
