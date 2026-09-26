'use client';

import {CircleCheck,FileWarning,RefreshCw,RotateCcw,Settings2,ShieldX} from 'lucide-react';

type LastCollection={trigger:'manual'|'scheduled';startedAt:string;finishedAt:string|null;status:'running'|'success'|'partial'|'failed'|'skipped';count:number};
type Props={published:number;excluded:number;review:number;activeSources:number;totalSources:number;ai:boolean;busy:boolean;lastCollection:LastCollection|null;onOpen:(status:'excluded'|'review')=>void;onOpenSources:()=>void;onAction:(action:string)=>Promise<void>};

const statusLabel={running:'진행 중',success:'성공',partial:'일부 실패',failed:'실패',skipped:'건너뜀'} as const;
function formatRunTime(value:string){
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'시각 확인 필요':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
}

export default function AdminCommandRail({published,excluded,review,activeSources,totalSources,ai,busy,lastCollection,onOpen,onOpenSources,onAction}:Props){
  return <aside className="admin-command-rail" aria-label="관리자 도구"><div className="admin-mode-label"><span/> ADMIN MODE</div><h2>CONTROL ROOM</h2>
    <nav className="admin-queue-nav"><button className="active" type="button"><CircleCheck size={16}/><span>공개 뉴스</span><strong>{published}</strong></button><button type="button" onClick={()=>onOpen('excluded')}><ShieldX size={16}/><span>관리자 제외</span><strong>{excluded}</strong></button><button type="button" onClick={()=>onOpen('review')}><FileWarning size={16}/><span>검토 필요</span><strong>{review}</strong></button></nav>
    <a className="admin-works-link" href="/admin/works">작품 관리 <small>WORKS ARCHIVE</small></a><button type="button" className="admin-source-settings-button" onClick={onOpenSources}><Settings2 size={16}/><span>뉴스 소스 설정<small>활성 {activeSources} / {totalSources}</small></span><strong>{activeSources}</strong></button>
    <div className="admin-collection-actions"><button disabled={busy||activeSources===0} onClick={()=>onAction('collect')}><RefreshCw size={15}/>{busy?'소스 확인 중…':activeSources?`${activeSources}개 소스에서 기사 수집`:'활성 소스 없음'}</button><button className="secondary" disabled={busy} onClick={()=>onAction('retry-ai')}><RotateCcw size={15}/>AI 실패 재처리</button></div>
    <div className="admin-last-collection"><small>마지막 수집</small>{lastCollection?<><strong>{formatRunTime(lastCollection.finishedAt??lastCollection.startedAt)}</strong><span>{lastCollection.trigger==='scheduled'?'자동 수집':'수동 수집'} · {statusLabel[lastCollection.status]}{lastCollection.status==='success'||lastCollection.status==='partial'?` · 신규 ${lastCollection.count}건`:''}</span></>:<span>실행 기록이 없습니다.</span>}</div>
    <p>한국어 자동 요약 <strong>{ai?'연결됨':'연결 대기'}</strong></p>{!ai&&<small>OpenAI API 키가 없으면 새 기사는 검토 필요 상태로 보관됩니다.</small>}
    <form action="/api/admin/logout" method="post"><button type="submit" className="admin-logout-button">로그아웃</button></form>
  </aside>;
}
