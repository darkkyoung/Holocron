import Newsroom from './newsroom';
import { loadArchive } from '@/lib/news/archive';
export const dynamic='force-dynamic';
export default async function Home() {
  return <Newsroom {...await loadArchive()} />;
}
