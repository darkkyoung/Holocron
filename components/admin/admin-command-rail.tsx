'use client';

import {CircleCheck,FileWarning,Map,MessageSquareWarning,Settings2,ShieldX,Type} from 'lucide-react';

type Props={published:number;excluded:number;review:number;view:'news'|'operations';onNavigate:(view:'news'|'operations')=>void;onOpen:(status:'excluded'|'review')=>void};

export default function AdminCommandRail({published,excluded,review,view,onNavigate,onOpen}:Props){
  return <aside className="admin-command-rail" aria-label="Control Room 탐색">
    <div className="admin-mode-label"><span/> ADMIN MODE</div><h2>CONTROL ROOM</h2>
    <nav className="admin-queue-nav" aria-label="뉴스 관리">
      <button className={view==='news'?'active':''} type="button" aria-pressed={view==='news'} aria-controls="admin-news-area" onClick={()=>onNavigate('news')}><CircleCheck size={16}/><span>공개 뉴스</span><strong>{published}</strong></button>
      <button type="button" onClick={()=>onOpen('excluded')}><ShieldX size={16}/><span>관리자 제외</span><strong>{excluded}</strong></button>
      <button type="button" onClick={()=>onOpen('review')}><FileWarning size={16}/><span>검토 필요</span><strong>{review}</strong></button>
      <button className={view==='operations'?'active':''} type="button" aria-pressed={view==='operations'} aria-controls="admin-operations-area" onClick={()=>onNavigate('operations')}><Settings2 size={16}/><span>수집 및 운영</span></button>
    </nav>
    <nav className="admin-destination-nav" aria-label="사이트 관리">
    <a className="admin-works-link" href="/admin/site-visibility">사이트 공개 설정</a><a className="admin-works-link" href="/admin/announcement">공지 팝업 관리</a><a className="admin-works-link" href="/admin/credit-policy">Credit 정책 / AI 예산</a><a className="admin-works-link" href="/admin/works">작품 관리 </a><a className="admin-works-link admin-analytics-link" href="/admin/quiz">퀴즈 관리 </a><a className="admin-works-link admin-analytics-link" href="/admin/analytics">Beta Analytics </a><a className="admin-works-link admin-copy-link" href="/admin/site-copy"><span><Type size={14}/> 사이트 문구 관리</span></a><a className="admin-works-link admin-copy-link" href="/admin/roadmap"><span><Map size={14}/> 로드맵 관리</span></a><a className="admin-works-link admin-copy-link" href="/admin/feedback"><span><MessageSquareWarning size={14}/> 피드백 사용자</span></a>
    </nav>
    <form action="/api/admin/logout" method="post"><button type="submit" className="admin-logout-button">로그아웃</button></form>
  </aside>;
}
