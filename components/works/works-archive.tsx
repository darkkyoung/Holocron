'use client';

import {useState,type ReactNode} from 'react';
import WorkCard from './work-card';
import type {Work,WorksByStatus} from '@/lib/works/types';

const SECTION_COPY={upcoming:{title:'공개 예정',caption:'UPCOMING TRANSMISSIONS',empty:'현재 공개 예정 작품이 없습니다.'},recent:{title:'최근 공개',caption:'RECENT RELEASES',empty:'현재 최근 공개 작품이 없습니다.'},archive:{title:'아카이브',caption:'ARCHIVED STORIES',empty:'현재 아카이브 작품이 없습니다.'}} as const;

export default function WorksArchive({sections,renderControl}:{sections:WorksByStatus;renderControl?:(work:Work)=>ReactNode}){
  const [revealed,setRevealed]=useState<string|null>(null);
  return <div className="works-sections">{(Object.keys(SECTION_COPY) as (keyof WorksByStatus)[]).map(status=>{const section=SECTION_COPY[status];const works=sections[status];return <section className="works-section" key={status} aria-labelledby={`works-${status}`}><div className="works-section-heading"><div><span className="yellow-line"/><h2 id={`works-${status}`}>{section.title}</h2><small>{section.caption}</small></div><span>{works.length} 작품</span></div>{works.length?<div className="works-grid">{works.map(work=><WorkCard key={work.id} work={work} revealed={revealed===work.id} onReveal={setRevealed} onDismiss={()=>setRevealed(current=>current===work.id?null:current)} adminControl={renderControl?.(work)}/>)}</div>:<p className="works-empty">{section.empty}</p>}</section>;})}</div>;
}
