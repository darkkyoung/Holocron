'use client';

import {useState} from 'react';
import type {Article} from '@/lib/news';
import {ARTICLE_TITLE_OVERRIDE_MAX_LENGTH,displayArticleTitle} from '@/lib/news/presentation';

export default function ArticleTitleOverrideEditor({article,busy,onSave,onClear}:{article:Article;busy:boolean;onSave:(id:string,title:string)=>Promise<void>;onClear:(id:string)=>Promise<void>}){
  const [editing,setEditing]=useState(false);
  const [value,setValue]=useState(article.titleOverride??displayArticleTitle(article));
  if(!editing)return <div className="admin-title-override-summary"><span>{article.titleOverride?'관리자 제목 사용 중':'자동 생성 제목 사용 중'}</span><button type="button" disabled={busy} onClick={()=>{setValue(article.titleOverride??displayArticleTitle(article));setEditing(true);}}>제목 수정</button></div>;
  return <div className="admin-title-override-editor">
    <label htmlFor={`title-override-${article.id}`}>공개 제목</label>
    <input id={`title-override-${article.id}`} value={value} maxLength={ARTICLE_TITLE_OVERRIDE_MAX_LENGTH} disabled={busy} onChange={event=>setValue(event.target.value)} autoFocus/>
    <small>현재 표시: {displayArticleTitle(article)} · 자동 생성 원본: {article.title}</small>
    <div><button type="button" disabled={busy||!value.trim()} onClick={async()=>{await onSave(article.id,value);setEditing(false);}}>저장</button>{article.titleOverride&&<button type="button" className="secondary" disabled={busy} onClick={async()=>{await onClear(article.id);setEditing(false);}}>자동 제목으로 되돌리기</button>}<button type="button" className="secondary" disabled={busy} onClick={()=>{setValue(article.titleOverride??displayArticleTitle(article));setEditing(false);}}>취소</button></div>
  </div>;
}
