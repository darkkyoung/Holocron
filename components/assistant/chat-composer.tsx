'use client';

import {useEffect,useRef,type ReactNode,type FormEvent} from 'react';
import {ArrowUp,LoaderCircle} from 'lucide-react';
import styles from './assistant-workspace.module.css';

type Props={query:string;onChange:(value:string)=>void;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;locked:boolean;disabled:boolean;busy:boolean;label:string;placeholder:string;cost:string;balance:string;children:ReactNode};
export default function ChatComposer({query,onChange,onSubmit,locked,disabled,busy,label,placeholder,cost,balance,children}:Props){
  const input=useRef<HTMLTextAreaElement>(null),composing=useRef(false);
  useEffect(()=>{
    const node=input.current;if(!node)return;
    node.style.height='auto';node.style.height=`${Math.min(node.scrollHeight,128)}px`;
  },[query]);
  return <form className={styles.searchForm} onSubmit={onSubmit} aria-label="AI 메시지 전송">
    <div className={styles.composerBox}>
      <label className={styles.srOnly} htmlFor="assistant-query">{label}</label>
      <textarea ref={input} id="assistant-query" aria-describedby="assistant-cost" rows={1} maxLength={500} value={query} disabled={locked} onChange={event=>onChange(event.target.value)} placeholder={placeholder} onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}} onKeyDown={event=>{
        if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&!composing.current&&event.keyCode!==229){event.preventDefault();if(!disabled)event.currentTarget.form?.requestSubmit();}
      }} required/>
      <div className={styles.composerTools}>
        <span className={styles.composerHint}>Enter 전송 · Shift+Enter 줄바꿈</span>
        <button className={styles.sendButton} type="submit" disabled={disabled} aria-label={busy?'답변 생성 중':`${label} 전송 · ${cost}`} title={cost}>{busy?<LoaderCircle size={20} aria-hidden="true"/>:<ArrowUp size={21} aria-hidden="true"/>}</button>
      </div>
    </div>
    <div className={styles.composerFooter}><span id="assistant-cost">{cost}</span><span>{balance}</span></div>
    {children}
  </form>;
}
