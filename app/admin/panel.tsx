'use client';
import {useEffect,useState} from 'react';
import {Header} from '../newsroom';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Checkbox} from '@/components/ui/checkbox';
import type {Article,ArticleStatus} from '@/lib/news';

type ManagementResponse={error?:string;articles:Article[];ai:boolean};

async function fetchManagement(signal?:AbortSignal){
  const response=await fetch('/api/manage',{signal});
  const data=await response.json() as ManagementResponse;
  if(!response.ok)throw new Error(data.error);
  return data;
}

const tabAction:Record<ArticleStatus,{action:string;label:string}>={
  published:{action:'exclude',label:'뉴스에서 제외'},
  excluded:{action:'restore',label:'복구'},
  review:{action:'publish-review',label:'검토 후 공개'},
};

export default function Admin({authorized,authorizationError,initialState,name}:{authorized:boolean;authorizationError?:string;initialState?:ManagementResponse;name:string}){
  const [ready,setReady]=useState(authorized),[articles,setArticles]=useState<Article[]>(initialState?.articles??[]),[ai,setAi]=useState(initialState?.ai??false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[tab,setTab]=useState<ArticleStatus>('published'),[ids,setIds]=useState<string[]>([]);
  async function refresh(){const data=await fetchManagement();setArticles(data.articles);setAi(data.ai);}
  useEffect(()=>{
    if(!ready||initialState)return;
    const controller=new AbortController();
    fetchManagement(controller.signal)
      .then(data=>{setArticles(data.articles);setAi(data.ai);})
      .catch(error=>{if(!controller.signal.aborted)setMessage((error as Error).message);});
    return ()=>controller.abort();
  },[ready,initialState]);
  async function act(action:string){
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/manage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,ids})});
      const data=await response.json() as {error?:string;report?:string[]};
      if(!response.ok)throw new Error(data.error);
      setReady(true);await refresh();setIds([]);setMessage(data.report?data.report.join('\n'):'변경 사항을 저장했습니다.');
    }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
  }
  const filtered=articles.filter(article=>article.status===tab);
  const currentAction=tabAction[tab];
  return <><Header admin/><main className="admin-shell">
    <div className="eyebrow">HOLOCRON / CONTROL ROOM</div><h1>아카이브 관리</h1>
    <p className="admin-description">{name}님 · 자동 수집 결과를 확인하고 관리자 결정을 저장하세요. 관리자 결정은 다음 수집보다 우선합니다.</p>
    {(message||authorizationError)&&<div role="status" className="admin-message">{message||authorizationError}</div>}
    {!ready?<div className="setup-box"><h2>관리자 접근 불가</h2><p>관리자 이메일 설정과 ChatGPT 로그인 상태를 확인해 주세요. 보안을 위해 계정 식별 정보는 이 화면에 표시하지 않습니다.</p></div>:<>
      <div className="admin-stats">
        <div className="admin-stat"><strong>{articles.filter(article=>article.status==='published').length}</strong><span>정상 공개</span></div>
        <div className="admin-stat"><strong>{articles.filter(article=>article.status==='excluded').length}</strong><span>관리자 제외</span></div>
        <div className="admin-stat"><strong>{articles.filter(article=>article.status==='review').length}</strong><span>검토 필요</span></div>
        <div className="admin-stat"><strong>{new Set(articles.map(article=>article.topic)).size}</strong><span>주제</span></div>
      </div>
      <p className="admin-description">한국어 자동 요약: {ai?'연결됨':'연결 대기'} · 최근 90일 기사를 아래 버튼으로 수집합니다.</p>
      {!ai&&<p className="small-muted">OpenAI API 키 연결 전에는 원문의 제목과 설명으로 우선 공개됩니다. 키를 연결하면 새 기사부터 한국어로 자동 요약됩니다.</p>}
      <div className="admin-toolbar">
        <button disabled={busy} onClick={()=>act('collect')}>{busy?'7개 소스 확인 중…':'7개 소스에서 기사 수집'}</button>
        <button className="secondary" disabled={busy||ids.length<2} onClick={()=>act('merge')}>같은 주제로 묶기 ({ids.length})</button>
        <button className="secondary" disabled={busy||!ids.length} onClick={()=>act('split')}>주제 묶음 해제</button>
        <button className="secondary" disabled={busy||!ids.length} onClick={()=>act(currentAction.action)}>{currentAction.label}</button>
      </div>
      <Tabs value={tab} onValueChange={value=>{setTab(value as ArticleStatus);setIds([]);}}><TabsList><TabsTrigger value="published">정상 공개</TabsTrigger><TabsTrigger value="excluded">관리자 제외</TabsTrigger><TabsTrigger value="review">검토 필요</TabsTrigger></TabsList></Tabs>
      <div className="admin-list">{filtered.map(article=><div className="admin-row" key={article.id}>
        <label><Checkbox aria-label={`${article.title} 선택`} checked={ids.includes(article.id)} onCheckedChange={checked=>setIds(checked?[...ids,article.id]:ids.filter(id=>id!==article.id))}/></label>
        <div><h3>{article.title}</h3><p>{article.source} · {article.published?.slice(0,10)||'게시일 미확인'} · 같은 주제 {articles.filter(item=>item.topic===article.topic).length}건</p>{article.reason&&<p><strong>처리 사유:</strong> {article.reason}</p>}</div>
        <a href={article.url} target="_blank" rel="noreferrer">원문 ↗</a>
      </div>)}{!filtered.length&&<div className="empty">이 목록에 기사가 없습니다.</div>}</div>
      <p className="small-muted">같은 주제로 묶어도 가장 이른 게시 기사가 대표가 됩니다. 주제 묶음 해제·뉴스 제외·복구 결과는 이후 자동 수집보다 우선하여 유지됩니다.</p>
    </>}
  </main></>;
}
