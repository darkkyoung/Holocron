'use client';
import {Dialog,DialogClose,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog';
import type {WorkNews} from '@/lib/news-work/types';
import {workNewsUrl} from '@/lib/news-work/projection';

export default function WorkRelatedNews({id,title,news}:{id:string;title:string;news:WorkNews}){
  if(!news.count)return null;
  return <Dialog><DialogTrigger asChild><button type="button" className="work-related-action" aria-label={`${title} 관련 소식 ${news.count}건`}>관련 소식 {news.count}</button></DialogTrigger>
    <DialogContent className="work-news-dialog" showCloseButton={false}>
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>관련 소식 {news.count}건 · 최근 90일</DialogDescription></DialogHeader>
      <DialogClose className="work-news-close" aria-label="관련 소식 닫기">닫기</DialogClose>
      <ul className="work-news-list">{news.stories.map(story=><li key={story.topic}><a href={story.url} target="_blank" rel="noopener noreferrer"><time dateTime={story.published}>{story.published.slice(0,10).replaceAll('-','.')}</time><strong>{story.title}</strong><span>{story.source}{story.sourceCount>1?` + ${story.sourceCount-1}`:''}</span></a></li>)}</ul>
      <a className="work-news-all" href={workNewsUrl(id)}>뉴스 아카이브에서 모두 보기 →</a>
    </DialogContent>
  </Dialog>;
}
