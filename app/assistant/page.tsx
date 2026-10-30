import type {Metadata} from 'next';
import {env} from 'cloudflare:workers';
import {Header} from '@/app/newsroom';
import PublicFooter from '@/components/navigation/public-footer';
import ScrollToTop from '@/components/navigation/scroll-to-top';
import FreeAssistantWorkspace from '@/components/assistant/free-workspace';
import {assistantRetrievalConfig} from '@/lib/assistant/config';
import {loadSiteCopy} from '@/lib/site-copy-repository';
import styles from './page.module.css';
/* eslint-disable @next/next/no-html-link-for-pages -- Sites/Vinext public navigation uses normal anchors. */

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'AI 도우미 | HOLOCRON',description:'무료 한국어 스타워즈 채팅과 최신 아카이브 뉴스 Q&A를 제공합니다.'};

export default async function AssistantPage(){
  const flag=(env as unknown as Record<string,string|undefined>).HOLOCRON_ASSISTANT_FREE_MVP_ENABLED==='true';
  const enabled=flag&&assistantRetrievalConfig().enabled;
  const copy=await loadSiteCopy();
  return <><Header/><main className="shell" id="main">
    {enabled?<FreeAssistantWorkspace/>:
      <section className={styles.disabled} aria-labelledby="assistant-disabled-title"><p className="eyebrow">HOLOCRON / AI ASSISTANT</p><h1 id="assistant-disabled-title">AI 도우미</h1><p><strong>COMING SOON</strong></p><p>AI 도우미는 준비 중입니다. 뉴스와 작품 아카이브는 계속 이용하실 수 있습니다.</p><a href="/">뉴스 아카이브로 돌아가기</a></section>}
  </main><ScrollToTop/><PublicFooter tagline={copy.siteFooterTagline} legal={copy.siteFooterLegal}/></>;
}
