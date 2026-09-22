'use client';

import {Sheet,SheetContent,SheetDescription,SheetHeader,SheetTitle} from '@/components/ui/sheet';
import type {Article,ArticleStatus} from '@/lib/news';
import {ArrowUpRight,FileWarning,Undo2} from 'lucide-react';

type PanelStatus=Extract<ArticleStatus,'excluded'|'review'>;
type Props={status:PanelStatus|null;articles:Article[];busy:boolean;onOpenChange:(open:boolean)=>void;onAction:(action:string,ids:string[])=>Promise<void>};
function displayDate(value:string){return value?.slice(0,10).replaceAll('-','. ')||'게시일 미확인';}

export default function AdminStatusSheet({status,articles,busy,onOpenChange,onAction}:Props){
  const items=status?articles.filter(article=>article.status===status):[];
  const isReview=status==='review';
  return <Sheet open={status!==null} onOpenChange={onOpenChange}><SheetContent className="admin-status-sheet" side="right">
    <SheetHeader className="admin-sheet-header"><div className="eyebrow">ADMINISTRATOR QUEUE</div><SheetTitle>{isReview?'검토 필요':'관리자 제외'} <span>{items.length}</span></SheetTitle><SheetDescription>{isReview?'공개되지 않은 이유를 확인하고 상태를 결정하세요.':'관리자가 뉴스에서 제외한 기사입니다.'}</SheetDescription></SheetHeader>
    <div className="admin-sheet-list">{items.map(article=><article className="admin-sheet-item" key={article.id}>
      <div className="admin-sheet-item-meta"><span>{article.source}</span><time dateTime={article.published}>{displayDate(article.published)}</time></div><h3>{article.title}</h3>
      <p className="admin-reason"><FileWarning size={14}/><span><strong>처리 사유</strong>{article.reason||'사유 미확인'}</span></p>
      <div className="admin-sheet-actions"><a href={article.url} target="_blank" rel="noopener noreferrer">원문 <ArrowUpRight size={14}/></a>{isReview?<><button disabled={busy} onClick={()=>onAction('publish-review',[article.id])}>검토 후 공개</button><button className="secondary" disabled={busy} onClick={()=>onAction('exclude',[article.id])}>뉴스에서 제외</button></>:<button disabled={busy} onClick={()=>onAction('restore',[article.id])}><Undo2 size={14}/> 복구</button>}</div>
    </article>)}{!items.length&&<div className="admin-sheet-empty">이 목록에 기사가 없습니다.</div>}</div>
  </SheetContent></Sheet>;
}
