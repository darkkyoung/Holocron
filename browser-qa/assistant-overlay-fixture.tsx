// Local-only visual harness. Every fetch is intercepted; no Production or Provider traffic.
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import AssistantOverlay from '../components/assistant/assistant-overlay';
import AssistantWorkspace from '../components/assistant/assistant-workspace';
import {account,retrieval,generation,candidates} from './fixtures.mjs';
const choices={workOptions:[{id:'work-a',title:'아소카'}],categories:['영화','드라마'],sources:[{id:'starwars' as const,name:'StarWars.com'}]};
// terminal.local preview is HTTP. These synthetic-only shims never enter the app bundle.
if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>{const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}});
if(!crypto.subtle)Object.defineProperty(crypto,'subtle',{value:{digest:async(_algorithm:unknown,input:Uint8Array)=>{const out=new Uint8Array(32);input.forEach((b,i)=>{out[i%32]=(out[i%32]*31+b)%256;});return out.buffer;}}});
let balance=100,searches=0,generations=0;
const titles=['스타파이터 제작 소식, 보도에서 확인할 수 있는 내용','제작진이 전한 촬영 접근법과 협업 이야기','서로 다른 매체에서 전한 프로젝트 소식','공개 요약으로 살펴보는 다음 이야기'];
const items=candidates.slice(0,6).map((c,i)=>({...c,representative:{...c.representative,title:titles[i%4]},evidence:c.evidence.map(a=>({...a,title:titles[i%4],source:{...a.source,label:'StarWars.com'}}))}));
window.fetch=async(input,init)=>{
 const path=String(input);
 if(path==='/api/credit/visit')return Response.json({...account,balance});
 if(path==='/api/assistant/retrieve'){searches++;balance--;document.querySelector('#counts')!.textContent=`Mock 검색 ${searches} / 생성 ${generations}`;return Response.json({...retrieval,candidates:items,resultExpiresAt:Date.now()+600000,credit:{charged:1}});}
 if(path==='/api/assistant/generate'){generations++;const body=JSON.parse(String(init?.body));balance-=body.mode==='qa'?5:7;document.querySelector('#counts')!.textContent=`Mock 검색 ${searches} / 생성 ${generations}`;const value=generation(body.mode);value.evidence[0].title=titles[0];value.evidence[0].source.label='StarWars.com';if(value.result.answer)value.result.answer[0].text='선택한 보도는 스타파이터의 제작이 논의 중이라고 전합니다. 현재 요약만으로 구체적인 촬영 일정이나 공개일을 확인할 수는 없습니다. 매체의 보도와 공식 확정 발표를 구분해서 읽는 것이 좋습니다.';return Response.json(value);}
 throw Error('Fixture blocks all other outbound requests');
};
function Surface(){const [direct,setDirect]=useState(false);return <><header className="mockHeader"><b>H / HOLOCRON</b><span>뉴스 아카이브　 작품　 퀴즈</span></header><div className="fixtureLabel"><span id="counts">Mock 검색 0 / 생성 0</span><button onClick={()=>setDirect(v=>!v)}>직접 URL 화면 전환</button></div>{direct?<AssistantWorkspace {...choices}/>:<><main className="mockNews"><small>THE GALAXY, ARCHIVED.</small><h1>멀리 있는 은하의 소식,<br/><em>한곳에.</em></h1><p>공개 아카이브를 보다가 궁금한 내용을 바로 물어보세요.</p><section>{titles.map((t,i)=><article key={t}><div className={'art art'+i}/><small>영화 · 뉴스 아카이브</small><h2>{t}</h2><p>브라우저 검증용 합성 기사입니다.</p></article>)}</section></main><AssistantOverlay {...choices}/></>}</>;}
createRoot(document.getElementById('root')!).render(<Surface/>);
