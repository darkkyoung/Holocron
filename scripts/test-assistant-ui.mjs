import {mvpOutput} from './fixtures/assistant/mvp-output.mjs';
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
const qa={...common,result:{answer:fact.text,evidenceIds:fact.evidenceIds,limitations:['확인할 수 없는 사항이 있습니다.']}};
const script={...common,mode:'script',result:{...mvpOutput('script',[a]),caveats:[{text:'보도와 발표를 구분합니다.',evidenceIds:['article-a']}]}};
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
 check(html.includes('주의할 점')&&html.includes('확인할 수 없는 사항'),'Q&A answer and limits');
 check(html.includes('id="assistant-citation-1"'),'server reference card');
 check(!html.includes('assistant-citation-unused'),'unused Story is never a citation');
 check(!html.includes('<script>')&&html.includes('&lt;script&gt;'),'model text escaped');
 check(result.copyText(qa).includes('https://example.com/article')&&result.copyText(qa).includes('최근 90일'),'copy keeps links and scope');
 html=render(result.default,{view:script,stale:false,onMessage:()=>{}});
 for(const name of ['영상 제목 후보','영상의 핵심 방향','추천 뉴스','구간별 상세 구성안'])check(html.includes(name),name);
 check(html.includes('완성 내레이션이나 대본이 아닙니다'),'planner scope clear');
 check(result.copyText(script,'planner').includes(script.result.caveats[0].text)&&result.copyText(script,'planner').includes('StarWars.com'),'planner copy keeps caveats and sources');
 html=render(result.default,{view:qa,stale:true,onMessage:()=>{}});check(html.includes('이전 검색의 결과')&&result.copyText(qa).includes(qa.result.answer),'previous result remains copyable without claiming freshness');
 html=render(result.default,{view:qa,stale:false,inputChanged:true,onMessage:()=>{}});check(html.includes('이전 요청의 결과'),'changed input labels existing answer');
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
 let html=renderToStaticMarkup(await Page());check(html.includes('COMING SOON')&&!html.includes('1 CR로 소식 찾기'),'direct disabled page shows no functional inputs');equal(globalThis.__assistantPage.reads,0,'disabled direct access does not read archive');
 globalThis.__assistantPage.enabled=true;html=renderToStaticMarkup(await Page());check(html.includes('뉴스 Q&amp;A')&&html.includes('일반 AI 채팅')&&!html.includes('영상 구성안 플래너'),'explicit test flag renders two launch modes only');equal(globalThis.__assistantPage.reads,1,'enabled page loads available filters');
}finally{await page.dispose();delete globalThis.__assistantPage;}
const css=await readFile('components/assistant/assistant-workspace.module.css','utf8'),workspace=await readFile('components/assistant/assistant-workspace.tsx','utf8');
check(css.includes('max-width:600px')&&css.includes('grid-template-columns:1fr')&&css.includes('min-height:0'),'narrow mobile layout and flex scroll containment');
check(css.includes('min-height:44px')&&css.includes(':focus-visible')&&css.includes('prefers-reduced-motion'),'touch, focus and reduced motion rules');
check(!/dangerouslySetInnerHTML|localStorage|indexedDB|console\./.test(workspace),'no HTML interpretation, browser transcript persistence or logging');
check((await readFile('components/assistant/use-assistant-session.ts','utf8')).includes('JSON.stringify({id,digest,at})'),'session recovery stores opaque ID/digest/timestamp only');
console.log(`Assistant UI: ${assertions} assertions PASS; real React SSR, server flag gate, evidence/citation/attribution/settlement/privacy and responsive static contracts. Browser visual QA NOT TESTED.`);
