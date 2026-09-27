import {Header} from '@/app/newsroom';
import WorksArchive from '@/components/works/works-archive';
import {getWorksArchive} from '@/lib/works/service';
import {Archive} from 'lucide-react';
import PageViewTracker from '@/components/analytics/page-view-tracker';
import ScrollToTop from '@/components/navigation/scroll-to-top';
import {loadSiteCopy} from '@/lib/site-copy-repository';

export const dynamic='force-dynamic';
export default async function WorksPage(){
  const [{sections,featured},copy]=await Promise.all([getWorksArchive(),loadSiteCopy()]);
  const total=Object.values(sections).reduce((count,items)=>count+items.length,0);
  return <><PageViewTracker route="works"/><Header archive="works"/><main className="shell works-shell"><section className="works-intro"><div><div className="eyebrow"><span className="yellow-line"/> {copy.worksHeroEyebrow}</div><h1>{copy.worksHeroTitle}<br/><span>{copy.worksHeroHighlight}</span></h1><p>{copy.worksHeroDescription}</p></div><span className="works-sigil">STAR WARS<br/>WORKS</span></section><div className="archive-bar works-summary"><div><Archive size={20}/><strong>작품 아카이브</strong><span className="edition">WORKS ARCHIVE</span></div><span className="archive-count">{total}개 작품 · 상태별 아카이브</span></div><WorksArchive sections={sections} featured={featured}/><p className="works-attribution">This product uses the <a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB API</a> but is not endorsed or certified by TMDB.</p><div className="end-mark works-footer"><span/>MAY THE FORCE BE WITH YOU<span/></div></main><ScrollToTop/></>;
}
