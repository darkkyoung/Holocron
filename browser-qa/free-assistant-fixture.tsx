// Local-only real component harness; never imported by application routes.
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import AssistantOverlay from '../components/assistant/assistant-overlay';
import FreeAssistantWorkspace from '../components/assistant/free-workspace';
if(!crypto.randomUUID)Object.defineProperty(crypto,'randomUUID',{value:()=>{const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}});
let calls=0,scenario='success';
window.fetch=async(input,init)=>{
 if(String(input)!=='/api/assistant/free')throw Error('EXTERNAL_NETWORK_BLOCKED');
 const body=JSON.parse(String(init?.body));calls++;
 document.querySelector('#counts')!.textContent=`Mock 요청 ${calls} / 외부 요청 0 / Credit 0`;
 await new Promise(resolve=>setTimeout(resolve,600));
 if(scenario==='failure')return Response.json({error:{code:'PROVIDER_UNAVAILABLE',message:'AI 제공자를 이용할 수 없습니다.'}},{status:503});
 const answer=scenario==='long'?Array.from({length:20},(_,i)=>`${i+1}. 이것은 긴 한국어 답변의 스크롤을 검증하는 합성 문단입니다. 실제 GPT 응답이 아닙니다.`).join('\n\n'):body.mode==='chat'?'안녕하세요! 스타워즈 이야기를 함께 나눠요.\n\n이 답변은 브라우저 검증용 Mock입니다.':'선택한 보도에 따르면 스타파이터 제작에 관한 논의가 진행 중입니다. 공식 확정 발표로 단정하지 않습니다.';
 return Response.json({mode:body.mode,status:scenario==='empty'?'insufficient_evidence':'ok',answer:scenario==='empty'?'최근 90일 공개 아카이브에 충분한 근거가 없습니다.':answer,sources:body.mode==='qa'&&scenario!=='empty'?[{citation:1,title:'스타파이터 제작 관련 보도 · 합성 기사',source:'Mock News',published:'2026-10-30',url:'https://example.com/news'}]:[],limitations:[],warnings:body.mode==='chat'?['최신 뉴스가 검증된 답변은 아닙니다.']:[]});
};
function Surface(){const [direct,setDirect]=useState(false);return <><header className="mockHeader"><b>HOLOCRON · 무료 MVP Mock QA</b></header><div className="fixtureLabel"><span id="counts">Mock 요청 0 / 외부 요청 0 / Credit 0</span><label>결과<select aria-label="Mock 결과" onChange={e=>{scenario=e.target.value;}}><option value="success">성공</option><option value="long">긴 답변</option><option value="failure">실패</option><option value="empty">근거 없음</option></select></label><button onClick={()=>setDirect(v=>!v)}>직접 페이지 / 모달 전환</button><button onClick={()=>document.querySelector('textarea')?.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:229,isComposing:true,bubbles:true}))}>IME Enter 확인</button></div>{direct?<main style={{padding:16}}><FreeAssistantWorkspace/></main>:<><main className="mockNews"><h1>은하계의 소식,<br/><em>한곳에.</em></h1><p>격리된 브라우저 QA · 운영 데이터 없음</p></main><AssistantOverlay workOptions={[]} categories={[]} sources={[]}/></>}</>;}
createRoot(document.getElementById('root')!).render(<Surface/>);
