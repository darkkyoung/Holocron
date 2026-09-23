'use client';

import {CircleCheck,FileWarning,RefreshCw,RotateCcw,Settings2,ShieldX} from 'lucide-react';

type Props={published:number;excluded:number;review:number;activeSources:number;totalSources:number;ai:boolean;busy:boolean;onOpen:(status:'excluded'|'review')=>void;onOpenSources:()=>void;onAction:(action:string)=>Promise<void>};

export default function AdminCommandRail({published,excluded,review,activeSources,totalSources,ai,busy,onOpen,onOpenSources,onAction}:Props){
  return <aside className="admin-command-rail" aria-label="관리자 도구"><div className="admin-mode-label"><span/> ADMIN MODE</div><h2>CONTROL ROOM</h2>
    <nav className="admin-queue-nav"><button className="active" type="button"><CircleCheck size={16}/><span>공개 뉴스</span><strong>{published}</strong></button><button type="button" onClick={()=>onOpen('excluded')}><ShieldX size={16}/><span>관리자 제외</span><strong>{excluded}</strong></button><button type="button" onClick={()=>onOpen('review')}><FileWarning size={16}/><span>검토 필요</span><strong>{review}</strong></button></nav>
    <button type="button" className="admin-source-settings-button" onClick={onOpenSources}><Settings2 size={16}/><span>뉴스 소스 설정<small>활성 {activeSources} / {totalSources}</small></span><strong>{activeSources}</strong></button>
    <div className="admin-collection-actions"><button disabled={busy||activeSources===0} onClick={()=>onAction('collect')}><RefreshCw size={15}/>{busy?'소스 확인 중…':activeSources?`${activeSources}개 소스에서 기사 수집`:'활성 소스 없음'}</button><button className="secondary" disabled={busy} onClick={()=>onAction('retry-ai')}><RotateCcw size={15}/>AI 실패 재처리</button></div>
    <p>한국어 자동 요약 <strong>{ai?'연결됨':'연결 대기'}</strong></p>{!ai&&<small>OpenAI API 키가 없으면 새 기사는 검토 필요 상태로 보관됩니다.</small>}
    <form action="/api/admin/logout" method="post"><button type="submit" className="admin-logout-button">로그아웃</button></form>
  </aside>;
}
