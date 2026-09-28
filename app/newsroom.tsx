import Link from 'next/link';
import AiAssistantPlaceholder from '@/components/news/ai-assistant-placeholder';
import NewsArchiveExplorer from '@/components/news/news-archive-explorer';
import ScrollToTop from '@/components/navigation/scroll-to-top';
import FeedbackDialog from '@/components/feedback/feedback-dialog';
import type {Story} from '@/lib/news/stories';
import type {SourceId} from '@/lib/collection/sources';
import type {SourceSettingItem} from '@/lib/collection/source-settings';
import type {SiteCopy} from '@/lib/site-copy';
import {ArrowUpRight, Layers3, ShieldCheck, Orbit, Radio} from 'lucide-react';

type FeedbackCopy=Pick<SiteCopy,'feedbackSuccessTitle'|'feedbackSuccessDescription'>;

export function Header({admin=false,archive='news',feedbackCopy}:{admin?:boolean;archive?:'news'|'works'|'quiz';feedbackCopy?:FeedbackCopy}) {
  // The brand intentionally uses a full navigation to avoid Sites/Vinext client routing issues.
  /* eslint-disable-next-line @next/next/no-html-link-for-pages */
  return <header className="masthead" data-admin={admin||undefined}><a className="brand" href="/"><span className="brand-mark">H</span><span>HOLOCRON<small>THE GALAXY, ARCHIVED.</small></span></a><nav aria-label="아카이브 탐색"><a className={archive==='news'?'active':''} href="/">뉴스 아카이브</a><a className={archive==='works'?'active':''} href="/works">작품 아카이브</a><a className={archive==='quiz'?'active':''} href="/quiz">퀴즈 <small className="nav-direction">→</small></a></nav>{!admin&&archive==='works'&&<FeedbackDialog successTitle={feedbackCopy?.feedbackSuccessTitle} successDescription={feedbackCopy?.feedbackSuccessDescription}/>} <a className="admin-link" href="/admin/login"><ShieldCheck size={16}/> 관리자 <ArrowUpRight size={14}/></a></header>;
}

export default function Newsroom({stories,initial,sources,copy}:{stories:Story[];initial:boolean;sources:SourceSettingItem[];copy:SiteCopy}) {
  const initials:Record<SourceId,string>={starwars:'SW',swnn:'NN',collider:'C',thr:'THR',deadline:'D',variety:'V',forbes:'F'};
  const sourceList=sources.map(source=>({...source,tag:source.category,text:source.description,initial:initials[source.id]}));

  return <><Header/><main className="shell">
    <section className="intro"><div><div className="eyebrow"><span className="yellow-line"/> {copy.newsHeroEyebrow}</div><h1>{copy.newsHeroTitle}<br className="mobile-break"/> <span>{copy.newsHeroHighlight}</span></h1><p>{copy.newsHeroDescription}</p></div><div className="sw-wordmark" aria-label="Star Wars">STAR<br/>WARS</div></section>
    <div className="archive-bar"><div><Orbit size={20}/><strong>스타워즈</strong><span className="edition">STAR WARS</span></div><span className="archive-count">최근 90일 · {stories.length}개의 이야기 <span>·</span> {sourceList.length}개의 소스</span></div>
    <div className="content-layout"><NewsArchiveExplorer stories={stories} initial={initial} feedbackSuccessTitle={copy.feedbackSuccessTitle} feedbackSuccessDescription={copy.feedbackSuccessDescription}/><aside className="rail"><div className="rail-title"><Radio size={16}/><h2>뉴스 소스</h2><span>{sourceList.length}</span></div><p className="rail-desc">{copy.newsSourceDescription}</p>{sourceList.map(s=><a className="source-row" key={s.name} href={s.url} target="_blank" rel="noreferrer"><span className="source-logo">{s.initial}</span><span><small>{s.tag}</small><strong>{s.name}</strong><p>{s.text}</p></span><ArrowUpRight size={15}/></a>)}<div className="archive-explainer"><Layers3 size={24}/><h3>{copy.newsExplainerTitle}</h3><p>{copy.newsExplainerBody}</p><span>{copy.newsExplainerHint}</span></div><div className="rail-foot">{copy.newsRailFooterTitle}<br/>{copy.newsRailFooterDisclaimer}</div></aside></div>
  </main><AiAssistantPlaceholder/><ScrollToTop/><footer><Link className="footer-brand" href="/">HOLOCRON</Link><span>{copy.siteFooterTagline}</span><span>{copy.siteFooterLegal}</span></footer></>;
}
