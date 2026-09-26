'use client';

import {useState,type ReactNode} from 'react';
import WorkCard from './work-card';
import type {Work,WorksByStatus} from '@/lib/works/types';
import {resolveWorkDestination} from '@/lib/works/destination';
import WorkDestinationDialog from './work-destination-dialog';

const SECTION_COPY={upcoming:{title:'공개 예정',caption:'UPCOMING TRANSMISSIONS',empty:'현재 공개 예정 작품이 없습니다.'},recent:{title:'최근 공개',caption:'RECENT RELEASES',empty:'현재 최근 공개 작품이 없습니다.'},archive:{title:'아카이브',caption:'ARCHIVED STORIES',empty:'현재 아카이브 작품이 없습니다.'}} as const;

export default function WorksArchive({sections,featured=null,renderControl}:{sections:WorksByStatus;featured?:Work|null;renderControl?:(work:Work)=>ReactNode}){
  const [revealed,setRevealed]=useState<string|null>(null);
  const [ticketWork,setTicketWork]=useState<Work|null>(null);
  const [message,setMessage]=useState('');
  function activate(work:Work){const destination=resolveWorkDestination(work);if(destination.kind==='ticket'){setTicketWork(work);return;}if(destination.kind==='unavailable'){setMessage(`${work.title}의 공식 페이지는 아직 준비 중입니다.`);return;}window.open(destination.url,'_blank','noopener,noreferrer');}
  function card(work:Work,featuredCard=false){const destination=resolveWorkDestination(work);const destinationAction=renderControl?undefined:activate;return <WorkCard key={work.id} work={work} featured={featuredCard} revealed={revealed===work.id} onReveal={setRevealed} onDismiss={()=>setRevealed(current=>current===work.id?null:current)} onActivate={destinationAction} destinationAvailable={destination.kind!=='unavailable'} adminControl={renderControl?.(work)}/>;}
  return <><div className="works-sections">{featured&&<section className="works-featured" aria-labelledby="featured-work"><div className="works-section-heading"><div><span className="yellow-line"/><h2 id="featured-work">기대작</h2><small>FEATURED WORK</small></div><span>{featured.status==='recent'&&featured.type==='영화'?'현재 상영작':'공개 예정'}</span></div><div className="works-featured-card">{card(featured,true)}</div></section>}{message&&<p className="works-destination-message" role="status">{message}</p>}{(Object.keys(SECTION_COPY) as (keyof WorksByStatus)[]).map(status=>{const section=SECTION_COPY[status];const works=sections[status];return <section className="works-section" key={status} aria-labelledby={`works-${status}`}><div className="works-section-heading"><div><span className="yellow-line"/><h2 id={`works-${status}`}>{section.title}</h2><small>{section.caption}</small></div><span>{works.length} 작품</span></div>{works.length?<div className="works-grid">{works.map(work=>card(work))}</div>:<p className="works-empty">{section.empty}</p>}</section>;})}</div><WorkDestinationDialog work={ticketWork} onOpenChange={open=>{if(!open)setTicketWork(null);}}/></>;
}
