import Newsroom from './newsroom';
import { loadArchive } from '@/lib/news/archive';
import PageViewTracker from '@/components/analytics/page-view-tracker';
import {loadSiteCopy} from '@/lib/site-copy-repository';
import PublicGeometry from '@/components/background/public-geometry';
import {assistantRetrievalConfig} from '@/lib/assistant/config';
export const dynamic='force-dynamic';
export default async function Home({searchParams}:{searchParams:Promise<{work?:string|string[]}>}) {
  const [archive,copy]=await Promise.all([loadArchive(),loadSiteCopy()]);
  const requested=(await searchParams).work;
  const initialWork=typeof requested==='string'&&archive.workOptions.some(work=>work.id===requested)?requested:'';
  return <PublicGeometry variant="news"><PageViewTracker route="news"/><Newsroom {...archive} initialWork={initialWork} copy={copy} assistantEnabled={assistantRetrievalConfig().enabled}/></PublicGeometry>;
}
