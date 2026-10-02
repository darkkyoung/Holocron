'use client';

import {useState} from 'react';
import type {Article} from '@/lib/news';

type Props={article:Article;busy:boolean;onRetry:(id:string)=>Promise<boolean>;onSave:(id:string,image:string)=>Promise<boolean>};

export default function ArticleImageEditor({article,busy,onRetry,onSave}:Props){
  const [editing,setEditing]=useState(false);
  const [value,setValue]=useState(article.image);
  if(!editing)return <div className="admin-image-actions" data-missing={!article.image}>
    <span>{article.image?'이미지 등록됨':'이미지 없음'}</span>
    <button type="button" disabled={busy} onClick={()=>onRetry(article.id)}>이미지 재조회</button>
    <button type="button" disabled={busy} onClick={()=>{setValue(article.image);setEditing(true);}}>이미지 URL 수정</button>
  </div>;
  return <div className="admin-image-editor">
    <label htmlFor={`article-image-${article.id}`}>이미지 URL</label>
    <input id={`article-image-${article.id}`} type="url" inputMode="url" value={value} placeholder="https://…" disabled={busy} onChange={event=>setValue(event.target.value)} autoFocus/>
    <small>{article.image?`현재 이미지: ${article.image}`:'현재 이미지가 없습니다.'}</small>
    <div><button type="button" disabled={busy||!value.trim()} onClick={async()=>{if(await onSave(article.id,value))setEditing(false);}}>저장</button><button type="button" className="secondary" disabled={busy} onClick={()=>{setValue(article.image);setEditing(false);}}>취소</button></div>
  </div>;
}
