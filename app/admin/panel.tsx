'use client';
import {useEffect,useState} from 'react';
import {Header} from '../newsroom';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Checkbox} from '@/components/ui/checkbox';
import type {Article} from '@/lib/news';

async function fetchManagement(signal?:AbortSignal){
  const response=await fetch('/api/manage',{signal});
  const data=await response.json() as {error?:string;articles:Article[];ai:boolean};
  if(!response.ok)throw new Error(data.error);
  return data;
}

export default function Admin({authorized,name}:{authorized:boolean;name:string}){
  const [ready,setReady]=useState(authorized),[articles,setArticles]=useState<Article[]>([]),[ai,setAi]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[tab,setTab]=useState('published'),[ids,setIds]=useState<string[]>([]);
  async function refresh(){const data=await fetchManagement();setArticles(data.articles);setAi(data.ai);}
  useEffect(()=>{
    if(!ready)return;
    const controller=new AbortController();
    fetchManagement(controller.signal)
      .then(data=>{setArticles(data.articles);setAi(data.ai);})
      .catch(error=>{if(!controller.signal.aborted)setMessage((error as Error).message);});
    return ()=>controller.abort();
  },[ready]);
  async function act(action:string){setBusy(true);setMessage('');try{const r=await fetch('/api/manage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,ids})});const d=await r.json() as {error?:string;report?:string[]};if(!r.ok)throw new Error(d.error);setReady(true);await refresh();setIds([]);setMessage(d.report?d.report.join('\n'):'변경 사항을 저장했습니다.');}catch(e){setMessage((e as Error).message);}finally{setBusy(false);}}
  const filtered=articles.filter(a=>a.status===tab);
  return <><Header admin/><main className="admin-shell"><div className="eyebrow">HOLOCRON / CONTROL ROOM</div><h1>아카이브 관리</h1><p className="admin-description">{name}님 · 기사를 검토하고, 같은 소식을 정리하세요.</p>{message&&<div role="status" className="admin-message">{message}</div>}{!ready?<div className="setup-box"><h2>관리자 시작하기</h2><p>현재 사이트는 소유자만 볼 수 있습니다. 최초 시작 시 로그인한 계정을 관리자로 등록하고, 확인된 기사들을 아카이브에 저장합니다.</p><button className="setup-button" disabled={busy} onClick={()=>act('initialize')}>{busy?'준비 중…':'관리자 등록 및 아카이브 시작'}</button></div>:<><div className="admin-stats"><div className="admin-stat"><strong>{articles.filter(a=>a.status==='published').length}</strong><span>공개 기사</span></div><div className="admin-stat"><strong>{articles.filter(a=>a.status==='excluded').length}</strong><span>제외 / 검토 대기</span></div><div className="admin-stat"><strong>{new Set(articles.map(a=>a.topic)).size}</strong><span>주제</span></div></div><p className="admin-description">한국어 자동 요약: {ai?'연결됨':'연결 대기'} · 최근 90일 기사를 아래 버튼으로 수집합니다.</p>{!ai&&<p className="small-muted">OpenAI API 키 연결 전에는 원문의 제목과 설명으로 우선 공개됩니다. 키를 연결하면 새 기사부터 한국어로 자동 요약됩니다.</p>}<div className="admin-toolbar"><button disabled={busy} onClick={()=>act('collect')}>{busy?'7개 소스 확인 중…':'7개 소스에서 기사 수집'}</button><button className="secondary" disabled={busy||ids.length<2} onClick={()=>act('merge')}>선택 기사 병합 ({ids.length})</button><button className="secondary" disabled={busy||!ids.length} onClick={()=>act('split')}>주제 분리</button><button className="secondary" disabled={busy||!ids.length} onClick={()=>act(tab==='published'?'exclude':'restore')}>{tab==='published'?'선택 기사 제외':'선택 기사 복구'}</button></div><Tabs value={tab} onValueChange={v=>{setTab(v);setIds([]);}}><TabsList><TabsTrigger value="published">공개 기사</TabsTrigger><TabsTrigger value="excluded">제외 / 검토 대기</TabsTrigger></TabsList></Tabs><div className="admin-list">{filtered.map(a=><div className="admin-row" key={a.id}><label><Checkbox aria-label={`${a.title} 선택`} checked={ids.includes(a.id)} onCheckedChange={v=>setIds(v?[...ids,a.id]:ids.filter(x=>x!==a.id))}/></label><div><h3>{a.title}</h3><p>{a.source} · {a.published?.slice(0,10)||'게시일 미확인'} · 같은 주제 {articles.filter(x=>x.topic===a.topic).length}건</p>{a.reason&&<p>{a.reason}</p>}</div><a href={a.url} target="_blank" rel="noreferrer">원문 ↗</a></div>)}{!filtered.length&&<div className="empty">이 목록에 기사가 없습니다.</div>}</div><p className="small-muted">병합하면 선택한 기사들이 하나의 주제로 묶이며 가장 이른 게시 기사가 대표가 됩니다. 주제 분리는 선택한 기사 각각을 독립시킵니다. 제외한 기사는 언제든 복구할 수 있습니다.</p></>}</main></>;
}
