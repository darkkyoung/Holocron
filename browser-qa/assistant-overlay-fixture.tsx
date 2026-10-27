// Local-only visual harness. Every fetch is intercepted; no Production or Provider traffic.
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import AssistantOverlay from '../components/assistant/assistant-overlay';
import AssistantWorkspace from '../components/assistant/assistant-workspace';
import {account,retrieval,candidates} from './fixtures.mjs';
import {exampleArticles,exampleQa,examplePlanner} from '../scripts/fixtures/assistant/mvp-example.mjs';
import {validateGroundedOutput} from '../lib/assistant/output-validation';
import type {SelectedEvidence} from '../lib/assistant/prompt';
import type {GenerateRequest} from '../lib/assistant/generate-validation';
const choices={workOptions:[{id:'work-a',title:'아소카'}],categories:['영화','드라마'],sources:[{id:'starwars' as const,name:'StarWars.com'}]};
// terminal.local preview is HTTP. These synthetic-only shims never enter the app bundle.
if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>{const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}});
if(!crypto.subtle)Object.defineProperty(crypto,'subtle',{value:{digest:async(_algorithm:unknown,input:Uint8Array)=>{const out=new Uint8Array(32);input.forEach((b,i)=>{out[i%32]=(out[i%32]*31+b)%256;});return out.buffer;}}});
let balance=100,searches=0,generations=0,scenario='success';
const titles=exampleArticles.map(a=>a.title);
const items=exampleArticles.map((a,i)=>({...candidates[i],storyId:a.storyId,representative:a,evidence:[a]}));
window.fetch=async(input,init)=>{
 const path=String(input);
 if(path==='/api/credit/visit')return Response.json({...account,balance});
 if(path==='/api/assistant/retrieve'){searches++;balance--;document.querySelector('#counts')!.textContent=`Mock 검색 ${searches} / 생성 ${generations}`;return Response.json({...retrieval,candidates:items,proposedStoryIds:items.map(a=>a.storyId),resultExpiresAt:Date.now()+600000,credit:{charged:1}});}
 if(path==='/api/assistant/generate'){generations++;const body=JSON.parse(String(init?.body));balance-=body.mode==='qa'?5:7;document.querySelector('#counts')!.textContent=`Mock 검색 ${searches} / 생성 ${generations}`;if(scenario!=='success'){const pending=scenario==='pending';if(!pending)balance+=body.mode==='qa'?5:7;return Response.json({status:'error',error:{code:'INVALID_OUTPUT',message:'생성 응답 형식을 확인할 수 없어 결과를 표시하지 않습니다.'},credit:{settlement:pending?'refund_pending':'failed',refund:pending?null:{requested:body.mode==='qa'?5:7,applied:body.mode==='qa'?5:7,forfeited:0,full:true}}},{status:502});}const selected={request:{mode:body.mode,query:'합성 제작 소식',filters:{}},evidence:items,archiveWindow:retrieval.archiveWindow,asOf:retrieval.asOf} as unknown as SelectedEvidence;const value={...validateGroundedOutput(body.mode==='qa'?exampleQa:examplePlanner,body as GenerateRequest,selected),credit:{charged:body.mode==='qa'?5:7,refund:null}};return Response.json(value);}
 throw Error('Fixture blocks all other outbound requests');
};
function Surface(){const [direct,setDirect]=useState(false);return <><header className="mockHeader"><b>H / HOLOCRON</b><span>뉴스 아카이브　 작품　 퀴즈</span></header><div className="fixtureLabel"><span id="counts">Mock 검색 0 / 생성 0</span><label>Mock 결과<select aria-label="Mock 결과" onChange={event=>{scenario=event.target.value;}}><option value="success">성공</option><option value="failed">실패·환불 완료</option><option value="pending">환불 대기</option></select></label><button onClick={()=>setDirect(v=>!v)}>직접 URL 화면 전환</button></div>{direct?<AssistantWorkspace {...choices}/>:<><main className="mockNews"><small>THE GALAXY, ARCHIVED.</small><h1>멀리 있는 은하의 소식,<br/><em>한곳에.</em></h1><p>공개 아카이브를 보다가 궁금한 내용을 바로 물어보세요.</p><section>{titles.map((t,i)=><article key={t}><div className={'art art'+i}/><small>영화 · 뉴스 아카이브</small><h2>{t}</h2><p>브라우저 검증용 합성 기사입니다.</p></article>)}</section></main><AssistantOverlay {...choices}/></>}</>;}
createRoot(document.getElementById('root')!).render(<Surface/>);
