import {mvpOutput} from './fixtures/assistant/mvp-output.mjs';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadUiModules} from './assistant-ui-test-loader.mjs';
let assertions=0;const equal=(a,b,message)=>{assert.equal(a,b,message);assertions++;};const check=(value,message)=>{assert.ok(value,message);assertions++;};
const hooks={states:[],refs:[],effects:[],effectsEnabled:false,cursor:0,refCursor:0,effectCursor:0,useState(initial){const index=this.cursor++;if(!(index in this.states))this.states[index]=typeof initial==='function'?initial():initial;return [this.states[index],value=>{this.states[index]=typeof value==='function'?value(this.states[index]):value;}];},useRef(initial){const index=this.refCursor++;return this.refs[index]??(this.refs[index]={current:initial});},useEffect(effect,deps){if(!this.effectsEnabled){if(deps?.length===1&&typeof deps[0]==='boolean')effect();return;}const index=this.effectCursor++,previous=this.effects[index];if(previous&&deps?.every((value,i)=>Object.is(value,previous.deps?.[i])))return;previous?.cleanup?.();this.effects[index]={deps,cleanup:effect()};},reset(){this.cursor=0;this.refCursor=0;this.effectCursor=0;},clear(){for(const effect of this.effects)effect?.cleanup?.();this.states=[];this.states[19]=true;this.refs=[];this.effects=[];this.effectsEnabled=false;this.reset();}};
globalThis.__assistantUiHooks=hooks;
const reactStub="export const useState=(...args)=>globalThis.__assistantUiHooks.useState(...args);export const useRef=(...args)=>globalThis.__assistantUiHooks.useRef(...args);export const useEffect=(...args)=>globalThis.__assistantUiHooks.useEffect(...args);";
const clientStub="export const CREDIT_CHANGED='test';export const initializeGuestCredits=async()=>{globalThis.__creditRefreshes++;return globalThis.__account;};";
const loaded=await loadUiModules(['components/assistant/assistant-workspace.tsx','components/assistant/contracts.ts'],{stubs:{react:reactStub,'@/components/credit/client':clientStub}});
const oldFetch=globalThis.fetch;globalThis.__creditRefreshes=0;globalThis.__account={policy:{version:1,prices:{qa:5,planner:7},rewards:{guestFirst:1,opening:1,attendanceDaily:1,attendanceDay7:5,quizCorrect:3,accountFirst:3}},ownerType:'account',balance:100,cap:null,rewards:[],attendance:{streak:0,claimedToday:false,days:[]}};
let calls=[],scenario=null;const article={evidenceId:'a',articleId:'a',storyId:'s0',title:'제작 논의',summary:'보도에 따르면 제작이 논의 중이다.',source:{id:'starwars',label:'StarWars.com',sourceClass:'official',displayClass:'공식 채널',certainty:'unclear'},published:'2026-10-15',category:'영화',orderUncertain:false,truncated:{title:false,summary:false},url:'https://example.com/a'};
const candidates=Array.from({length:9},(_,index)=>({storyId:'s'+index,representative:{...article,storyId:'s'+index,evidenceId:'a'+index,articleId:'a'+index},evidence:[{...article,storyId:'s'+index,evidenceId:'a'+index,articleId:'a'+index}],sourceCount:1,omittedArticleCount:0,orderUncertain:false,relatedWorks:[],workIds:[],independentVerification:false,score:10,matchedTermCoverage:1}));
const retrieval={resultExpiresAt:Date.now()+600000,credit:{charged:1},status:'ready',reason:'matched',candidates,workChoices:[],resolvedWork:null,searchTerms:['제작'],proposedStoryIds:candidates.slice(0,6).map(c=>c.storyId),receipt:'signed-receipt',archiveWindow:{from:'2026-07-18T00:00:00.000Z',to:'2026-10-16T00:00:00.000Z'},asOf:'2026-10-16T00:00:00.000Z'};
const response={status:'ok',mode:'qa',result:{answer:'제작이 논의 중이다.',evidenceIds:['a0'],limitations:['선택된 요약만 사용했습니다.']},evidence:[{...article,citation:1,evidenceId:'a0'}],usedStories:[{storyId:'s0',omittedArticleCount:0,orderUncertain:false,independentVerification:false}],relatedStories:[],warnings:['요약 기반'],archiveWindow:retrieval.archiveWindow,asOf:retrieval.asOf,credit:{charged:5,refund:null}};
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
async function search(){const element=tree();(buttonText(element,'근거를 먼저 선택')??buttonText(element,'동일 요청으로 검색 결과 복구')).props.onClick();for(let i=0;i<100&&hooks.states[8]==='searching';i++)await tick();}
function generationButton(element){return buttonText(element,'CR로 생성하기')??buttonText(element,'추가 생성 비용 확인');}
async function generate(){const submit=generationButton(tree());check(submit&&!submit.props.disabled,'actionable generation button');const before=calls.length;submit.props.onClick();await tick();const confirmation=buttonText(tree(),'사용에 동의하고 생성');if(confirmation){equal(calls.length,before,'opening additional cost confirmation does not send a request');confirmation.props.onClick();await tick();}}
try{
 hooks.clear();hooks.states[19]=false;hooks.states[1]='안녕';hooks.states[13]=globalThis.__account;calls=[];
 scenario=()=>Promise.resolve(Response.json({status:'ok',mode:'chat',answer:'<script>alert(1)</script> 안녕하세요',credit:{charged:5,refund:null}}));
 const direct=tree();check(renderToStaticMarkup(direct).includes('최대 5 CR'),'direct cost shown');
 await walk(direct,node=>node.type==='form').props.onSubmit({preventDefault(){}});await tick();
 equal(calls.length,1,'direct chat has no retrieval');equal(calls[0].body.mode,'chat');
 const directHtml=renderToStaticMarkup(tree());check(directHtml.includes('&lt;script&gt;')&&!directHtml.includes('<script>'),'chat answer rendered only as text');
 scenario=null;calls=[];globalThis.__creditRefreshes=0;
 hooks.clear();let element=tree();let html=renderToStaticMarkup(element);check(html.includes('뉴스 Q&amp;A')&&html.includes('영상 구성안 플래너'),'two modes visible');check(!html.includes('localStorage'),'no persistence disclosure bug');
 hooks.states[1]='제작';hooks.states[13]=globalThis.__account;
 await search();equal(calls.length,1,'one retrieval request');equal(calls[0].path,'/api/assistant/retrieve','retrieval route');equal(calls[0].init.credentials,'same-origin','same-origin cookies');equal(Object.keys(calls[0].body).sort().join(','),'filters,mode,query,requestId','only allowed retrieval properties');equal(hooks.states[5].length,3,'Q&A recommends three');for(let n=4;n<=6;n++)candidateCheckbox(tree(),n).props.onChange();
 element=tree();html=renderToStaticMarkup(element);check(html.includes('최대 6개')&&html.includes('선택한 근거'),'selection review renders six maximum');
 const checkbox=candidateCheckbox(element,7);check(checkbox.props.disabled,'seventh QA candidate cannot be selected');
 await generate();equal(calls.length,2,'one deliberate generation request');const first=calls[1].body;
 equal(Object.keys(first).sort().join(','),'includeDraft,instructions,mode,policyVersion,receipt,requestId,selectedStoryIds','generate exact request contract');
 equal(first.receipt,'signed-receipt','forward only signed receipt');equal(first.selectedStoryIds.length,6,'send selected IDs only');equal(first.includeDraft,false,'Q&A never draft');equal(first.instructions,'','Q&A blank style');check(/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/iu.test(first.requestId),'fresh UUID v4');
 check(!Object.hasOwn(first,'price')&&!Object.hasOwn(first,'evidence')&&!Object.hasOwn(first,'model'),'no browser price/model/evidence authority');equal(globalThis.__creditRefreshes,2,'server-confirmed result refreshes shared Credit client');
 element=tree();html=renderToStaticMarkup(element);check(html.includes('5 CR 사용 완료')&&html.includes('참고 기사'),'actual Credit and cited result render');
 await generate();equal(calls.length,3,'explicit repeated click is a new action');check(calls[2].body.requestId!==first.requestId,'deliberate regeneration has fresh request identity');
 const secondId=calls[2].body.requestId,qaReceipt=hooks.states[4].receipt;
 field(tree(),'assistant-query').props.onChange({target:{value:'새 질문'}});
 html=renderToStaticMarkup(tree());check(html.includes('이전 요청의 결과')&&!html.includes('답변과 출처 복사'),'edited Q&A question labels previous result and removes copy');
 check(generationButton(tree()).props.disabled&&hooks.states[10],'edited question requires new retrieval');
 field(tree(),'assistant-query').props.onChange({target:{value:'제작'}});
 walk(tree(),node=>node.type==='select'&&node.props.value==='').props.onChange({target:{value:'w'}});
 html=renderToStaticMarkup(tree());check(html.includes('이전 요청의 결과')&&!html.includes('답변과 출처 복사'),'edited Q&A filter labels previous result and removes copy');
 equal(hooks.states[4].receipt,qaReceipt,'input edits retain prior receipt for review');equal(hooks.states[5].length,6,'input edits retain reviewed selection');equal(calls.length,3,'editing question/filter makes zero network calls');
 await search();check(hooks.states[7]===null&&!hooks.states[10],'explicit new retrieval clears previous result and dirty flag');await generate();
 check(calls.at(-1).body.requestId!==secondId,'new explicit generation creates a new UUID');check(!renderToStaticMarkup(tree()).includes('이전 요청의 결과'),'new successful result clears previous-input warning');
 scenario=()=>Promise.resolve(Response.json({status:'error',error:{code:'ARCHIVE_UNAVAILABLE',message:'아카이브를 읽을 수 없습니다.'}},{status:503}));
 await search();equal(hooks.states[5].length,3,'failed refresh preserves reviewed Story selections');check(hooks.states[9]===true,'failed refresh marks old evidence stale');check(generationButton(tree()).props.disabled,'failed refresh cannot use previous receipt');scenario=null;
 hooks.clear();calls=[];hooks.states[1]='제작';hooks.states[13]={...globalThis.__account,policy:{version:1,prices:{qa:5,planner:7},rewards:{guestFirst:1,opening:1,attendanceDaily:1,attendanceDay7:5,quizCorrect:3,accountFirst:3}},ownerType:'guest',balance:10};await search();
 element=tree();html=renderToStaticMarkup(element);check(html.includes('Google 로그인'),'Guest is offered login');check(buttonText(element,'근거를 먼저 선택').props.disabled,'Guest paid search blocked');equal(calls.length,0,'Guest retrieval makes no request');
 hooks.clear();calls=[];hooks.states[13]=globalThis.__account;
 element=tree();button(element,'영상 구성안 플래너').props.onClick();hooks.states[1]='제작';await search();equal(hooks.states[5].length,3,'guide recommends three Stories');
 element=tree();
 element=tree();html=renderToStaticMarkup(element);check(html.includes('영상 구성안 플래너 7 CR'),'planner cost before submit');
 check(!html.includes('대본 초안 작성')&&!html.includes('15 CR'),'Full Draft has no UI entry');
 // Eight selections are allowed, ninth is disabled; no automatic second request.
 for(let index=4;index<=8;index++)candidateCheckbox(tree(),index).props.onChange();
 equal(hooks.states[5].length,8,'script permits up to eight selections');element=tree();check(candidateCheckbox(element,9).props.disabled,'ninth Story disabled');
 scenario=(path,init)=>{const draft=JSON.parse(init.body).includeDraft;equal(draft,false,'guide never sends draft');return Promise.resolve(Response.json(path.endsWith('retrieve')?retrieval:{...response,mode:'script',result:{...mvpOutput('script',[{...article,evidenceId:'a0'}]),caveats:[]},credit:{charged:draft?15:7,refund:null}}));};
 await generate();equal(calls.at(-1).body.includeDraft,false,'guide sends false');equal(calls.at(-1).body.selectedStoryIds.length,8,'eight reviewed IDs forwarded');equal(calls.filter(item=>item.path.endsWith('generate')).length,1,'guide is one call, no automatic follow-up');
 const scriptId=calls.at(-1).body.requestId,scriptReceipt=hooks.states[4].receipt;
 walk(tree(),node=>node.type==='textarea'&&node.props['aria-label']==='구성 방향 요청').props.onChange({target:{value:'차분한 해설'}});
 html=renderToStaticMarkup(tree());check(html.includes('이전 요청의 결과')&&!html.includes('사실과 출처 복사')&&!html.includes('초안과 출처 복사'),'edited script instructions label result and remove copy');
 check(!generationButton(tree()).props.disabled&&!hooks.states[10]&&!hooks.states[9],'style edit retains valid evidence and permits deliberate generation');
 equal(hooks.states[4].receipt,scriptReceipt,'guide preference edits preserve receipt');equal(hooks.states[5].length,8,'guide preference edits preserve selection');equal(calls.filter(item=>item.path.endsWith('generate')).length,1,'guide preference edits make zero provider calls');
 await generate();check(calls.at(-1).body.requestId!==scriptId&&calls.at(-1).body.instructions==='차분한 해설'&&calls.at(-1).body.includeDraft===false,'new explicit planner action uses new ID and preferences');
 check(renderToStaticMarkup(tree()).includes('7 CR 사용 완료')&&!renderToStaticMarkup(tree()).includes('이전 요청의 결과'),'successful planner result clears warning');
 hooks.states[9]=true;element=tree();check(generationButton(element).props.disabled,'stale evidence forbids paid generation');
 hooks.states[9]=false;hooks.states[10]=true;element=tree();check(generationButton(element).props.disabled,'changed search filters require explicit retrieval');
 hooks.clear();calls=[];scenario=path=>Promise.resolve(Response.json(path.endsWith('retrieve')?{...retrieval,status:'clarification',receipt:null,workChoices:[{id:'w',title:'아소카'}],candidates:[],proposedStoryIds:[]}:response));hooks.states[1]='아소카';hooks.states[13]=globalThis.__account;await search();
 html=renderToStaticMarkup(tree());check(html.includes('작품 또는 시즌')&&html.includes('새 검색을 눌러야'),'ambiguous Work requires user choice and explicit retrieval');equal(calls.filter(item=>item.path.endsWith('generate')).length,0,'ambiguity never calls generate');
 hooks.clear();calls=[];scenario=path=>Promise.resolve(Response.json(path.endsWith('retrieve')?{...retrieval,status:'insufficient_evidence',receipt:null,candidates:[],proposedStoryIds:[]}:response));hooks.states[1]='없는 소식';hooks.states[13]=globalThis.__account;await search();
 html=renderToStaticMarkup(tree());check(html.includes('AI 생성과 Credit 차감은 진행되지 않습니다'),'no evidence remains free');equal(calls.length,1,'no-evidence no generate');
 hooks.clear();calls=[];scenario=path=>Promise.resolve(Response.json(path.endsWith('retrieve')?retrieval:{status:'error',error:{code:'EVIDENCE_CHANGED',message:'근거가 변경됐습니다.'},credit:{settlement:'failed',refund:{requested:5,applied:4,forfeited:1,full:false}}},{status:path.endsWith('retrieve')?200:409}));hooks.states[1]='제작';hooks.states[13]=globalThis.__account;await search();await generate();
 html=renderToStaticMarkup(tree());check(html.includes('이전 Story를 새 Story에 자동 연결하지 않습니다'),'stale evidence does not remap');check(html.includes('실제 적용 4 CR')&&html.includes('1 CR 영구 포기'),'partial refund honestly presented');check(generationButton(tree()).props.disabled,'changed evidence blocks next spend');
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
 // Run the real visibility effect with synthetic DOM events; unrelated scenarios keep effects disabled.
 const oldWindow=globalThis.window,oldDocument=globalThis.document,visibilityListeners=new Map();
 globalThis.window={addEventListener(){},removeEventListener(){}};
 globalThis.document={visibilityState:'visible',addEventListener:(name,listener)=>visibilityListeners.set(name,listener),removeEventListener:name=>visibilityListeners.delete(name)};
 try{
  hooks.clear();hooks.effectsEnabled=true;calls=[];scenario=null;hooks.states[1]='제작';tree();await tick();await search();tree();
  const transition=value=>{globalThis.document.visibilityState=value;visibilityListeners.get('visibilitychange')();};
  transition('visible');check(!hooks.states[9],'initial visible event cannot mark evidence stale');
  const realNow=Date.now;transition('hidden');Date.now=()=>realNow()+60000;transition('visible');check(!hooks.states[9]&&!generationButton(tree()).props.disabled,'one minute hidden-to-visible retains valid receipt');Date.now=realNow;
  candidateCheckbox(tree(),1).props.onChange();check(!generationButton(tree()).props.disabled,'allowed subset selection retains receipt');
  await search();tree();check(!hooks.states[9],'explicit successful retrieval clears stale state');
  transition('visible');check(!hooks.states[9],'redundant visible event does not reuse previous hidden state');
  transition('hidden');transition('visible');check(!hooks.states[9],'repeat tab switch retains receipt');
  await search();tree();hooks.states[6]=Date.now()-1;
  const before=calls.length;generationButton(tree()).props.onClick();await tick();
  check(hooks.states[9]&&calls.length===before,'server expiry guard blocks generation without network call');
 }finally{hooks.clear();globalThis.window=oldWindow;globalThis.document=oldDocument;scenario=null;}
 // New prices are server data. A rejected quote refreshes that data without repeating generation.
 hooks.clear();calls=[];scenario=null;hooks.states[1]='제작';hooks.states[13]=globalThis.__account;await search();
 const oldPolicy=globalThis.__account.policy;globalThis.__account={...globalThis.__account,policy:{...oldPolicy,version:2,prices:{qa:9,planner:11}}};
 scenario=path=>Promise.resolve(Response.json(path.endsWith('retrieve')?retrieval:{status:'error',error:{code:'PRICE_CHANGED',message:'가격이 변경되었습니다.'}},{status:path.endsWith('retrieve')?200:409}));
 await generate();await tick();equal(calls.filter(c=>c.path.endsWith('generate')).length,1,'quote change never automatically repeats paid request');equal(calls.at(-1).body.policyVersion,1,'old displayed quote version is sent');check(renderToStaticMarkup(tree()).includes('답변 9 CR'),'server-refreshed current price is visible');
 scenario=null;await generate();equal(calls.at(-1).body.policyVersion,2,'only explicit next action uses confirmed new revision');equal(calls.filter(c=>c.path.endsWith('generate')).length,2,'one request per explicit action');
 globalThis.__account={...globalThis.__account,policy:oldPolicy};equal(contract.generationCost('qa'),null,'unknown policy never invents a price');
 equal(contract.generationCost('qa',globalThis.__account.policy),5,'server Q&A disclosure');equal(contract.generationCost('script',globalThis.__account.policy),7,'server guide disclosure');
 const filtered=contract.retrievalFilters({workId:'w',category:'영화',sourceIds:['starwars'],dateFrom:'2020-01-01',dateTo:'2027-01-01'},Date.parse('2026-10-16T12:00:00Z'));
 check(filtered.workId==='w'&&filtered.category==='영화'&&filtered.sourceIds[0]==='starwars','supported filters only');
 check(Date.parse(filtered.dateFrom)>=Date.parse('2026-07-18T12:00:00Z')&&Date.parse(filtered.dateTo)<=Date.parse('2026-10-16T12:00:00Z'),'client date narrowing stays inside archive window');
 // One explicit consent orchestrates at most one search and one generation.
 async function combined(){const form=walk(tree(),n=>n.type==='form');form.props.onSubmit({preventDefault(){}});for(let i=0;i<200&&['searching','generating'].includes(hooks.states[8]);i++)await tick();}
 hooks.clear();calls=[];scenario=null;hooks.states[1]='제작';hooks.states[13]=globalThis.__account;
 await combined();equal(calls.length,2,'combined consent makes exactly two requests');equal(calls[1].body.selectedStoryIds.length,3,'combined flow uses three valid recommended Stories');equal(hooks.states[8],'completed','combined flow displays final result');
 hooks.clear();calls=[];hooks.states[1]='제작';hooks.states[13]=globalThis.__account;
 const form=walk(tree(),n=>n.type==='form');form.props.onSubmit({preventDefault(){}});form.props.onSubmit({preventDefault(){}});for(let i=0;i<200&&['searching','generating'].includes(hooks.states[8]);i++)await tick();equal(calls.length,2,'synchronous duplicate submit has one search and one generation');
 for(const status of ['clarification','insufficient_evidence']){
  hooks.clear();calls=[];hooks.states[1]='제작';hooks.states[13]=globalThis.__account;
  scenario=()=>Promise.resolve(Response.json({...retrieval,status,receipt:null,credit:{charged:0},candidates:[],proposedStoryIds:[]}));await combined();equal(calls.length,1,status+' never generates');
 }
 hooks.clear();calls=[];hooks.states[1]='제작';hooks.states[13]=globalThis.__account;
 scenario=()=>Promise.resolve(Response.json({...retrieval,resultExpiresAt:Date.now()-1}));await combined();equal(calls.length,1,'expired search receipt stops combined flow');check(generationButton(tree()).props.disabled,'expired receipt disables button');
 // Closing during search ends permission to start a new generation, reopening is passive.
 hooks.clear();calls=[];hooks.states[1]='제작';hooks.states[13]=globalThis.__account;let release;
 scenario=()=>new Promise(resolve=>{release=resolve;});walk(tree(),n=>n.type==='form').props.onSubmit({preventDefault(){}});for(let i=0;i<100&&!release;i++)await tick();
 hooks.reset();Workspace({...props,active:false});release(Response.json(retrieval));for(let i=0;i<100&&hooks.states[8]==='searching';i++)await tick();equal(calls.length,1,'closing during search prevents chained spend');tree();equal(calls.length,1,'reopening does not issue requests');
 // Unknown search: same UUID recovery only, no generation under the old consent.
 hooks.clear();calls=[];hooks.states[1]='제작';hooks.states[13]=globalThis.__account;scenario=()=>Promise.reject(Error('lost response'));await combined();check(hooks.states[16],'search recovery mode');const lostId=calls[0].body.requestId;
 scenario=null;hooks.states[13]={...globalThis.__account,balance:0};hooks.states[1]='다른 질문';await search();equal(calls.length,1,'unresolved search cannot create a new UUID for changed input');hooks.states[1]='제작';await search();equal(calls.length,2,'zero-balance manual search recovery does not generate');equal(calls[1].body.requestId,lostId,'lost search reuses UUID');
 // Unknown generation blocks later spending, including after a panel reopen.
 hooks.clear();calls=[];hooks.states[1]='제작';hooks.states[13]=globalThis.__account;scenario=path=>path.endsWith('retrieve')?Promise.resolve(Response.json(retrieval)):Promise.reject(Error('lost output'));await combined();check(hooks.states[15],'unknown generation blocks spend');const beforeUnknown=calls.length;await combined();equal(calls.length,beforeUnknown,'unknown generation never retries with a new UUID');
 // A policy change while searching never silently expands consent.
 hooks.clear();calls=[];hooks.states[1]='제작';hooks.states[13]=globalThis.__account;const quoted=globalThis.__account;globalThis.__account={...quoted,policy:{...quoted.policy,version:99}};scenario=null;await combined();equal(calls.length,1,'policy drift stops chained generation');globalThis.__account=quoted;
 // Guide uses the same consent machinery, with draft disabled and ranked candidates.
 hooks.clear();calls=[];hooks.states[13]=globalThis.__account;button(tree(),'영상 구성안 플래너').props.onClick();hooks.states[1]='제작';
 scenario=(path)=>Promise.resolve(Response.json(path.endsWith('retrieve')?{...retrieval,proposedStoryIds:[]}:response));await combined();equal(calls.length,2,'guide can select first three candidates when no proposed IDs');equal(calls[1].body.mode,'script','guide mode sent');equal(calls[1].body.includeDraft,false,'draft stays disabled');
 // A settled failure consumes the original consent. New UUID requires a second priced confirmation.
 hooks.clear();calls=[];hooks.states[1]='제작';hooks.states[13]=globalThis.__account;
 scenario=path=>Promise.resolve(Response.json(path.endsWith('retrieve')?retrieval:{status:'error',error:{code:'INVALID_OUTPUT',message:'근거 검증을 통과하지 못해 결과를 표시하지 않습니다.'},credit:{settlement:'failed',refund:{requested:5,applied:5,forfeited:0,full:true}}},{status:path.endsWith('retrieve')?200:502}));
 await combined();equal(calls.length,2,'one consent sends one search and one failed generation');
 html=renderToStaticMarkup(tree());check(html.includes('생성 응답 검증 실패')&&html.includes('실제 적용 5 CR'),'failure category and actual refund shown');check(!html.includes('선택한 기사를 참고해 결과를 만들고 있습니다'),'terminal failure clears busy notice');
 for(let i=0;i<3;i++){tree();await tick();}equal(calls.length,2,'settled failure does not auto-generate');
 generationButton(tree()).props.onClick();await tick();equal(calls.length,2,'retry entry only opens cost confirmation');
 html=renderToStaticMarkup(tree());check(html.includes('추가 5 CR')&&html.includes('사용에 동의하고 생성'),'renewed price/consent explicit');
 buttonText(tree(),'취소').props.onClick();await tick();equal(calls.length,2,'cancel costs nothing');
 generationButton(tree()).props.onClick();await tick();hooks.reset();Workspace({...props,active:false});tree();
 check(!buttonText(tree(),'사용에 동의하고 생성'),'close cancels pending consent');equal(calls.length,2,'reopen cannot replay consent');
 generationButton(tree()).props.onClick();await tick();const confirm=buttonText(tree(),'사용에 동의하고 생성');confirm.props.onClick();confirm.props.onClick();await tick();
 equal(calls.length,3,'double confirmation creates exactly one additional generation');check(calls[2].body.requestId!==calls[1].body.requestId,'renewed consent has new request ID');
 generationButton(tree()).props.onClick();await tick();candidateCheckbox(tree(),1).props.onChange();buttonText(tree(),'사용에 동의하고 생성').props.onClick();await tick();equal(calls.length,3,'changed evidence invalidates pending consent');
 // A malicious/inconsistent pending-refund envelope cannot be presented as a finished refund.
 hooks.clear();calls=[];hooks.states[1]='제작';hooks.states[13]=globalThis.__account;
 scenario=path=>Promise.resolve(Response.json(path.endsWith('retrieve')?retrieval:{status:'error',error:{code:'INVALID_OUTPUT',message:'검증 실패'},credit:{settlement:'refund_pending',refund:{requested:5,applied:5,forfeited:0,full:true}}},{status:path.endsWith('retrieve')?200:502}));
 await combined();html=renderToStaticMarkup(tree());check(html.includes('환불 정산 대기')&&!html.includes('환불 완료:'),'pending settlement wins over refund-shaped data');check(generationButton(tree()).props.disabled,'pending settlement forbids additional payment');
 hooks.clear();calls=[];hooks.states[1]='제작';hooks.states[13]=globalThis.__account;
 scenario=path=>Promise.resolve(Response.json(path.endsWith('retrieve')?retrieval:{status:'error',error:{code:'INVALID_OUTPUT',message:'검증 실패'},credit:{settlement:'failed',refund:null}},{status:path.endsWith('retrieve')?200:502}));
 await combined();check(generationButton(tree()).props.disabled,'failed response without refund receipt requires settlement confirmation');
 scenario=null;
 check(!calls.some(item=>item.path.includes('?')),'no prompt/query in URLs');
 console.log(`Assistant workspace: ${assertions} assertions PASS; two-mode handlers, exact same-origin payload, selection limits, Account gate, freshness, settlement, recovery and single-consent flow with injected API. Browser visual QA NOT TESTED.`);
}finally{globalThis.fetch=oldFetch;delete globalThis.__assistantUiHooks;delete globalThis.__creditRefreshes;delete globalThis.__account;await loaded.dispose();}
