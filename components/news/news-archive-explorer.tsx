'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {Search} from 'lucide-react';
import FeedbackDialog from '@/components/feedback/feedback-dialog';
import StoryCard from './story-card';
import type {Story} from '@/lib/news/stories';
import {filterStories,newsPageCount,paginateStories,storyCategories} from '@/lib/news/explorer';
import styles from './news-archive-explorer.module.css';

export default function NewsArchiveExplorer({stories,initial}:{stories:Story[];initial:boolean}){
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('');
  const [page,setPage]=useState(1);
  const [columns,setColumns]=useState(2);
  const heading=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const media=window.matchMedia('(max-width: 550px)');
    const update=()=>setColumns(media.matches?1:2);
    update();media.addEventListener('change',update);
    return()=>media.removeEventListener('change',update);
  },[]);
  const categories=useMemo(()=>storyCategories(stories),[stories]);
  const filtered=useMemo(()=>filterStories(stories,query,category),[stories,query,category]);
  const pages=newsPageCount(filtered.length,columns);
  const activePage=Math.min(page,pages);
  const visible=useMemo(()=>paginateStories(filtered,activePage,columns),[filtered,activePage,columns]);
  function changePage(next:number){
    setPage(next);
    requestAnimationFrame(()=>heading.current?.scrollIntoView({behavior:'smooth',block:'start'}));
  }
  return <section className="news-content"><div className="news-feedback-rail"><FeedbackDialog variant="rail"/></div><div className="news-story-area">
    <div ref={heading} className="section-label"><h2>최신 소식 <span>LATEST TRANSMISSIONS</span></h2><span>최근 90일 · 게시일순</span></div>
    {initial&&<p className="initial-note">최근 90일 동안 확인된 기사입니다 · 관리자에서 새 소식을 수집할 수 있습니다.</p>}
    <div className={styles.tools} aria-label="뉴스 검색 및 분류">
      <label className={styles.search}><span className="sr-only">뉴스 검색</span><Search size={17} aria-hidden="true"/><input type="search" value={query} onChange={event=>{setQuery(event.target.value);setPage(1);}} placeholder="뉴스 검색" aria-label="뉴스 검색"/></label>
      <div className={styles.categories} role="group" aria-label="뉴스 카테고리">
        <button type="button" aria-pressed={!category} onClick={()=>{setCategory('');setPage(1);}}>전체</button>
        {categories.map(value=><button key={value} type="button" aria-pressed={category===value} onClick={()=>{setCategory(value);setPage(1);}}>{value}</button>)}
      </div>
      <span className={styles.result} aria-live="polite">{filtered.length}개의 이야기</span>
    </div>
    {visible.length?<div className="news-grid">{visible.map((story,index)=><StoryCard key={story.topic} story={story} eager={page===1&&index<2}/>)}</div>:<div className="empty">검색 조건에 맞는 이야기가 없습니다.</div>}
    {filtered.length>0&&<nav className={styles.pagination} aria-label="뉴스 페이지">
      <button type="button" disabled={activePage<=1} onClick={()=>changePage(activePage-1)}>이전</button><span><strong>{activePage}</strong> / {pages}</span><button type="button" disabled={activePage>=pages} onClick={()=>changePage(activePage+1)}>다음</button>
    </nav>}
    <div className="end-mark"><span/>MAY THE FORCE BE WITH YOU<span/></div>
  </div></section>;
}
