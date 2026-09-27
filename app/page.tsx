import Newsroom from './newsroom';
import { loadArchive } from '@/lib/news/archive';
import PageViewTracker from '@/components/analytics/page-view-tracker';
export const dynamic='force-dynamic';
export default async function Home() {
  return <><PageViewTracker route="news"/><Newsroom {...await loadArchive()} /></>;
}
