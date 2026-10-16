import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadUiModules} from './assistant-ui-test-loader.mjs';
let assertions=0;
const check=(value,message)=>{assert.ok(value,message);assertions++;};
const equal=(actual,expected,message)=>{assert.equal(actual,expected,message);assertions++;};
const a={evidenceId:'article-a',articleId:'article-a',storyId:'story-opaque',title:'보도 <script>alert(1)</script>',summary:'제작이 논의 중이다.',source:{id:'starwars',label:'StarWars.com',sourceClass:'official',displayClass:'공식 채널',certainty:'unclear'},published:'2026-10-15',category:'영화',url:'https://example.com/article',orderUncertain:true,truncated:{title:false,summary:false}};
const unsafe={...a,evidenceId:'article-b',articleId:'article-b',url:'javascript:alert(1)',title:'잘못된 링크',source:{...a.source,label:'다른 보도',sourceClass:'media',displayClass:'언론 보도'}};
const candidate={storyId:'story-opaque',representative:a,evidence:[a,unsafe],sourceCount:2,omittedArticleCount:2,orderUncertain:true,workIds:['w'],relatedWorks:[{id:'w',title:'아소카'}],independentVerification:false,score:10,matchedTermCoverage:1};
const fact={text:'보도에 따르면 제작이 논의 중이다. <script>무시</script>',evidenceIds:['article-a'],certainty:'attributed_report'};
const common={status:'ok',mode:'qa',evidence:[{...a,citation:1}],usedStories:[{storyId:'story-opaque',omittedArticleCount:2,orderUncertain:true,independentVerification:false}],relatedStories:[{storyId:'unused',omittedArticleCount:0,orderUncertain:false,independentVerification:false}],warnings:['요약만 사용합니다.'],archiveWindow:{from:'2026-07-18T00:00:00.000Z',to:'2026-10-16T00:00:00.000Z'},asOf:'2026-10-16T00:00:00.000Z'};
const qa={...common,result:{answer:[fact],limitations:['확인할 수 없는 사항이 있습니다.']}};
const script={...common,mode:'script',result:{facts:[{factId:'f1',...fact}],caveats:[{text:'발표와 보도를 구분합니다.',evidenceIds:['article-a']}],outline:[{heading:'도입',factIds:['f1'],creativeNote:'창작 연결'}],draft:[{kind:'fact',text:fact.text,factIds:['f1']},{kind:'creative',text:'함께 살펴보겠습니다.',factIds:[]}]}};
const loaded=await loadUiModules(['components/assistant/story-selection.tsx','components/assistant/assistant-result.tsx','components/assistant/api-client.ts'],{stubs:{'@/lib/assistant/generation':'','@/lib/assistant/service':''}});
try{
 const selection=loaded.modules['components/assistant/story-selection.tsx'];const result=loaded.modules['components/assistant/assistant-result.tsx'];const api=loaded.modules['components/assistant/api-client.ts'];
 const render=(component,props)=>renderToStaticMarkup(createElement(component,props));
 let html=render(selection.default,{candidates:[candidate],selected:['story-opaque'],mode:'qa',disabled:false,onToggle:()=>{}});
 check(html.includes('type="checkbox"')&&html.includes('checked=""'),'native selected checkbox');
 check(html.includes('최대 6개')&&html.includes('출처 2곳')&&html.includes('2개 미포함'),'Q&A selection cap, source and omitted count');
 check(html.includes('아소카')&&html.includes('보도 순서 불확실')&&html.includes('공식 채널'),'Work/source class and ordering uncertainty');
 check(html.includes('&lt;script&gt;')&&!html.includes('<script>'),'malicious administrator title escaped');
 check(html.includes('https://example.com/article')&&!html.includes('href="javascript:'),'unsafe source URL cannot become link');
 check(html.includes('aria-label="StarWars.com의')&&html.includes('rel="noopener noreferrer"'),'citation links have safe external attributes and labels');
 html=render(selection.SelectedReview,{candidates:[candidate],selected:[]});check(html.includes('생성할 소식을 선택해 주세요'),'script starts without selected evidence');
 html=render(selection.SelectedReview,{candidates:[candidate],selected:['story-opaque']});check(html.includes('기사 2개')&&html.includes('2개 미포함'),'review exposes exact evidence and omissions');
 html=render(result.default,{view:qa,stale:false,onMessage:()=>{}});
 check(html.includes('출처가 있는 보도')&&html.includes('한계')&&html.includes('확인할 수 없는 사항'),'Q&A certainty and limitation visible');
 check(html.includes('href="#assistant-citation-1"')&&html.includes('id="assistant-citation-1"'),'numbered server citations resolve');
 check(html.includes('선택했으나 인용되지 않은 소식')&&!html.includes('href="#assistant-citation-unused"'),'unused Story is never a citation');
 check(!html.includes('<script>')&&html.includes('&lt;script&gt;'),'malicious model text renders escaped');
 check(result.copyText(qa,'answer').includes('[1] 보도 <script>')&&result.copyText(qa,'answer').includes('https://example.com/article')&&result.copyText(qa,'answer').includes('최근 90일'),'answer copy keeps attribution, URL and archive scope');
 html=render(result.default,{view:script,stale:false,onMessage:()=>{}});
 check(html.includes('근거가 있는 핵심 사실')&&html.includes('보도 간 차이')&&html.includes('영상 구성안')&&html.includes('대본 초안'),'all script sections rendered');
 check(html.includes('창작 연결:')&&html.includes('근거 사실:'),'creative and factual draft distinguishable');
 check(result.copyText(script,'outline').includes('[1]')&&result.copyText(script,'draft').includes('창작:')&&result.copyText(script,'facts').includes('StarWars.com'),'separate copy controls retain references');
 html=render(result.default,{view:qa,stale:true,onMessage:()=>{}});check(html.includes('현재 근거로 다시 검증되지 않았습니다')&&!html.includes('답변과 출처 복사'),'inactive-tab result is marked stale, copy disabled');
 html=render(result.default,{view:qa,stale:false,inputChanged:true,onMessage:()=>{}});check(html.includes('이전 요청의 결과')&&!html.includes('답변과 출처 복사'),'changed Q&A input marks prior result and removes copy');
 check(!html.includes('아카이브가 바뀌었을 수 있습니다'),'input edits alone do not claim archive evidence changed');
 html=render(result.default,{view:script,stale:false,inputChanged:true,onMessage:()=>{}});
 check(html.includes('이전 요청의 결과')&&!html.includes('사실과 출처 복사')&&!html.includes('구성안과 출처 복사')&&!html.includes('초안과 출처 복사'),'changed script inputs remove every previous-result copy action');
 equal(api.settlementText({charged:5,refund:null}),'5 CR 사용 완료. 이 결과는 현재 화면에만 표시됩니다.','successful debit amount');
 check(api.settlementText({settlement:'failed',refund:{requested:5,applied:5,forfeited:0,full:true}}).includes('실제 적용 5'),'full refund receipt');
 check(api.settlementText({settlement:'failed',refund:{requested:5,applied:4,forfeited:1,full:false}}).includes('1 CR 영구 포기'),'partial refund never marked full');
 check(api.settlementText({settlement:'failed',refund:{requested:5,applied:0,forfeited:5,full:false}}).includes('실제 적용 0'),'zero refund terminal accounting');
 check(api.settlementText({settlement:'unknown',refund:null}).includes('확인할 수 없습니다'),'unknown settlement stays unknown');
 equal(api.displayUrl('javascript:alert(1)'),null,'unsafe citation URL rejected in client display');
}finally{await loaded.dispose();}
// Render the actual server page under both flag values. The disabled branch never reads a public archive.
globalThis.__assistantPage={enabled:false,reads:0};
const page=await loadUiModules(['app/assistant/page.tsx'],{stubs:{
 '@/app/newsroom':"export const Header=()=>null;",
 '@/components/navigation/public-footer':"export default function Footer(){return null;}",
 '@/components/navigation/scroll-to-top':"export default function Scroll(){return null;}",
 '@/lib/assistant/config':"export const assistantRetrievalConfig=()=>({enabled:globalThis.__assistantPage.enabled});",
 '@/lib/site-copy-repository':"export const loadSiteCopy=async()=>({siteFooterTagline:'t',siteFooterLegal:'l'});",
 '@/lib/news/archive':"export const loadArchive=async()=>{globalThis.__assistantPage.reads++;return {workOptions:[],stories:[],sources:[]};};",
 '@/lib/news/explorer':"export const storyCategories=()=>[];",
 '@/components/credit/client':"export const CREDIT_CHANGED='test';export const initializeGuestCredits=async()=>null;"
}});
try{
 const Page=page.modules['app/assistant/page.tsx'].default;
 let html=renderToStaticMarkup(await Page());check(html.includes('COMING SOON')&&!html.includes('무료로 소식 찾기'),'direct disabled page shows no functional inputs');equal(globalThis.__assistantPage.reads,0,'disabled direct access does not read archive');
 globalThis.__assistantPage.enabled=true;html=renderToStaticMarkup(await Page());check(html.includes('아카이브에 질문하기')&&html.includes('영상 대본 구성하기')&&html.includes('무료로 소식 찾기'),'explicit test flag renders both modes');equal(globalThis.__assistantPage.reads,1,'enabled page loads available filters');
}finally{await page.dispose();delete globalThis.__assistantPage;}
const css=await readFile('components/assistant/assistant-workspace.module.css','utf8'),workspace=await readFile('components/assistant/assistant-workspace.tsx','utf8');
check(css.includes('max-width:820px')&&css.includes('grid-template-columns:1fr')&&css.includes('max-width:550px'),'responsive 820 and narrow mobile rule');
check(css.includes('min-height:44px')&&css.includes(':focus-visible')&&css.includes('prefers-reduced-motion'),'touch, focus and reduced motion rules');
check(!/dangerouslySetInnerHTML|localStorage|sessionStorage|indexedDB|console\./.test(workspace),'no HTML interpretation, browser transcript persistence or logging');
console.log(`Assistant UI: ${assertions} assertions PASS; real React SSR, server flag gate, evidence/citation/attribution/settlement/privacy and responsive static contracts. Browser visual QA NOT TESTED.`);
