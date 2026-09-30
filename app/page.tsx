import Newsroom from './newsroom';
import { loadArchive } from '@/lib/news/archive';
import PageViewTracker from '@/components/analytics/page-view-tracker';
import {loadSiteCopy} from '@/lib/site-copy-repository';
import PublicGeometry from '@/components/background/public-geometry';
export const dynamic='force-dynamic';
export default async function Home() {
  const [archive,copy]=await Promise.all([loadArchive(),loadSiteCopy()]);
  return <PublicGeometry variant="news"><PageViewTracker route="news"/><Newsroom {...archive} copy={copy}/></PublicGeometry>;
}
