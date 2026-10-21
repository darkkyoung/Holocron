'use client';
import {useEffect,useRef,useState} from 'react';
import type {PublicAnnouncement} from '@/lib/announcement/domain';
import {isSnoozed,snooze,SNOOZE_KEY} from '@/lib/announcement/snooze';
import Banner from './banner';
import styles from './announcement.module.css';
function NoticeDialog({notice,onClose}:{notice:PublicAnnouncement;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),closeButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null,el=dialog.current;
  if(!el)return;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';el.showModal();closeButton.current?.focus();
  const sync=()=>{try{if(isSnoozed(window.localStorage,notice.id))onClose();}catch{}};
  const storage=(event:StorageEvent)=>{if(event.key===SNOOZE_KEY)sync();};
  window.addEventListener('storage',storage);
  return ()=>{window.removeEventListener('storage',storage);el.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[notice.id,onClose]);
 function trapTab(event:React.KeyboardEvent<HTMLDialogElement>){
  if(event.key!=='Tab')return;
  const buttons=dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');if(!buttons?.length)return;
  const first=buttons[0],last=buttons[buttons.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }
 function hide(){try{snooze(window.localStorage,notice.id);}catch{}onClose();}
 return <dialog ref={dialog} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="homepage-announcement-title" onKeyDown={trapTab} onCancel={event=>{event.preventDefault();onClose();}}>
  <div className={styles.content}><Banner key={notice.imageUrl} src={notice.imageUrl} alt={notice.alt} decorative={notice.decorative} crop={notice.crop}/><div className={styles.copy}><p className={styles.eyebrow}>HOLOCRON NOTICE</p><h2 id="homepage-announcement-title">{notice.title}</h2><p className={styles.body}>{notice.body}</p></div></div>
  <footer className={styles.actions}><button type="button" onClick={hide}>일주일간 표시하지 않기</button><button ref={closeButton} type="button" className={styles.primary} onClick={onClose}>닫기</button></footer>
 </dialog>;
}
export default function AnnouncementPopup(){
 const [notice,setNotice]=useState<PublicAnnouncement|null>(null);
 useEffect(()=>{const controller=new AbortController();
  void fetch('/api/announcement',{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)return;const data=await response.json() as {announcement:PublicAnnouncement|null};if(!data.announcement)return;try{if(isSnoozed(window.localStorage,data.announcement.id))return;}catch{}if(!controller.signal.aborted)setNotice(data.announcement);}).catch(()=>{});
  return ()=>controller.abort();
 },[]);
 // This component is mounted only by app/page.tsx; no global layout tracking.
 return notice?<NoticeDialog notice={notice} onClose={()=>setNotice(null)}/>:null;
}
