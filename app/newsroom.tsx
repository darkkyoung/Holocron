import Link from 'next/link';
import AiAssistantPlaceholder from '@/components/news/ai-assistant-placeholder';
import NewsArchiveExplorer from '@/components/news/news-archive-explorer';
import ScrollToTop from '@/components/navigation/scroll-to-top';
import FeedbackDialog from '@/components/feedback/feedback-dialog';
import type {Story} from '@/lib/news/stories';
import type {SourceId} from '@/lib/collection/sources';
import type {SourceSettingItem} from '@/lib/collection/source-settings';
import {ArrowUpRight, Layers3, ShieldCheck, Orbit, Radio} from 'lucide-react';

export function Header({admin=false,archive='news'}:{admin?:boolean;archive?:'news'|'works'}) {
  // The brand intentionally uses a full navigation to avoid Sites/Vinext client routing issues.
  /* eslint-disable-next-line @next/next/no-html-link-for-pages */
  return <header className="masthead" data-admin={admin||undefined}><a className="brand" href="/"><span className="brand-mark">H</span><span>HOLOCRON<small>THE GALAXY, ARCHIVED.</small></span></a><nav aria-label="아카이브 탐색"><a className={archive==='news'?'active':''} href="/">뉴스 아카이브</a><a className={archive==='works'?'active':''} href="/works">작품 아카이브 <small className="nav-direction">→</small></a></nav>{!admin&&archive==='works'&&<FeedbackDialog/>}<a className="admin-link" href="/admin/login"><ShieldCheck size={16}/> 관리자 <ArrowUpRight size={14}/></a></header>;
}

export default function Newsroom({stories,initial,sources}:{stories:Story[];initial:boolean;sources:SourceSettingItem[]}) {
  const initials:Record<SourceId,string>={starwars:'SW',swnn:'NN',collider:'C',thr:'THR',deadline:'D',variety:'V',forbes:'F'};
  const sourceList=sources.map(source=>({...source,tag:source.category,text:source.description,initial:initials[source.id]}));

  return <><Header/><main className="shell">
    <section className="intro"><div><div className="eyebrow"><span className="yellow-line"/> A TRANSMISSION FROM A GALAXY FAR, FAR AWAY</div><h1>은하계의 소식,<br className="mobile-break"/> <span>한곳에.</span></h1><p>공식 발표부터 새로운 이야기까지. 한국어로 만나는 스타워즈.</p></div><div className="sw-wordmark" aria-label="Star Wars">STAR<br/>WARS</div></section>
    <div className="archive-bar"><div><Orbit size={20}/><strong>스타워즈</strong><span className="edition">STAR WARS</span></div><span className="archive-count">최근 90일 · {stories.length}개의 이야기 <span>·</span> {sourceList.length}개의 소스</span></div>
    <div className="content-layout"><NewsArchiveExplorer stories={stories} initial={initial}/><aside className="rail"><div className="rail-title"><Radio size={16}/><h2>뉴스 소스</h2><span>{sourceList.length}</span></div><p className="rail-desc">서로 다른 시선, 하나의 이야기.</p>{sourceList.map(s=><a className="source-row" key={s.name} href={s.url} target="_blank" rel="noreferrer"><span className="source-logo">{s.initial}</span><span><small>{s.tag}</small><strong>{s.name}</strong><p>{s.text}</p></span><ArrowUpRight size={15}/></a>)}<div className="archive-explainer"><Layers3 size={24}/><h3>같은 소식은 하나로.</h3><p>중복된 보도를 한데 모았습니다. 확인된 게시 시각이 가장 이른 기사를 대표로, 다른 출처도 함께 읽어보세요.</p><span>카드 옆 출처를 선택하면 관련 보도를 펼칠 수 있습니다.</span></div><div className="rail-foot">독립적인 팬 뉴스 아카이브<br/>Lucasfilm 및 Disney와 제휴하지 않습니다.</div></aside></div>
  </main><AiAssistantPlaceholder/><ScrollToTop/><footer><Link className="footer-brand" href="/">HOLOCRON</Link><span>멀리, 저 멀리 은하계에서 온 이야기.</span><span>비공식 팬 프로젝트 · 기사와 이미지의 권리는 원저작자에게 있습니다.</span></footer></>;
}
