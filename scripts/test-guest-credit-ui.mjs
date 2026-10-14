import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createElement,useEffect,useRef,useState} from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
let assertions=0;
const check=(value,message)=>{assert.ok(value,message);assertions++;};
const equal=(value,expected,message)=>{assert.equal(value,expected,message);assertions++;};
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8');
const dataUrl=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const component=await source('components/credit/guest-credit-status.tsx'),css=await source('components/credit/guest-credit-status.css'),client=await source('components/credit/client.ts');
const header=await source('app/newsroom.tsx'),quiz=await source('components/quiz/daily-quiz.tsx');
check(header.includes('{!admin&&<GuestCreditStatus/>}'),'one common public chrome hook, excluded from admin');
check(component.includes("['/','/works','/quiz','/roadmap','/assistant','/credits']"),'public path allowlist excludes internal/preview routes');
check(component.includes("event.key==='Escape'")&&component.includes('summary.current?.focus()'),'Escape closes disclosure and restores focus');
check(component.includes('<details')&&component.includes('<summary'),'native disclosure is keyboard and touch operable');
check(css.includes('min-height:44px')&&css.includes(':focus-visible'),'44px action targets and visible focus');
check(css.includes('repeat(7,minmax(0,1fr))')&&css.includes('@media(max-width:550px)'),'seven flexible columns fit narrow content width');
check(!css.includes('position:fixed')&&!css.includes('position:absolute'),'credit surface does not overlap floating controls');
check(client.includes('navigator.locks.request')&&!client.includes('localStorage')&&!client.includes('sessionStorage'),'tab initialization uses origin lock, no stored credential');
check(quiz.includes('await initializeGuestCredits()')&&quiz.includes('refreshCreditsAfterQuiz()'),'Quiz waits for explicit Guest POST and refreshes shared balance');
check(quiz.includes('credit.applied')&&quiz.includes('credit.capped')&&quiz.includes('Credit reward 없음'),'Quiz feedback uses actual server-applied amount');
check((await source('app/credits/page.tsx')).includes('TMDB'),'attribution route preserved');
// Real React static rendering, with controlled hook values for loaded/error presentations. No browser claims.
globalThis.__creditUi={jsx,useEffect,useRef,useState,states:null,index:0};
const reactStub=dataUrl(`export const useEffect=()=>{};export const useRef=(value)=>({current:value});export const useState=(value)=>{const ctx=globalThis.__creditUi;return [ctx.states?ctx.states[ctx.index++]:value,()=>{}]};`);
const jsxStub=dataUrl('export const jsx=globalThis.__creditUi.jsx.jsx;export const jsxs=globalThis.__creditUi.jsx.jsxs;export const Fragment=globalThis.__creditUi.jsx.Fragment;');
const clientStub=dataUrl("export const CREDIT_CHANGED='test';export const initializeGuestCredits=async()=>null;");
let output=ts.transpileModule(component,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
output=output.replace(/import ['"]\.\/guest-credit-status.css['"];?/,'').replaceAll('"react/jsx-runtime"',JSON.stringify(jsxStub)).replaceAll("'react'",JSON.stringify(reactStub)).replaceAll("'./client'",JSON.stringify(clientStub));
const Status=(await import(dataUrl(output))).default;
const loaded={balance:3,cap:10,rewards:[{reason:'first_visit',applied:1},{reason:'opening',applied:1},{reason:'attendance',applied:1,streak:1}],attendance:{streak:1,claimedToday:true,days:Array.from({length:7},(_,i)=>({date:'2026-10-'+(12+i),claimed:i===0,today:i===0,missed:false}))}};
function render(states){globalThis.__creditUi.states=states;globalThis.__creditUi.index=0;return renderToStaticMarkup(createElement(Status));}
const ready=render([loaded,'',false]);check(ready.includes('Guest 3 / 10 CR'),'actual balance and cap render');check(ready.includes('+3 CR')&&ready.includes('첫 방문 · 오픈 기념 · 출석 DAY 1'),'compact combined feedback');
equal((ready.match(/<li(?: |>)/g)||[]).length,7,'seven board days');check(ready.includes('총 +5 CR')&&ready.includes('하루를 놓치면'),'completion and missed-day semantics are explained');
const unavailable=render([null,'일시적인 실패',false]);check(unavailable.includes('확인 불가')&&!unavailable.includes('Guest 0 / 10'),'error never invents zero balance');
check(render([null,'',true]).includes('확인 중'),'loading state is explicit');
// Execute two distinct module instances (tabs) with one shared lock manager and response-cookie simulation.
const browserOriginal={navigator:globalThis.navigator,window:globalThis.window,fetch:globalThis.fetch};
let queue=Promise.resolve(),active=0,maximum=0,hasCookie=false,identities=0,requests=0;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request(_name,fn){const task=queue.then(fn);queue=task.catch(()=>{});return task;}}}});
globalThis.window=new EventTarget();
globalThis.fetch=async()=>{requests++;active++;maximum=Math.max(maximum,active);if(!hasCookie)identities++;await new Promise(resolve=>setTimeout(resolve,5));hasCookie=true;active--;return {ok:true,json:async()=>loaded};};
try{
  const compiled=ts.transpileModule(client,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const tabA=await import(dataUrl(compiled+'\n//tabA')),tabB=await import(dataUrl(compiled+'\n//tabB'));
  await Promise.all([tabA.initializeGuestCredits(),tabB.initializeGuestCredits(),tabA.initializeGuestCredits()]);
  equal(maximum,1,'first POSTs from different tabs are serialized');equal(identities,1,'second tab receives the first cookie before initialization');equal(requests,2,'same-tab concurrent callers share a pending request');
  equal((await tabA.initializeGuestCredits()).balance,3,'resolved state can be reused');
  globalThis.fetch=async()=>({ok:false,json:async()=>({error:'Unavailable'})});
  await assert.rejects(tabB.initializeGuestCredits(true),/Unavailable/);assertions++;
  globalThis.fetch=async()=>({ok:true,json:async()=>loaded});equal((await tabB.initializeGuestCredits(true)).balance,3,'failed request does not poison retry');
}finally{Object.defineProperty(globalThis,'navigator',{configurable:true,value:browserOriginal.navigator});globalThis.window=browserOriginal.window;globalThis.fetch=browserOriginal.fetch;delete globalThis.__creditUi;}
console.log(`Guest Credit UI: ${assertions} assertions passed (React render, client lock simulation and responsive/accessibility contracts; browser NOT TESTED)`);
