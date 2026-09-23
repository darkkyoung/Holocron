'use client';

import {useEffect,useMemo,useState} from 'react';
import {Header} from '../newsroom';
import AdminCommandRail from '@/components/admin/admin-command-rail';
import AdminStatusSheet from '@/components/admin/admin-status-sheet';
import AdminStoryCard from '@/components/admin/admin-story-card';
import AdminSourceSettingsSheet from '@/components/admin/admin-source-settings-sheet';
import {buildStories} from '@/lib/news/stories';
import type {Article} from '@/lib/news';
import type {SourceId,SourceSettingItem} from '@/lib/collection/source-settings';
import {Layers3,Orbit} from 'lucide-react';

type ManagementResponse={error?:string;articles:Article[];visibleArticles:Article[];sources:SourceSettingItem[];ai:boolean;now:number;report?:string[]};
type PanelStatus='excluded'|'review';

async function fetchManagement(signal?:AbortSignal){
  const response=await fetch('/api/manage',{signal});
  const data=await response.json() as ManagementResponse;
  if(!response.ok)throw new Error(data.error);
  return data;
}

export default function Admin({authorized,authorizationError,initialState,name}:{authorized:boolean;authorizationError?:string;initialState?:ManagementResponse;name:string}){
  const [ready,setReady]=useState(authorized);
  const [articles,setArticles]=useState<Article[]>(initialState?.articles??[]);
  const [visibleArticles,setVisibleArticles]=useState<Article[]>(initialState?.visibleArticles??[]);
  const [sources,setSources]=useState<SourceSettingItem[]>(initialState?.sources??[]);
  const [ai,setAi]=useState(initialState?.ai??false);
  const [projectionNow,setProjectionNow]=useState(initialState?.now??0);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [panel,setPanel]=useState<PanelStatus|null>(null);
  const [sourceSettingsOpen,setSourceSettingsOpen]=useState(false);
  const [ids,setIds]=useState<string[]>([]);
  const stories=useMemo(()=>buildStories(visibleArticles,projectionNow),[visibleArticles,projectionNow]);
  const publicArticleCount=stories.reduce((count,story)=>count+story.articles.length,0);

  async function refresh(){
    const data=await fetchManagement();
    setArticles(data.articles);setVisibleArticles(data.visibleArticles);setSources(data.sources);setAi(data.ai);setProjectionNow(data.now);
  }
  useEffect(()=>{
    if(!ready||initialState)return;
    const controller=new AbortController();
    fetchManagement(controller.signal).then(data=>{setArticles(data.articles);setVisibleArticles(data.visibleArticles);setSources(data.sources);setAi(data.ai);setProjectionNow(data.now);}).catch(error=>{if(!controller.signal.aborted)setMessage((error as Error).message);});
    return ()=>controller.abort();
  },[ready,initialState]);

  async function act(action:string,payload:{ids?:string[];sourceId?:SourceId;enabled?:boolean}={}){
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/manage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});
      const data=await response.json() as {error?:string;report?:string[]};
      if(!response.ok)throw new Error(data.error);
      setReady(true);await refresh();setIds([]);
      setMessage(data.report?data.report.join('\n'):'변경 사항을 저장했습니다.');
    }catch(error){setMessage((error as Error).message);}finally{setBusy(false);}
  }
  function toggle(id:string,selected:boolean){setIds(current=>selected?[...new Set([...current,id])]:current.filter(value=>value!==id));}
  function toggleStory(storyIds:string[],selected:boolean){setIds(current=>selected?[...new Set([...current,...storyIds])]:current.filter(id=>!storyIds.includes(id)));}

  return <><Header admin/><main className="shell admin-mode-shell">
    <section className="admin-mode-heading"><div><div className="eyebrow"><span className="yellow-line"/> HOLOCRON / CONTROL ROOM</div><h1>Administrator <span>Mode</span></h1><p>{name}님 · 실제 공개 카드 구조를 보면서 관리자 결정을 저장하세요.</p></div><Layers3 size={50}/></section>
    {(message||authorizationError)&&<div role="status" className="admin-message">{message||authorizationError}</div>}
    {!ready?<div className="setup-box"><h2>관리자 세션을 확인할 수 없습니다</h2><p>다시 관리자 로그인 후 시도해 주세요. 보안을 위해 계정 식별 정보는 이 화면에 표시하지 않습니다.</p></div>:<>
      <div className="archive-bar admin-archive-bar"><div><Orbit size={20}/><strong>스타워즈 공개 뉴스</strong><span className="edition">ADMIN VIEW</span></div><span className="archive-count">최근 90일 · {stories.length}개의 이야기 · {publicArticleCount}개 기사</span></div>
      <div className="admin-mode-layout">
        <AdminCommandRail published={publicArticleCount} excluded={articles.filter(article=>article.status==='excluded').length} review={articles.filter(article=>article.status==='review').length} activeSources={sources.filter(source=>source.enabled).length} totalSources={sources.length} ai={ai} busy={busy} onOpen={setPanel} onOpenSources={()=>setSourceSettingsOpen(true)} onAction={act}/>
        <section className="admin-archive" aria-label="공개 뉴스 관리자 아카이브">
          <div className="section-label"><h2>정상 공개 <span>PUBLIC NEWS ARCHIVE</span></h2><span>public과 동일한 게시일순</span></div>
          <div className="admin-selection-toolbar" data-active={ids.length>0}><div><strong>선택 기사 {ids.length}개</strong><span>체크박스는 story가 아니라 개별 기사를 선택합니다.</span></div><div><button disabled={busy||ids.length<2} onClick={()=>act('merge',{ids})}>같은 주제로 묶기</button><button disabled={busy||!ids.length} onClick={()=>act('split',{ids})}>주제 묶음 해제</button><button className="danger" disabled={busy||!ids.length} onClick={()=>act('exclude',{ids})}>뉴스에서 제외</button></div></div>
          <div className="news-grid admin-news-grid">{stories.map((story,index)=><AdminStoryCard key={story.topic} story={story} eager={index<2} align={index%2?'right':'left'} selectedIds={ids} disabled={busy} onToggle={toggle} onToggleStory={toggleStory}/>)}</div>
          {!stories.length&&<div className="empty">최근 90일 안에 공개된 기사가 없습니다. 수집하거나 검토 목록에서 공개해 주세요.</div>}
          <p className="small-muted admin-policy-note">대표 기사는 public과 동일하게 확인된 게시 시각이 가장 이른 기사입니다. 병합·분리·제외·복구 결과는 이후 자동 처리보다 우선합니다.</p>
        </section>
      </div>
      <AdminStatusSheet status={panel} articles={articles} busy={busy} onOpenChange={open=>{if(!open)setPanel(null);}} onAction={(action,actionIds)=>act(action,{ids:actionIds})}/>
      <AdminSourceSettingsSheet open={sourceSettingsOpen} sources={sources} busy={busy} onOpenChange={setSourceSettingsOpen} onToggle={(sourceId,enabled)=>act('set-source-enabled',{sourceId,enabled})}/>
    </>}
  </main></>;
}
