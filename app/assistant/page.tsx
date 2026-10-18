import type {Metadata} from 'next';
import {Header} from '@/app/newsroom';
import PublicFooter from '@/components/navigation/public-footer';
import ScrollToTop from '@/components/navigation/scroll-to-top';
import AssistantWorkspace from '@/components/assistant/assistant-workspace';
import {assistantRetrievalConfig} from '@/lib/assistant/config';
import {loadSiteCopy} from '@/lib/site-copy-repository';
import {loadArchive} from '@/lib/news/archive';
import {storyCategories} from '@/lib/news/explorer';
import styles from './page.module.css';
/* eslint-disable @next/next/no-html-link-for-pages -- Sites/Vinext public navigation uses normal anchors. */

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'AI 도우미 | HOLOCRON',description:'선택한 HOLOCRON 아카이브 소식으로 답과 영상 구성 가이드를 만듭니다.'};

export default async function AssistantPage(){
  // The route renders no interactive workspace and performs no archive read while disabled.
  const enabled=assistantRetrievalConfig().enabled;
  const [copy,archive]=await Promise.all([loadSiteCopy(),enabled?loadArchive():Promise.resolve(null)]);
  return <><Header/><main className="shell" id="main">
    {enabled&&archive?<AssistantWorkspace workOptions={archive.workOptions.map(({id,title})=>({id,title}))} categories={storyCategories(archive.stories)} sources={archive.sources.map(({id,name})=>({id,name}))}/>
      :<section className={styles.disabled} aria-labelledby="assistant-disabled-title"><p className="eyebrow">HOLOCRON / AI ASSISTANT</p><h1 id="assistant-disabled-title">AI 도우미</h1><p><strong>COMING SOON</strong></p><p>AI 도우미는 준비 중입니다. 뉴스와 작품 아카이브는 계속 이용하실 수 있습니다.</p><a href="/">뉴스 아카이브로 돌아가기</a></section>}
  </main><ScrollToTop/><PublicFooter tagline={copy.siteFooterTagline} legal={copy.siteFooterLegal}/></>;
}
