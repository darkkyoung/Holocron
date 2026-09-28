'use client';
/* eslint-disable @next/next/no-img-element */

import {useEffect,useRef,useState} from 'react';
import type {QuizImageCrop} from '@/lib/quiz/types';

export function CroppedQuizImage({src,crop,alt,className=''}:{src:string;crop:QuizImageCrop;alt:string;className?:string}){
  return <span className={`quiz-crop-frame ${className}`.trim()}><img src={src} alt={alt} style={{objectPosition:`${crop.x}% ${crop.y}%`,transform:`scale(${crop.zoom/100})`,transformOrigin:`${crop.x}% ${crop.y}%`}}/></span>;
}

export default function QuizImageCropControl({src,crop,label,disabled=false,onChange}:{src:string;crop:QuizImageCrop;label:string;disabled?:boolean;onChange:(crop:QuizImageCrop)=>void}){
  const [open,setOpen]=useState(false);
  const [draft,setDraft]=useState(crop);
  const closeButton=useRef<HTMLButtonElement>(null);

  useEffect(()=>{
    if(!open)return;
    closeButton.current?.focus();
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};
    window.addEventListener('keydown',onKeyDown);
    return ()=>window.removeEventListener('keydown',onKeyDown);
  },[open]);

  function show(){
    if(disabled)return;
    setDraft(crop);
    setOpen(true);
  }

  return <>
    <button type="button" className="quiz-crop-trigger" onClick={show} disabled={disabled} aria-label={`${label} 1:1 표시 영역 조정`}>
      <CroppedQuizImage src={src} crop={crop} alt={`${label} 미리보기`}/>
      <span>{disabled?'참여 기록으로 조정 잠김':'이미지를 눌러 1:1 영역 조정'}</span>
    </button>
    {open&&<div className="quiz-crop-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setOpen(false);}}>
      <section className="quiz-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="quiz-crop-title">
        <header><div><small>1:1 IMAGE CROP</small><h3 id="quiz-crop-title">{label} 표시 영역</h3></div><button ref={closeButton} type="button" onClick={()=>setOpen(false)} aria-label="자르기 창 닫기">×</button></header>
        <CroppedQuizImage src={src} crop={draft} alt={`${label} 자르기 결과`}/>
        <label>가로 위치 <b>{draft.x}%</b><input type="range" min="0" max="100" step="1" value={draft.x} onChange={event=>setDraft(current=>({...current,x:Number(event.target.value)}))}/></label>
        <label>세로 위치 <b>{draft.y}%</b><input type="range" min="0" max="100" step="1" value={draft.y} onChange={event=>setDraft(current=>({...current,y:Number(event.target.value)}))}/></label>
        <label>확대 <b>{draft.zoom}%</b><input type="range" min="100" max="300" step="5" value={draft.zoom} onChange={event=>setDraft(current=>({...current,zoom:Number(event.target.value)}))}/></label>
        <footer><button type="button" onClick={()=>setOpen(false)}>취소</button><button type="button" className="primary" onClick={()=>{onChange(draft);setOpen(false);}}>이 영역 사용</button></footer>
      </section>
    </div>}
  </>;
}
