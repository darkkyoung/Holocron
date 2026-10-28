'use client';

import {useEffect,useRef,useState} from 'react';
import {Check,Copy,RotateCcw} from 'lucide-react';
import styles from './assistant-workspace.module.css';

// Copy is local-only; regenerate opens the session's existing priced consent.
export default function MessageActions({text,onRegenerate,disabled=false}:{text?:string;onRegenerate:()=>void;disabled?:boolean}){
  const [feedback,setFeedback]=useState('');
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[]);
  async function copy(){
    if(timer.current)clearTimeout(timer.current);
    try{
      if(!navigator.clipboard?.writeText)throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(text??'');setFeedback('복사했습니다');
    }catch{setFeedback('복사할 수 없습니다. 텍스트를 선택해 주세요.');}
    timer.current=setTimeout(()=>setFeedback(''),2500);
  }
  return <div className={styles.messageActions}>
    {text!==undefined&&<button type="button" className={styles.iconButton} aria-label="답변과 출처 복사" title="답변 복사" onClick={()=>void copy()}>{feedback==='복사했습니다'?<Check size={17} aria-hidden="true"/>:<Copy size={17} aria-hidden="true"/>}</button>}
    <button type="button" className={styles.iconButton} aria-label="재생성 비용 확인" title="재생성 · 추가 비용 확인" disabled={disabled} onClick={onRegenerate}><RotateCcw size={17} aria-hidden="true"/></button>
    <span className={styles.actionFeedback} role="status">{feedback}</span>
  </div>;
}
