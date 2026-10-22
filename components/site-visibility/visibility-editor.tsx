'use client';
import {useEffect,useState} from 'react';
import {defaultVisibility,validateVisibility,type SiteVisibility} from '@/lib/site-visibility/domain';
import {maintenanceHtml} from '@/lib/site-visibility/maintenance';
import styles from './visibility-editor.module.css';
function envelope(raw:unknown){const v=raw as {value:unknown;repairRequired:boolean};return {value:validateVisibility(v.value),repairRequired:v.repairRequired===true};}
export default function VisibilityEditor(){
 const [value,setValue]=useState<SiteVisibility>(defaultVisibility),[stored,setStored]=useState<SiteVisibility['mode']|null>(null),[busy,setBusy]=useState(true),[message,setMessage]=useState('설정을 확인하고 있습니다.'),[width,setWidth]=useState(390);
 useEffect(()=>{let active=true;fetch('/api/admin/site-visibility',{credentials:'same-origin',cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();return envelope(await r.json());}).then(v=>{if(active){setValue(v.value);setStored(v.repairRequired?null:v.value.mode);setMessage(v.repairRequired?'설정 읽기 오류: 방문자 접근은 차단됩니다. 저장소 연결을 확인한 뒤 관리자가 명시적으로 저장해 복구할 수 있습니다.':'현재 운영 설정을 불러왔습니다.');}}).catch(()=>{if(active)setMessage('인증 또는 저장소를 확인해 주세요. 현재 상태를 확인하지 못했습니다.');}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[]);
 async function save(){
  if(busy)return;
  if(value.mode==='PUBLIC'&&stored!=='PUBLIC'&&!window.confirm('사이트를 일반 방문자에게 공개하시겠습니까?'))return;
  setBusy(true);
  try{const r=await fetch('/api/admin/site-visibility',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({expectedRevision:value.revision,fields:{mode:value.mode,title:value.title,body:value.body}})});if(!r.ok)throw Error(r.status===409?'다른 관리자가 변경했습니다. 새로고침 후 확인해 주세요.':'저장하지 못했습니다. 인증·저장소를 확인해 주세요.');const data=envelope(await r.json());setValue(data.value);setStored(data.value.mode);setMessage('저장 완료. 다음 서버 요청부터 적용됩니다.');}
  catch(e){setMessage(e instanceof Error?e.message:'저장 오류');}finally{setBusy(false);}
 }
 return <main className={styles.page}><a href="/admin" className={styles.back}>← CONTROL ROOM</a><header><p>SITE ACCESS</p><h1>사이트 공개 설정</h1><p>방문자 공개 상태를 제어합니다. 관리자 세션은 점검 중에도 정상적으로 사이트를 탐색할 수 있습니다.</p></header>
 <div className={styles.status}>현재 상태 <strong>{stored==='PUBLIC'?'PUBLIC · 공개':stored==='MAINTENANCE'?'MAINTENANCE · 점검 중':'확인 필요'}</strong></div>
 <div className={styles.grid}><section className={styles.panel}><h2>운영 설정</h2><label>공개 상태<select disabled={busy} value={value.mode} onChange={e=>setValue({...value,mode:e.target.value as SiteVisibility['mode']})}><option value="PUBLIC">PUBLIC — 사이트 공개</option><option value="MAINTENANCE">MAINTENANCE — 비공개 / 공사 중</option></select></label>
 <label>점검 안내 제목<input maxLength={80} value={value.title} disabled={busy} onChange={e=>setValue({...value,title:e.target.value})}/></label><label>점검 안내 내용<textarea rows={6} maxLength={1200} value={value.body} disabled={busy} onChange={e=>setValue({...value,body:e.target.value})}/></label>
 <p>일반 텍스트로 표시됩니다. 공개 사이트의 데이터와 방문 보상·퀴즈 제출도 점검 중에는 차단됩니다. Google Account는 관리자 권한이 아닙니다.</p>
 <button disabled={busy||!value.title.trim()||!value.body.trim()} onClick={()=>void save()}>{busy?'처리 중…':'설정 저장'}</button><p role="status" aria-live="polite">{message}</p></section>
 <section className={styles.panel}><div className={styles.previewHead}><h2>방문자 화면 미리보기</h2><label>화면 너비<select value={width} onChange={e=>setWidth(Number(e.target.value))}>{[360,375,390,768].map(w=><option key={w} value={w}>{w}px</option>)}</select></label></div><div className={styles.preview}><iframe title="점검 화면 미리보기" sandbox="" srcDoc={maintenanceHtml(value)} style={{width,maxWidth:'100%',height:640}}/></div></section></div></main>;
}
