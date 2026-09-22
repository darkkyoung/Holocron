'use client';

import {Checkbox} from '@/components/ui/checkbox';
import StoryCard from '@/components/news/story-card';
import type {Story} from '@/lib/news/stories';
import {ArrowUpRight, ChevronDown, Star} from 'lucide-react';

type Props={story:Story;selectedIds:readonly string[];disabled:boolean;eager?:boolean;align:'left'|'right';onToggle:(id:string,selected:boolean)=>void;onToggleStory:(ids:string[],selected:boolean)=>void};

function displayDate(value:string){return value?.slice(0,10).replaceAll('-','. ')||'게시일 미확인';}

export default function AdminStoryCard({story,selectedIds,disabled,eager=false,align,onToggle,onToggleStory}:Props){
  const memberIds=story.articles.map(article=>article.id);
  const selectedCount=memberIds.filter(id=>selectedIds.includes(id)).length;
  const allSelected=selectedCount===memberIds.length;
  const storyChecked=allSelected?true:selectedCount?'indeterminate':false;
  return <section className="admin-story-card" data-topic={story.topic}>
    <div className="admin-story-select"><label><Checkbox aria-label={`${story.articles[0].title} 주제 전체 선택`} checked={storyChecked} disabled={disabled} onCheckedChange={checked=>onToggleStory(memberIds,checked===true)}/><span>주제 전체 선택</span></label><span>{selectedCount}/{memberIds.length} 선택</span></div>
    <StoryCard story={story} eager={eager} align={align}/>
    <details className="admin-topic-members" open={story.articles.length>1}>
      <summary><span><ChevronDown size={15}/> 주제 관리</span><strong>{story.articles.length}개 기사</strong></summary>
      <div className="admin-member-list">{story.articles.map((article,index)=><div className="admin-member" key={article.id} data-representative={index===0}>
        <label className="admin-member-check"><Checkbox aria-label={`${article.title} 기사 선택`} checked={selectedIds.includes(article.id)} disabled={disabled} onCheckedChange={checked=>onToggle(article.id,checked===true)}/><span className="sr-only">기사 선택</span></label>
        <div className="admin-member-copy"><div className="admin-member-meta">{index===0&&<strong className="representative-badge"><Star size={11} fill="currentColor"/> 대표</strong>}<span>{article.source}</span><time dateTime={article.published}>{displayDate(article.published)}</time></div><h3>{article.title}</h3></div>
        <a href={article.url} target="_blank" rel="noopener noreferrer" aria-label={`${article.source} 원문 열기`}><ArrowUpRight size={16}/></a>
      </div>)}</div>
    </details>
  </section>;
}
