'use client';

import {useState,type ReactNode} from 'react';
import WorkCard from './work-card';
import {WORK_TYPES,type Work,type WorksByStatus,type WorkType} from '@/lib/works/types';
import {resolveWorkDestination} from '@/lib/works/destination';
import WorkDestinationDialog from './work-destination-dialog';

const SECTION_COPY={upcoming:{title:'공개 예정',caption:'UPCOMING TRANSMISSIONS',empty:'현재 공개 예정 작품이 없습니다.'},recent:{title:'최근 공개',caption:'RECENT RELEASES',empty:'현재 최근 공개 작품이 없습니다.'},archive:{title:'아카이브',caption:'ARCHIVED STORIES',empty:'현재 아카이브 작품이 없습니다.'}} as const;
const WORK_FILTER_LABEL:Record<WorkType,string>={영화:'영화',드라마:'시리즈',애니메이션:'애니메이션',기타:'기타'};

export default function WorksArchive({sections,featured=null,renderControl}:{sections:WorksByStatus;featured?:Work|null;renderControl?:(work:Work)=>ReactNode}){
  const [revealed,setRevealed]=useState<string|null>(null);
  const [ticketWork,setTicketWork]=useState<Work|null>(null);
  const [message,setMessage]=useState('');
  const [typeFilter,setTypeFilter]=useState<WorkType|null>(null);
  const filtering=!renderControl&&typeFilter!==null;
  const visibleSections=filtering?Object.fromEntries(Object.entries(sections).map(([status,works])=>[status,works.filter(work=>work.type===typeFilter)])) as WorksByStatus:sections;
  const visibleFeatured=!featured||!filtering||featured.type===typeFilter?featured:null;
  const visibleCount=Object.values(visibleSections).reduce((count,items)=>count+items.length,0);
  function selectType(type:WorkType|null){setTypeFilter(type);setRevealed(null);setTicketWork(null);setMessage('');}
  function activate(work:Work){const destination=resolveWorkDestination(work);if(destination.kind==='ticket'){setTicketWork(work);return;}if(destination.kind==='unavailable'){setMessage(`${work.title}의 공식 페이지는 아직 준비 중입니다.`);return;}window.open(destination.url,'_blank','noopener,noreferrer');}
  function card(work:Work,featuredCard=false){const destination=resolveWorkDestination(work);const destinationAction=renderControl?undefined:activate;return <WorkCard key={work.id} work={work} featured={featuredCard} revealed={revealed===work.id} onReveal={setRevealed} onDismiss={()=>setRevealed(current=>current===work.id?null:current)} onActivate={destinationAction} destinationAvailable={destination.kind!=='unavailable'} adminControl={renderControl?.(work)}/>;}
  return <>{!renderControl&&<div className="works-filter-bar" role="group" aria-label="작품 유형 필터"><button type="button" aria-pressed={typeFilter===null} onClick={()=>selectType(null)}>전체</button>{WORK_TYPES.map(type=><button key={type} type="button" aria-pressed={typeFilter===type} onClick={()=>selectType(type)}>{WORK_FILTER_LABEL[type]}</button>)}<span aria-live="polite">{visibleCount} 작품</span></div>}<div className="works-sections">{visibleFeatured&&<section className="works-featured" aria-labelledby="featured-work"><div className="works-section-heading"><div><span className="yellow-line"/><h2 id="featured-work">기대작</h2><small>FEATURED WORK</small></div><span>{visibleFeatured.status==='recent'&&visibleFeatured.type==='영화'?'현재 상영작':'공개 예정'}</span></div><div className="works-featured-card">{card(visibleFeatured,true)}</div></section>}{message&&<p className="works-destination-message" role="status">{message}</p>}{(Object.keys(SECTION_COPY) as (keyof WorksByStatus)[]).map(status=>{const section=SECTION_COPY[status];const works=visibleSections[status];if((filtering||status==='recent')&&!works.length)return null;return <section className="works-section" key={status} aria-labelledby={`works-${status}`}><div className="works-section-heading"><div><span className="yellow-line"/><h2 id={`works-${status}`}>{section.title}</h2><small>{section.caption}</small></div><span>{works.length} 작품</span></div>{works.length?<div className="works-grid">{works.map(work=>card(work))}</div>:<p className="works-empty">{section.empty}</p>}</section>;})}{filtering&&visibleCount===0&&<p className="works-empty works-filter-empty">선택한 유형의 작품이 없습니다.</p>}</div><WorkDestinationDialog work={ticketWork} onOpenChange={open=>{if(!open)setTicketWork(null);}}/></>;
}
