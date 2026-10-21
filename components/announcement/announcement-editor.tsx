'use client';
import {useState} from 'react';
import type {Announcement,AnnouncementFields} from '@/lib/announcement/domain';
import {compressAnnouncementImage} from '@/lib/announcement/compress-image';
import Banner from './banner';
import styles from './announcement-editor.module.css';
import noticeStyles from './announcement.module.css';
const fields=(a:Announcement):AnnouncementFields=>({enabled:a.enabled,title:a.title,body:a.body,alt:a.alt,decorative:a.decorative,crop:{...a.crop},image:a.image});
export default function AnnouncementEditor({initial}:{initial:Announcement}){
 const [saved,setSaved]=useState(initial),[draft,setDraft]=useState(()=>fields(initial)),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[mobile,setMobile]=useState(false);
 async function upload(file:File|undefined){if(!file)return;setBusy(true);setMessage('이미지를 압축하고 있습니다.');try{const image=await compressAnnouncementImage(file);setDraft(d=>({...d,image,crop:{x:50,y:50,zoom:100}}));setMessage('이미지 준비 완료. 저장 또는 새 공지 게시를 눌러 반영하세요.');}catch(error){setMessage(error instanceof Error?error.message:'이미지를 읽지 못했습니다.');}finally{setBusy(false);}}
 async function save(action:'save'|'publish'){
  if(busy)return;
  if(action==='publish'&&!window.confirm('새 공지로 게시할까요? 이전 공지를 숨긴 방문자에게도 표시됩니다.'))return;
  setBusy(true);setMessage('');
  try{const response=await fetch('/api/admin/announcement',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,expectedRevision:saved.revision,fields:draft})});
   if(!response.ok){setMessage(response.status===409?'다른 저장으로 변경됐습니다. 최신 설정을 불러온 뒤 다시 편집하세요.':response.status===400?'제목·본문·이미지·대체 텍스트와 공개 설정을 확인해 주세요. 첫 게시는 새 공지 게시를 사용하세요.':'저장 결과를 확인하지 못했습니다. 자동 재시도하지 않습니다. 최신 설정을 불러오세요.');return;}
   const next=await response.json() as Announcement;setSaved(next);setDraft(fields(next));setMessage(next.enabled?'공개 공지가 저장됐습니다. 홈페이지에서 표시됩니다.':'저장됐습니다. 현재 공지는 비공개입니다.');
  }catch{setMessage('저장 결과가 불명확합니다. 자동 재시도하지 않습니다. 최신 설정을 확인하세요.');}finally{setBusy(false);}
 }
 async function reload(){setBusy(true);try{const response=await fetch('/api/admin/announcement',{cache:'no-store'});if(!response.ok)throw Error();const next=await response.json() as Announcement;setSaved(next);setDraft(fields(next));setMessage('최신 저장 상태를 불러왔습니다.');}catch{setMessage('설정을 불러오지 못했습니다. 관리자 인증을 확인하세요.');}finally{setBusy(false);}}
 const source=draft.image?`data:image/webp;base64,${draft.image.data}`:'';
 return <main className={styles.page}><a href="/admin" className={styles.back}>← CONTROL ROOM</a><header><p>PUBLIC NOTICE</p><h1>공지 팝업 관리</h1><span>홈페이지에 한 개의 공지를 표시합니다. 저장은 기존 숨김 기간을 유지하며, 새 공지 게시만 숨김을 초기화합니다.</span></header>
 <div className={styles.grid}><section className={styles.panel} aria-label="공지 편집"><fieldset disabled={busy}><label className={styles.check}><input type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/> 공지 공개</label><small>첫 공지는 ‘새 공지 게시’로 공개하세요. 비공개로 저장하면 즉시 노출 대상에서 제외됩니다.</small>
 <label>공지 제목<input value={draft.title} maxLength={120} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
 <label>공지 본문<textarea value={draft.body} maxLength={4000} rows={8} onChange={e=>setDraft({...draft,body:e.target.value})}/></label>
 <label>배너 이미지<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label><small>JPG · PNG · WebP / 원본 8 MiB 이하. 최대 1600px, WebP 160 KiB 이하로 압축합니다. 이미지는 항상 4:1로 표시됩니다.</small>
 {draft.image&&<><button type="button" onClick={()=>setDraft({...draft,image:null})}>이미지 제거</button><div className={styles.crop} aria-label="4:1 표시 영역 조정">{(['x','y','zoom'] as const).map((key,i)=><label key={key}>{['가로 위치 X','세로 위치 Y','확대 Zoom'][i]} <output>{draft.crop[key]}%</output><input type="range" aria-label={['가로 표시 위치 X','세로 표시 위치 Y','확대 비율 Zoom'][i]} min={key==='zoom'?100:0} max={key==='zoom'?300:100} step={1} value={draft.crop[key]} onChange={e=>setDraft({...draft,crop:{...draft.crop,[key]:Number(e.target.value)}})}/></label>)}</div></>}
 <label className={styles.check}><input type="checkbox" checked={draft.decorative} onChange={e=>setDraft({...draft,decorative:e.target.checked})}/> 장식 이미지 (제목·본문에 모든 정보 포함)</label>
 {!draft.decorative&&<label>이미지 대체 텍스트<input maxLength={240} value={draft.alt} onChange={e=>setDraft({...draft,alt:e.target.value})}/></label>}
 <div className={styles.buttons}><button type="button" onClick={()=>void save('save')}>저장</button><button type="button" className={styles.primary} onClick={()=>void save('publish')}>새 공지 게시</button><button type="button" onClick={()=>void reload()}>최신 설정 불러오기</button></div></fieldset><p role="status" aria-live="polite" className={styles.message}>{message}</p></section>
 <section className={styles.previewArea} aria-label="공지 미리보기"><div className={styles.previewHeader}><h2>미리보기</h2><button type="button" aria-pressed={!mobile} onClick={()=>setMobile(false)}>데스크톱</button><button type="button" aria-pressed={mobile} onClick={()=>setMobile(true)}>모바일</button></div><p>실제 공지는 화면 중앙에 열립니다. 미리보기에서는 저장되지 않습니다.</p>
 <div className={styles.preview} style={{maxWidth:mobile?360:640}}>{source?<Banner key={source} src={source} alt={draft.alt} decorative={draft.decorative} crop={draft.crop}/>:<div className={noticeStyles.banner}><span className={noticeStyles.imageFallback}>4:1 BANNER</span></div>}<div className={noticeStyles.copy}><p className={noticeStyles.eyebrow}>HOLOCRON NOTICE</p><h2>{draft.title||'공지 제목'}</h2><p className={noticeStyles.body}>{draft.body||'공지 본문을 입력해 주세요.'}</p></div><div className={noticeStyles.actions}><button type="button" disabled>일주일간 표시하지 않기</button><button type="button" disabled className={noticeStyles.primary}>닫기</button></div></div><small>현재 저장 상태: {saved.enabled?'공개':'비공개'} · Revision {saved.revision}</small></section></div></main>;
}
