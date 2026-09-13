import Newsroom from './newsroom';
import { list } from '@/lib/news';
import seed from '@/lib/seed.json';
import type {Article} from '@/lib/news';
export const dynamic='force-dynamic';
export default async function Home(){let articles:Article[]=seed as Article[];let initial=true;try{const stored=await list();if(stored.length){articles=stored.filter(a=>a.status==='published');initial=false;}}catch{}return <Newsroom articles={articles} initial={initial}/>;}
