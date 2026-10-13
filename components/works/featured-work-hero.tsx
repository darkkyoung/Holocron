'use client';
/* eslint-disable @next/next/no-img-element */
import {useEffect,useRef,useState} from 'react';
import {Dialog,DialogClose,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {formatReleaseDate,type Work} from '@/lib/works/types';
import {resolveWorkDestination} from '@/lib/works/destination';
import type {WorkNews} from '@/lib/news-work/types';
import {WorkRelatedNewsContent} from './work-related-news';
import {WorkTicketContent} from './work-destination-dialog';
import styles from './featured-work-hero.module.css';

function Poster({work}:{work:Work}){
  const [failed,setFailed]=useState(false);
  return <span className={styles.poster}>{work.posterUrl&&!failed?<img src={work.posterUrl} alt={`${work.title} 포스터`} onError={()=>setFailed(true)} loading="eager"/>:<span className={styles.placeholder}>HOLOCRON<br/>WORKS</span>}</span>;
}

export function FeaturedMetadata({work,full=false}:{work:Work;full?:boolean}){
  return <>
    {(work.creatorCredit||work.principalCast?.length)&&<dl className={styles.credits}>
      {work.creatorCredit&&<div><dt>제작·감독</dt><dd>{work.creatorCredit}</dd></div>}
      {!!work.principalCast?.length&&<div><dt>주요 출연</dt><dd>{(full?work.principalCast:work.principalCast.slice(0,5)).join(' · ')}</dd></div>}
    </dl>}
    {work.synopsis&&<p className={full?styles.fullSynopsis:styles.synopsis}>{work.synopsis}</p>}
  </>;
}

type Mode='detail'|'news'|'ticket';
export default function FeaturedWorkHero({work,news}:{work:Work;news?:WorkNews}){
  const [mode,setMode]=useState<Mode|null>(null);
  const returnFocus=useRef<HTMLElement|null>(null);
  const dialog=useRef<HTMLDivElement|null>(null);
  const destination=resolveWorkDestination(work);
  const status=work.status==='upcoming'?'공개 예정':work.status==='recent'?'최근 공개':'아카이브';
  function open(next:Mode,trigger:HTMLElement){returnFocus.current=trigger;setMode(next);}
  useEffect(()=>{
    if(mode){const heading=dialog.current?.querySelector<HTMLElement>('[data-slot="dialog-title"]');if(heading){heading.tabIndex=-1;heading.focus();}dialog.current?.scrollTo(0,0);}
  },[mode]);
  const actions=(inside=false)=><div className={styles.actions}>
    {destination.kind==='ticket'?<button type="button" onClick={event=>inside?setMode('ticket'):open('ticket',event.currentTarget)}>예매하기</button>:destination.kind==='unavailable'?<button type="button" disabled>공식 페이지 준비 중</button>:<a href={destination.url} target="_blank" rel="noopener noreferrer">{destination.kind==='official'?'공식 페이지':'Disney+에서 보기'} ↗</a>}
    {!!news?.count&&<button type="button" className={styles.secondary} onClick={event=>inside?setMode('news'):open('news',event.currentTarget)}>관련 소식 {news.count}</button>}
  </div>;
  const release=<p className={styles.release}>{formatReleaseDate(work.releaseDate,work.releasePrecision)}{work.releaseContext&&<span>{work.releaseContext}</span>}</p>;
  return <Dialog open={mode!==null} onOpenChange={open=>{if(!open)setMode(null);}}>
    <div className={styles.desktop}>
      <Poster key={work.posterUrl} work={work}/>
      <div className={styles.body}><p className={styles.status}>{status} · {work.type}</p><h3>{work.title}</h3>{work.originalTitle&&<p className={styles.original}>{work.originalTitle}</p>}{release}<FeaturedMetadata work={work}/>{actions()}</div>
    </div>
    <button type="button" className={styles.preview} aria-haspopup="dialog" aria-expanded={mode!==null} onClick={event=>open('detail',event.currentTarget)}>
      <Poster key={work.posterUrl} work={work}/><span className={styles.previewBody}><span className={styles.status}>{status} · {work.type}</span><strong>{work.title}</strong>{work.originalTitle&&<span className={styles.original}>{work.originalTitle}</span>}<span className={styles.previewRelease}>{formatReleaseDate(work.releaseDate,work.releasePrecision)}</span><span className={styles.detailHint}>작품 정보 보기 →</span></span>
    </button>
    <DialogContent ref={dialog} className={`${styles.sheet} ${mode==='news'?'work-news-dialog':mode==='ticket'?'ticketing-dialog':''}`} showCloseButton={false} onCloseAutoFocus={event=>{event.preventDefault();returnFocus.current?.focus();}}>
      {mode==='detail'?<><DialogClose className={styles.close} aria-label="작품 정보 닫기">닫기</DialogClose><DialogHeader><DialogTitle className={styles.sheetTitle}>{work.title}</DialogTitle><DialogDescription>{work.originalTitle?`${work.originalTitle} · `:''}{status} · {work.type}</DialogDescription></DialogHeader>{release}<FeaturedMetadata work={work} full/>{actions(true)}</>:mode==='news'&&news?<WorkRelatedNewsContent id={work.id} title={work.title} news={news}/>:mode==='ticket'?<WorkTicketContent title={work.title}/>:null}
      {mode!=='detail'&&<button type="button" className={styles.back} onClick={()=>setMode('detail')}>← 작품 정보</button>}
    </DialogContent>
  </Dialog>;
}
