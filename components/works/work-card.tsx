'use client';

import {useRef,useState} from 'react';
import type {ReactNode} from 'react';
import type {Work} from '@/lib/works/types';
import {formatReleaseDate} from '@/lib/works/types';

type Props={work:Work;revealed:boolean;onReveal:(id:string)=>void;onDismiss:()=>void;onActivate?:(work:Work)=>void;destinationAvailable?:boolean;featured?:boolean;adminControl?:ReactNode};

export default function WorkCard({work,revealed,onReveal,onDismiss,onActivate,destinationAvailable=true,featured=false,adminControl}:Props){
  const cardRef=useRef<HTMLButtonElement>(null);
  const [imageFailed,setImageFailed]=useState(!work.posterUrl);
  function keyDown(event:React.KeyboardEvent<HTMLButtonElement>){
    if(event.key==='Escape'){event.preventDefault();onDismiss();cardRef.current?.focus();}
  }
  return <article className="work-card" data-revealed={revealed} data-featured={featured||undefined}>
    <button ref={cardRef} type="button" className="work-poster" aria-expanded={revealed} aria-label={`${work.title} 정보 보기`} onPointerEnter={event=>{if(event.pointerType==='mouse')onReveal(work.id);}} onPointerLeave={event=>{if(event.pointerType==='mouse')onDismiss();}} onFocus={()=>onReveal(work.id)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))onDismiss();}} onClick={()=>revealed?(onActivate?.(work)??onDismiss()):onReveal(work.id)} onKeyDown={keyDown}>
      {/* External legacy poster URLs are preserved without copying image assets into the application. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {imageFailed?<span className="work-poster-placeholder" aria-label={`${work.title} 포스터 없음`}>HOLOCRON<br/>WORKS ARCHIVE</span>:<img src={work.posterUrl} alt={`${work.title} 포스터`} loading="lazy" onError={()=>setImageFailed(true)}/>}
      <span className="work-poster-shade" aria-hidden="true"/>
      <span className="work-metadata"><strong>{work.title}</strong><small>{work.type}</small><time dateTime={work.releaseDate??undefined}>{formatReleaseDate(work.releaseDate,work.releasePrecision)}</time>{onActivate&&<em>{destinationAvailable?'한 번 더 선택해 이동':'공식 페이지 준비 중'}</em>}</span>
    </button>
    {adminControl&&<div className="work-admin-control">{adminControl}</div>}
  </article>;
}
