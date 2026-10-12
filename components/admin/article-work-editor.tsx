'use client';
import {useState} from 'react';
import './article-work-editor.css';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle,DialogTrigger} from '@/components/ui/dialog';
import type {ArticleWorkRelation,WorkChoice} from '@/lib/news-work/types';

type State={works:WorkChoice[];relations:ArticleWorkRelation[]};
export default function ArticleWorkEditor({articleId,disabled=false}:{articleId:string;disabled?:boolean}){
  const [data,setData]=useState<State|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function load(){setBusy(true);setError('');try{const response=await fetch(`/api/admin/news-work?article=${encodeURIComponent(articleId)}`,{cache:'no-store'});if(!response.ok)throw new Error('관련 작품을 불러오지 못했습니다.');setData(await response.json() as State);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function change(workId:string,state:'linked'|'excluded'){setBusy(true);setError('');try{const response=await fetch('/api/admin/news-work',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'set',articleId,workId,state})});if(!response.ok)throw new Error('관계를 저장하지 못했습니다.');setData(await response.json() as State);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <Dialog onOpenChange={open=>{if(open)void load();}}><DialogTrigger asChild><button type="button" className="article-work-open" disabled={disabled}>관련 작품</button></DialogTrigger><DialogContent className="article-work-dialog"><DialogHeader><DialogTitle>관련 작품</DialogTitle><DialogDescription>이 기사에만 적용됩니다. 수동 연결·제외는 자동 재검사보다 우선합니다.</DialogDescription></DialogHeader>
    {error&&<p role="alert">{error}</p>}{busy&&<p role="status">처리 중…</p>}
    <div className="article-work-options">{data?.works.map(work=>{const relation=data.relations.find(row=>row.workId===work.id);return <div key={work.id}><span>{work.title}<small>{relation?`${relation.state==='linked'?'연결됨':'제외됨'} · ${relation.origin==='manual'?'수동':'자동'}`:'미연결'}</small></span><button type="button" disabled={busy} onClick={()=>void change(work.id,relation?.state==='linked'?'excluded':'linked')}>{relation?.state==='linked'?'제외':relation?.state==='excluded'?'다시 연결':'연결'}</button></div>;})}</div>
  </DialogContent></Dialog>;
}
