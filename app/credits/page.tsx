/* eslint-disable @next/next/no-img-element */
import {Header} from '@/app/newsroom';
import {loadSiteCopy} from '@/lib/site-copy-repository';

export const dynamic='force-dynamic';

export default async function CreditsPage(){
  const copy=await loadSiteCopy();
  return <><Header archive="works" feedbackCopy={copy}/><main className="shell credits-shell">
    <section className="credits-heading"><div className="eyebrow"><span className="yellow-line"/> HOLOCRON / CREDITS</div><h1>데이터 <span>출처</span></h1><p>HOLOCRON에서 사용하는 외부 데이터와 이미지 출처를 안내합니다.</p></section>
    <section className="credits-card" aria-labelledby="tmdb-credit"><a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer"><img src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_long_2-9665a76b1ae401a510ec1e0ca40ddcb3b0cfe45f1d51b77a308fea0845885648.svg" alt="The Movie Database (TMDB)"/></a><h2 id="tmdb-credit">The Movie Database (TMDB)</h2><p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p><p>작품 아카이브의 일부 작품 정보와 포스터 선택 도구에서 TMDB API와 이미지 데이터를 사용합니다.</p><a href="https://www.themoviedb.org/" target="_blank" rel="noreferrer">TMDB 방문 ↗</a></section>
  </main></>;
}
