'use client';

import {useRef} from 'react';
import type {ReactNode} from 'react';
import type {Work} from '@/lib/works/types';
import {formatReleaseDate} from '@/lib/works/types';

type Props={work:Work;revealed:boolean;onReveal:(id:string)=>void;onDismiss:()=>void;adminControl?:ReactNode};

export default function WorkCard({work,revealed,onReveal,onDismiss,adminControl}:Props){
  const cardRef=useRef<HTMLButtonElement>(null);
  function keyDown(event:React.KeyboardEvent<HTMLButtonElement>){
    if(event.key==='Escape'){event.preventDefault();onDismiss();cardRef.current?.focus();}
  }
  return <article className="work-card" data-revealed={revealed}>
    <button ref={cardRef} type="button" className="work-poster" aria-expanded={revealed} aria-label={`${work.title} 정보 보기`} onPointerEnter={event=>{if(event.pointerType==='mouse')onReveal(work.id);}} onPointerLeave={event=>{if(event.pointerType==='mouse')onDismiss();}} onFocus={()=>onReveal(work.id)} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))onDismiss();}} onClick={()=>revealed?onDismiss():onReveal(work.id)} onKeyDown={keyDown}>
      {/* External legacy poster URLs are preserved without copying image assets into the application. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={work.posterUrl} alt={`${work.title} 포스터`} loading="lazy"/>
      <span className="work-poster-shade" aria-hidden="true"/>
      <span className="work-metadata"><strong>{work.title}</strong><small>{work.type}</small><time dateTime={work.releaseDate??undefined}>{formatReleaseDate(work.releaseDate,work.releasePrecision)}</time></span>
    </button>
    {adminControl&&<div className="work-admin-control">{adminControl}</div>}
  </article>;
}
