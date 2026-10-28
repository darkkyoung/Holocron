'use client';

import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import {Bot,X} from 'lucide-react';
import type {FilterChoices} from './contracts';
import AssistantWorkspace from './assistant-workspace';
import launcher from '@/components/news/ai-assistant-placeholder.module.css';
import styles from './assistant-overlay.module.css';

// A native modal keeps the mounted conversation while closed without leaving
// a focus trap or scroll lock active. No transcript is written to storage.
export default function AssistantOverlay(choices:FilterChoices){
  const dialog=useRef<HTMLDialogElement>(null),button=useRef<HTMLButtonElement>(null);
  const [open,setOpen]=useState(false),[visited,setVisited]=useState(false);
  useEffect(()=>{
    if(!open)return;
    const previous=document.body.style.overflow;document.body.style.overflow='hidden';
    dialog.current?.showModal();
    dialog.current?.querySelector<HTMLTextAreaElement>('textarea')?.focus({preventScroll:true});
    return()=>{document.body.style.overflow=previous;};
  },[open]);
  function trapFocus(event:KeyboardEvent<HTMLDialogElement>){
    if(event.key!=='Tab')return;
    const nodes=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')).filter(node=>node.getClientRects().length>0);
    const first=nodes[0],last=nodes.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
  function close(){dialog.current?.close();setOpen(false);button.current?.focus({preventScroll:true});}
  return <><button ref={button} className={launcher.launcher} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls="assistant-overlay" aria-label="AI 도우미 열기" onClick={()=>{setVisited(true);setOpen(true);}}><Bot size={22} aria-hidden="true"/><span>AI 도우미</span></button>
    <dialog ref={dialog} id="assistant-overlay" className={styles.panel} aria-modal="true" role="dialog" aria-labelledby="assistant-overlay-title" onKeyDown={trapFocus} onCancel={event=>{event.preventDefault();close();}} onClose={()=>{setOpen(false);button.current?.focus({preventScroll:true});}}>
      <div className={styles.topbar}><strong id="assistant-overlay-title">HOLOCRON AI</strong><button type="button" onClick={close} aria-label="AI 도우미 닫기"><X size={20}/></button></div>
      {visited&&<AssistantWorkspace {...choices} active={open}/>}<p className={styles.footnote}>닫아도 진행 중인 요청은 취소되지 않습니다. 다시 열어 결과를 확인하세요.</p>
    </dialog></>;
}
