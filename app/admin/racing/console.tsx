'use client';
import {useState,useEffect} from 'react';
type Row={id:string;season_id:string;round_no:number;starts_at:number;qualifying_at:number;state:string;revision:number};
type View={role:string;races:Row[];profiles:{racer_id:string;display_name:string;bio:string;revision:number}[]};
const stamp=(t:number)=>new Date(t).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'});
async function snapshot(){const r=await fetch('/api/admin/racing',{cache:'no-store'});if(!r.ok)throw Error('권한 또는 격리 환경 설정을 확인하세요.');return await r.json() as View;}
export default function Console(){
 const [data,set]=useState<View|null>(null),[message,msg]=useState(''),[busy,lock]=useState(false),[date,day]=useState(''),[target,select]=useState<Row|null>(null),[reason,why]=useState('');
 async function load(){try{set(await snapshot());}catch(e){set(null);throw e;}}
 useEffect(()=>{let active=true;snapshot().then(v=>{if(active)set(v);},e=>{if(active)msg(e.message);});return ()=>{active=false;};},[]);
 async function send(command:object){if(busy)return;lock(true);try{
  const r=await fetch('/api/admin/racing',{method:'POST',headers:{'Content-Type':'application/json','X-Racing-Command':'1'},body:JSON.stringify(command)});
  const result=await r.json() as {error?:string};msg(r.ok?'처리 완료':String(result.error));select(null);why('');await load();
 }catch{msg('처리 여부를 확인할 수 없습니다. 목록을 다시 조회하세요.');}finally{lock(false);}}
 return <section><p role="status">{message}</p><button onClick={()=>load().catch(e=>msg(e.message))}>새로고침</button>
 {data?.role==='scheduler'&&<fieldset disabled={busy}><legend>정규 시즌 봉인 · 이후 명단 변경 불가</legend>
 <label>시즌 시작 월요일 <input type="date" value={date} onChange={e=>day(e.target.value)}/></label>
 <button disabled={!date} onClick={()=>send({action:'seal',monday:date})}>선택한 주 예약</button>
 <button onClick={()=>send({action:'nextWeek'})}>다음 주 7경기 예약</button></fieldset>}
 {data?.role==='scheduler'&&<details><summary>선수 프로필 관리</summary><p>운영용 프로필입니다. 이미 봉인된 경기에는 적용되지 않습니다.</p>{Array.from({length:8},(_,i)=>'r'+(i+1)).map(id=>{const p=data.profiles.find(x=>x.racer_id===id);return <form key={id+':'+(p?.revision??0)} onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);void send({action:'profile',id,name:f.get('name'),bio:f.get('bio'),revision:p?.revision??0});}}><fieldset disabled={busy}><legend>{id}</legend><label>표시 이름 <input name="name" required maxLength={80} defaultValue={p?.display_name}/></label><label>소개 <input name="bio" maxLength={500} defaultValue={p?.bio}/></label><button>저장</button></fieldset></form>;})}</details>}
 {target&&<fieldset disabled={busy}><legend>{target.id} 취소 확인</legend><label>취소 사유 <input value={reason} maxLength={500} onChange={e=>why(e.target.value)}/></label>
 <button disabled={!reason.trim()} onClick={()=>send({action:'cancel',id:target.id,revision:target.revision,reason})}>경기 취소 확정</button><button onClick={()=>select(null)}>돌아가기</button></fieldset>}
 {data&&<ul>{data.races.map(r=><li key={r.id}><strong>{r.season_id} · R{r.round_no}</strong> {r.state}
 <p>예선 {stamp(r.qualifying_at)} / 본경기 {stamp(r.starts_at)}</p>
 {data.role==='scheduler'&&['READY','RUNNING','PROVISIONAL'].includes(r.state)&&<button disabled={busy} onClick={()=>send({action:'advance',id:r.id})}>예정 시각 기준 상태 갱신</button>}
 {data.role==='incident'&&['SEALED','GENERATING'].includes(r.state)&&<button disabled={busy} onClick={()=>select(r)}>취소 검토</button>}</li>)}</ul>}</section>;
}
