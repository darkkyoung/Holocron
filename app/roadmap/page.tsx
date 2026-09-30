import type {Metadata} from 'next';
import {Header} from '@/app/newsroom';
import PublicFooter from '@/components/navigation/public-footer';
import Roadmap from '@/components/roadmap/roadmap';
import ScrollToTop from '@/components/navigation/scroll-to-top';
import {loadSiteCopy} from '@/lib/site-copy-repository';
import {loadRoadmapCopy} from '@/lib/roadmap-copy-repository';

export const dynamic='force-dynamic';

export const metadata:Metadata={
  title:'HOLOCRON ROADMAP | 앞으로의 탐색',
  description:'현재 이용할 수 있는 HOLOCRON 기능과 다음 탐색 방향을 항성 지도처럼 살펴보세요.',
};

export default async function RoadmapPage(){
  const [siteCopy,roadmapCopy]=await Promise.all([loadSiteCopy(),loadRoadmapCopy()]);
  return <><Header archive="roadmap"/><Roadmap content={roadmapCopy}/><ScrollToTop/><PublicFooter tagline={siteCopy.siteFooterTagline} legal={siteCopy.siteFooterLegal}/></>;
}
