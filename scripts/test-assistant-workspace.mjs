import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadUiModules} from './assistant-ui-test-loader.mjs';
let assertions=0;const equal=(a,b,message)=>{assert.equal(a,b,message);assertions++;};const check=(value,message)=>{assert.ok(value,message);assertions++;};
const hooks={states:[],refs:[],effects:[],effectsEnabled:false,cursor:0,refCursor:0,effectCursor:0,useState(initial){const index=this.cursor++;if(!(index in this.states))this.states[index]=typeof initial==='function'?initial():initial;return [this.states[index],value=>{this.states[index]=typeof value==='function'?value(this.states[index]):value;}];},useRef(initial){const index=this.refCursor++;return this.refs[index]??(this.refs[index]={current:initial});},useEffect(effect,deps){if(!this.effectsEnabled)return;const index=this.effectCursor++,previous=this.effects[index];if(previous&&deps?.every((value,i)=>Object.is(value,previous.deps?.[i])))return;previous?.cleanup?.();this.effects[index]={deps,cleanup:effect()};},reset(){this.cursor=0;this.refCursor=0;this.effectCursor=0;},clear(){for(const effect of this.effects)effect?.cleanup?.();this.states=[];this.refs=[];this.effects=[];this.effectsEnabled=false;this.reset();}};
globalThis.__assistantUiHooks=hooks;
const reactStub="export const useState=(...args)=>globalThis.__assistantUiHooks.useState(...args);export const useRef=(...args)=>globalThis.__assistantUiHooks.useRef(...args);export const useEffect=(...args)=>globalThis.__assistantUiHooks.useEffect(...args);";
const clientStub="export const CREDIT_CHANGED='test';export const initializeGuestCredits=async()=>{globalThis.__creditRefreshes++;return globalThis.__account;};";
const loaded=await loadUiModules(['components/assistant/assistant-workspace.tsx','components/assistant/contracts.ts'],{stubs:{react:reactStub,'@/components/credit/client':clientStub}});
const oldFetch=globalThis.fetch;globalThis.__creditRefreshes=0;globalThis.__account={ownerType:'account',balance:100,cap:null,rewards:[],attendance:{streak:0,claimedToday:false,days:[]}};
let calls=[],scenario=null;const article={evidenceId:'a',articleId:'a',storyId:'s0',title:'제작 논의',summary:'보도에 따르면 제작이 논의 중이다.',source:{id:'starwars',label:'StarWars.com',sourceClass:'official',displayClass:'공식 채널',certainty:'unclear'},published:'2026-10-15',category:'영화',orderUncertain:false,truncated:{title:false,summary:false},url:'https://example.com/a'};
const candidates=Array.from({length:9},(_,index)=>({storyId:'s'+index,representative:{...article,storyId:'s'+index,evidenceId:'a'+index,articleId:'a'+index},evidence:[{...article,storyId:'s'+index,evidenceId:'a'+index,articleId:'a'+index}],sourceCount:1,omittedArticleCount:0,orderUncertain:false,relatedWorks:[],workIds:[],independentVerification:false,score:10,matchedTermCoverage:1}));
const retrieval={status:'ready',reason:'matched',candidates,workChoices:[],resolvedWork:null,searchTerms:['제작'],proposedStoryIds:candidates.slice(0,6).map(c=>c.storyId),receipt:'signed-receipt',archiveWindow:{from:'2026-07-18T00:00:00.000Z',to:'2026-10-16T00:00:00.000Z'},asOf:'2026-10-16T00:00:00.000Z'};
const response={status:'ok',mode:'qa',result:{answer:[{text:'제작이 논의 중이다.',evidenceIds:['a0'],certainty:'attributed_report'}],limitations:['선택된 요약만 사용했습니다.']},evidence:[{...article,citation:1,evidenceId:'a0'}],usedStories:[{storyId:'s0',omittedArticleCount:0,orderUncertain:false,independentVerification:false}],relatedStories:[],warnings:['요약 기반'],archiveWindow:retrieval.archiveWindow,asOf:retrieval.asOf,credit:{charged:5,refund:null}};
function mockFetch(path,init){calls.push({path,init,body:JSON.parse(init.body)});return scenario?scenario(path,init):Promise.resolve(Response.json(path.endsWith('retrieve')?retrieval:response));}
globalThis.fetch=mockFetch;
const Workspace=loaded.modules['components/assistant/assistant-workspace.tsx'].default,contract=loaded.modules['components/assistant/contracts.ts'];
const props={workOptions:[{id:'w',title:'아소카'}],categories:['영화'],sources:[{id:'starwars',name:'StarWars.com'}]};
function tree(){hooks.reset();return Workspace(props);}
function walk(node,predicate){if(!node)return null;if(Array.isArray(node)){for(const child of node){const found=walk(child,predicate);if(found)return found;}return null;}if(typeof node!=='object')return null;if(predicate(node))return node;if(typeof node.type==='function')return walk(node.type(node.props),predicate);return walk(node.props?.children,predicate);}
function button(element,label){return walk(element,node=>node.type==='button'&&typeof node.props.children==='string'&&node.props.children.includes(label));}
function buttonText(element,text){return walk(element,node=>node.type==='button'&&renderToStaticMarkup(node).includes(text));}
function candidateCheckbox(element,number){const label=walk(element,node=>node.type==='label'&&renderToStaticMarkup(node).includes(`소식 ${number} ·`));return walk(label,node=>node.type==='input'&&node.props.type==='checkbox');}
function field(element,id){return walk(element,node=>node.props?.id===id);}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function search(){const element=tree(),form=walk(element,node=>node.type==='form');form.props.onSubmit({preventDefault(){}});await tick();}
async function generate(){const element=tree(),submit=buttonText(element,'CR로 생성하기');check(submit&&!submit.props.disabled,'actionable generation button');submit.props.onClick();await tick();}
try{
 hooks.clear();let element=tree();let html=renderToStaticMarkup(element);check(html.includes('아카이브에 질문하기')&&html.includes('영상 구성 가이드 만들기'),'two modes visible');check(!html.includes('localStorage'),'no persistence disclosure bug');
 hooks.states[1]='제작';hooks.states[13]=globalThis.__account;
 await search();equal(calls.length,1,'one retrieval request');equal(calls[0].path,'/api/assistant/retrieve','retrieval route');equal(calls[0].init.credentials,'same-origin','same-origin cookies');equal(Object.keys(calls[0].body).sort().join(','),'filters,mode,query','only allowed retrieval properties');equal(hooks.states[5].length,6,'Q&A proposes server first six');
 element=tree();html=renderToStaticMarkup(element);check(html.includes('최대 6개')&&html.includes('선택한 근거'),'selection review renders six maximum');
 const checkbox=candidateCheckbox(element,7);check(checkbox.props.disabled,'seventh QA candidate cannot be selected');
 await generate();equal(calls.length,2,'one deliberate generation request');const first=calls[1].body;
 equal(Object.keys(first).sort().join(','),'includeDraft,instructions,mode,receipt,requestId,selectedStoryIds','generate exact request contract');
 equal(first.receipt,'signed-receipt','forward only signed receipt');equal(first.selectedStoryIds.length,6,'send selected IDs only');equal(first.includeDraft,false,'Q&A never draft');equal(first.instructions,'','Q&A blank style');check(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/iu.test(first.requestId),'fresh UUID v4');
 check(!Object.hasOwn(first,'price')&&!Object.hasOwn(first,'evidence')&&!Object.hasOwn(first,'model'),'no browser price/model/evidence authority');equal(globalThis.__creditRefreshes,1,'server-confirmed result refreshes shared Credit client');
 element=tree();html=renderToStaticMarkup(element);check(html.includes('5 CR 사용 완료')&&html.includes('출처가 있는 보도'),'actual Credit and cited result render');
 await generate();equal(calls.length,3,'explicit repeated click is a new action');check(calls[2].body.requestId!==first.requestId,'deliberate regeneration has fresh request identity');
 const secondId=calls[2].body.requestId,qaReceipt=hooks.states[4].receipt;
 field(tree(),'assistant-query').props.onChange({target:{value:'새 질문'}});
 html=renderToStaticMarkup(tree());check(html.includes('이전 요청의 결과')&&!html.includes('답변과 출처 복사'),'edited Q&A question labels previous result and removes copy');
 check(buttonText(tree(),'CR로 생성하기').props.disabled&&hooks.states[10],'edited question requires new retrieval');
 field(tree(),'assistant-query').props.onChange({target:{value:'제작'}});
 walk(tree(),node=>node.type==='select'&&node.props.value==='').props.onChange({target:{value:'w'}});
 html=renderToStaticMarkup(tree());check(html.includes('이전 요청의 결과')&&!html.includes('답변과 출처 복사'),'edited Q&A filter labels previous result and removes copy');
 equal(hooks.states[4].receipt,qaReceipt,'input edits retain prior receipt for review');equal(hooks.states[5].length,6,'input edits retain reviewed selection');equal(calls.length,3,'editing question/filter makes zero network calls');
 await search();check(hooks.states[7]===null&&!hooks.states[10],'explicit new retrieval clears previous result and dirty flag');await generate();
 check(calls.at(-1).body.requestId!==secondId,'new explicit generation creates a new UUID');check(!renderToStaticMarkup(tree()).includes('이전 요청의 결과'),'new successful result clears previous-input warning');
 scenario=()=>Promise.resolve(Response.json({status:'error',error:{code:'ARCHIVE_UNAVAILABLE',message:'아카이브를 읽을 수 없습니다.'}},{status:503}));
 await search();equal(hooks.states[5].length,6,'failed refresh preserves six reviewed Story selections');check(hooks.states[9]===true,'failed refresh marks old evidence stale');check(buttonText(tree(),'CR로 생성하기').props.disabled,'failed refresh cannot use previous receipt');scenario=null;
 hooks.clear();calls=[];hooks.states[1]='제작';hooks.states[13]={...globalThis.__account,ownerType:'guest',balance:10};await search();
 element=tree();html=renderToStaticMarkup(element);check(html.includes('Google 로그인'),'Guest is offered login');check(buttonText(element,'CR로 생성하기').props.disabled,'Guest has no actionable paid generate button');equal(calls.length,1,'Guest retrieval remains free');
 hooks.clear();calls=[];hooks.states[13]=globalThis.__account;
 element=tree();button(element,'영상 구성 가이드 만들기').props.onClick();hooks.states[1]='제작';await search();equal(hooks.states[5].length,0,'script initially selects zero Stories');
 element=tree();candidateCheckbox(element,1).props.onChange();
 element=tree();html=renderToStaticMarkup(element);check(html.includes('영상 구성 가이드 7 CR'),'planner cost before submit');
 check(!html.includes('대본 초안 포함')&&!html.includes('15 CR'),'Full Draft has no UI entry');
 // Eight selections are allowed, ninth is disabled; no automatic second request.
 for(let index=2;index<=8;index++)candidateCheckbox(tree(),index).props.onChange();
 equal(hooks.states[5].length,8,'script permits up to eight selections');element=tree();check(candidateCheckbox(element,9).props.disabled,'ninth Story disabled');
 scenario=(path,init)=>{const draft=JSON.parse(init.body).includeDraft;equal(draft,false,'guide never sends draft');return Promise.resolve(Response.json(path.endsWith('retrieve')?retrieval:{...response,mode:'script',result:{facts:[{factId:'f1',text:'제작 논의',evidenceIds:['a0'],certainty:'attributed_report'}],caveats:[],outline:[{heading:'도입',factIds:['f1'],creativeNote:''}],draft:draft?[{kind:'fact',text:'제작 논의',factIds:['f1']}]:[]},credit:{charged:draft?15:7,refund:null}}));};
 await generate();equal(calls.at(-1).body.includeDraft,false,'guide sends false');equal(calls.at(-1).body.selectedStoryIds.length,8,'eight reviewed IDs forwarded');equal(calls.filter(item=>item.path.endsWith('generate')).length,1,'guide is one call, no automatic follow-up');
 const scriptId=calls.at(-1).body.requestId,scriptReceipt=hooks.states[4].receipt;
 field(tree(),'assistant-instructions').props.onChange({target:{value:'차분한 해설'}});
 html=renderToStaticMarkup(tree());check(html.includes('이전 요청의 결과')&&!html.includes('사실과 출처 복사')&&!html.includes('초안과 출처 복사'),'edited script instructions label result and remove copy');
 check(!buttonText(tree(),'CR로 생성하기').props.disabled&&!hooks.states[10]&&!hooks.states[9],'style edit retains valid evidence and permits deliberate generation');
 equal(hooks.states[4].receipt,scriptReceipt,'guide preference edits preserve receipt');equal(hooks.states[5].length,8,'guide preference edits preserve selection');equal(calls.filter(item=>item.path.endsWith('generate')).length,1,'guide preference edits make zero provider calls');
 await generate();check(calls.at(-1).body.requestId!==scriptId&&calls.at(-1).body.instructions==='차분한 해설'&&calls.at(-1).body.includeDraft===false,'new explicit planner action uses new ID and preferences');
 check(renderToStaticMarkup(tree()).includes('7 CR 사용 완료')&&!renderToStaticMarkup(tree()).includes('이전 요청의 결과'),'successful planner result clears warning');
 hooks.states[9]=true;element=tree();check(buttonText(element,'CR로 생성하기').props.disabled,'stale evidence forbids paid generation');
 hooks.states[9]=false;hooks.states[10]=true;element=tree();check(buttonText(element,'CR로 생성하기').props.disabled,'changed search filters require explicit retrieval');
 hooks.clear();calls=[];scenario=path=>Promise.resolve(Response.json(path.endsWith('retrieve')?{...retrieval,status:'clarification',receipt:null,workChoices:[{id:'w',title:'아소카'}],candidates:[],proposedStoryIds:[]}:response));hooks.states[1]='아소카';hooks.states[13]=globalThis.__account;await search();
 html=renderToStaticMarkup(tree());check(html.includes('작품 또는 시즌')&&html.includes('새 검색을 눌러야'),'ambiguous Work requires user choice and explicit retrieval');equal(calls.filter(item=>item.path.endsWith('generate')).length,0,'ambiguity never calls generate');
 hooks.clear();calls=[];scenario=path=>Promise.resolve(Response.json(path.endsWith('retrieve')?{...retrieval,status:'insufficient_evidence',receipt:null,candidates:[],proposedStoryIds:[]}:response));hooks.states[1]='없는 소식';hooks.states[13]=globalThis.__account;await search();
 html=renderToStaticMarkup(tree());check(html.includes('AI 생성과 Credit 차감은 진행되지 않습니다'),'no evidence remains free');equal(calls.length,1,'no-evidence no generate');
 hooks.clear();calls=[];scenario=path=>Promise.resolve(Response.json(path.endsWith('retrieve')?retrieval:{status:'error',error:{code:'EVIDENCE_CHANGED',message:'근거가 변경됐습니다.'},credit:{settlement:'failed',refund:{requested:5,applied:4,forfeited:1,full:false}}},{status:path.endsWith('retrieve')?200:409}));hooks.states[1]='제작';hooks.states[13]=globalThis.__account;await search();await generate();
 html=renderToStaticMarkup(tree());check(html.includes('이전 Story를 새 Story에 자동 연결하지 않습니다'),'stale evidence does not remap');check(html.includes('실제 적용 4 CR')&&html.includes('1 CR 영구 포기'),'partial refund honestly presented');check(buttonText(tree(),'CR로 생성하기').props.disabled,'changed evidence blocks next spend');
 hooks.clear();calls=[];scenario=path=>Promise.resolve(Response.json(path.endsWith('retrieve')?retrieval:{status:'error',error:{code:'RESULT_NOT_RETAINED',message:'이미 처리됨'},credit:{settlement:'completed',refund:null}},{status:path.endsWith('retrieve')?200:409}));hooks.states[1]='제작';hooks.states[13]=globalThis.__account;await search();await generate();html=renderToStaticMarkup(tree());check(html.includes('결과는 저장되지 않아 다시 제공할 수 없습니다')&&html.includes('자동으로 다시 보내지 않습니다'),'lost delivery prevents automatic replay');equal(calls.filter(item=>item.path.endsWith('generate')).length,1,'duplicate ID did not cause retry');
 hooks.clear();calls=[];scenario=path=>Promise.resolve(Response.json(path.endsWith('retrieve')?retrieval:{status:'error',error:{code:'REFUND_PENDING',message:'정산 대기'},credit:{settlement:'unknown',refund:null}},{status:path.endsWith('retrieve')?200:503}));hooks.states[1]='제작';hooks.states[13]=globalThis.__account;await search();await generate();check(renderToStaticMarkup(tree()).includes('차감·환불 상태를 확인할 수 없습니다'),'unknown settlement not presented as refund');
 for(const [code,status,expected] of [
  ['INSUFFICIENT_BALANCE',409,'Credit으로는 이 생성을 요청할 수 없습니다'],
  ['LOGIN_REQUIRED',401,'Google 로그인'],
  ['ADMISSION_LIMIT',429,'잠시 후 다시 시도'],
  ['REQUEST_IN_PROGRESS',409,'같은 요청을 자동으로 다시 보내지 않습니다'],
  ['PROVIDER_TIMEOUT',504,'AI 응답 시간이 초과'],
  ['INVALID_OUTPUT',502,'근거 검증을 통과하지 못해 결과를 표시하지 않습니다'],
  ['EVIDENCE_CHANGED',409,'이전 Story를 새 Story에 자동 연결하지 않습니다'],
 ]){
  hooks.clear();calls=[];scenario=path=>Promise.resolve(Response.json(path.endsWith('retrieve')?retrieval:{status:'error',error:{code,message:code==='ADMISSION_LIMIT'?'잠시 후 다시 시도해 주세요.':code==='PROVIDER_TIMEOUT'?'AI 응답 시간이 초과됐습니다.':code==='INVALID_OUTPUT'?'근거 검증을 통과하지 못해 결과를 표시하지 않습니다.':code},credit:{settlement:'refund_pending',refund:null}},{status:path.endsWith('retrieve')?200:status}));
  hooks.states[1]='제작';hooks.states[13]=globalThis.__account;await search();await generate();
  check(renderToStaticMarkup(tree()).includes(expected),`${code} has actionable, safe UI`);
  equal(calls.filter(item=>item.path.endsWith('generate')).length,1,`${code} never automatically retries`);
 }
 hooks.clear();calls=[];scenario=path=>Promise.resolve(Response.json(path.endsWith('retrieve')?retrieval:{status:'error',error:{code:'PROVIDER_UNAVAILABLE',message:'제공자를 이용할 수 없습니다.'},credit:{settlement:'failed',refund:{requested:5,applied:0,forfeited:5,full:false}}},{status:path.endsWith('retrieve')?200:503}));hooks.states[1]='제작';hooks.states[13]=globalThis.__account;await search();await generate();check(renderToStaticMarkup(tree()).includes('실제 적용 0 CR')&&renderToStaticMarkup(tree()).includes('5 CR 영구 포기'),'zero-applied refund accurately rendered');
 // Real AbortController path: browser cancellation cannot prove provider or Credit settlement.
 hooks.clear();calls=[];scenario=(path,init)=>path.endsWith('retrieve')?Promise.resolve(Response.json(retrieval)):new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true}));hooks.states[1]='제작';hooks.states[13]=globalThis.__account;await search();element=tree();buttonText(element,'CR로 생성하기').props.onClick();element=tree();button(element,'요청 취소').props.onClick();await tick();html=renderToStaticMarkup(tree());check(html.includes('실제 차감 또는 환불 여부를 확인할 수 없습니다'),'cancel does not promise refund');equal(calls.filter(item=>item.path.endsWith('generate')).length,1,'cancellation does not retry');
 // Run the real visibility effect with synthetic DOM events; unrelated scenarios keep effects disabled.
 const oldWindow=globalThis.window,oldDocument=globalThis.document,visibilityListeners=new Map();
 globalThis.window={addEventListener(){},removeEventListener(){}};
 globalThis.document={visibilityState:'visible',addEventListener:(name,listener)=>visibilityListeners.set(name,listener),removeEventListener:name=>visibilityListeners.delete(name)};
 try{
  hooks.clear();hooks.effectsEnabled=true;calls=[];scenario=null;hooks.states[1]='제작';tree();await tick();await search();tree();
  const transition=value=>{globalThis.document.visibilityState=value;visibilityListeners.get('visibilitychange')();};
  transition('visible');check(!hooks.states[9],'initial visible event cannot mark evidence stale');
  transition('hidden');transition('visible');check(hooks.states[9]&&renderToStaticMarkup(tree()).includes('근거가 오래됐거나'),'hidden-to-visible marks old evidence stale');
  await search();tree();check(!hooks.states[9],'explicit successful retrieval clears stale state');
  transition('visible');check(!hooks.states[9],'redundant visible event does not reuse previous hidden state');
  transition('hidden');transition('visible');check(hooks.states[9],'new hidden-to-visible transition marks newly retrieved evidence stale');
  await search();tree();hooks.states[6]=Date.now()-9*60*1000-1;
  const before=calls.length;buttonText(tree(),'CR로 생성하기').props.onClick();await tick();
  check(hooks.states[9]&&calls.length===before,'nine-minute receipt guard blocks generation without network call');
 }finally{hooks.clear();globalThis.window=oldWindow;globalThis.document=oldDocument;scenario=null;}
 equal(contract.generationCost('qa'),5,'fixed Q&A disclosure');equal(contract.generationCost('script'),7,'fixed guide disclosure');
 const filtered=contract.retrievalFilters({workId:'w',category:'영화',sourceIds:['starwars'],dateFrom:'2020-01-01',dateTo:'2027-01-01'},Date.parse('2026-10-16T12:00:00Z'));
 check(filtered.workId==='w'&&filtered.category==='영화'&&filtered.sourceIds[0]==='starwars','supported filters only');
 check(Date.parse(filtered.dateFrom)>=Date.parse('2026-07-18T12:00:00Z')&&Date.parse(filtered.dateTo)<=Date.parse('2026-10-16T12:00:00Z'),'client date narrowing stays inside archive window');
 check(!calls.some(item=>item.path.includes('?')),'no prompt/query in URLs');
 console.log(`Assistant workspace: ${assertions} assertions PASS; two-mode handlers, exact same-origin payload, selection limits, Account gate, freshness, settlement and cancellation with injected API. Browser visual QA NOT TESTED.`);
}finally{globalThis.fetch=oldFetch;delete globalThis.__assistantUiHooks;delete globalThis.__creditRefreshes;delete globalThis.__account;await loaded.dispose();}
