import Link from 'next/link';
import StoryCard from '@/components/news/story-card';
import type {Story} from '@/lib/news/stories';
import {ArrowUpRight, Layers3, ShieldCheck, Orbit, Radio} from 'lucide-react';

export function Header({admin=false}:{admin?:boolean}) {
  // The brand intentionally uses a full navigation to avoid Sites/Vinext client routing issues.
  /* eslint-disable-next-line @next/next/no-html-link-for-pages */
  return <header className="masthead"><a className="brand" href="/"><span className="brand-mark">H</span><span>HOLOCRON<small>THE GALAXY, ARCHIVED.</small></span></a><nav><Link className={!admin?'active':''} href="/">뉴스 아카이브</Link><span className="future">다음 은하계 <small>SOON</small></span></nav><a className="admin-link" href="/admin/login"><ShieldCheck size={16}/> 관리자 <ArrowUpRight size={14}/></a></header>;
}

export default function Newsroom({stories,initial}:{stories:Story[];initial:boolean}) {
  const sourceList=[{name:'StarWars.com',tag:'OFFICIAL',text:'루카스필름 공식 소식',url:'https://www.starwars.com/news',initial:'SW'},{name:'Star Wars News Net',tag:'FAN MEDIA',text:'팬의 시선으로 보는 은하계',url:'https://www.starwarsnewsnet.com',initial:'NN'},{name:'Collider',tag:'ENTERTAINMENT',text:'영화와 시리즈의 모든 것',url:'https://collider.com/tag/star-wars/',initial:'C'},{name:'The Hollywood Reporter',tag:'INDUSTRY',text:'할리우드 산업 뉴스',url:'https://www.hollywoodreporter.com/t/star-wars/',initial:'THR'},{name:'Deadline',tag:'INDUSTRY',text:'영화·방송 속보',url:'https://deadline.com/tag/star-wars/',initial:'D'},{name:'Variety',tag:'INDUSTRY',text:'엔터테인먼트 업계 소식',url:'https://variety.com/t/star-wars/',initial:'V'},{name:'Forbes',tag:'BUSINESS',text:'비즈니스와 문화 분석',url:'https://www.forbes.com/search/?q=star%20wars',initial:'F'}];

  return <><Header/><main className="shell">
