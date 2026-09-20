import {cleanText,decodeEntities} from './policy';

export type Candidate={url:string;title:string;description:string;published:string;image:string};
export type SourceAdapter={name:string;url:string;endpoint:string;trusted:boolean;hosts:readonly string[];kind:'rss'|'starwars-index'|'news-sitemap'};

export const sourceAdapters:readonly SourceAdapter[]=[
  {name:'StarWars.com',url:'https://www.starwars.com/news',endpoint:'https://www.starwars.com/news',trusted:true,hosts:['starwars.com'],kind:'starwars-index'},
  {name:'Star Wars News Net',url:'https://www.starwarsnewsnet.com',endpoint:'https://www.starwarsnewsnet.com/feed',trusted:true,hosts:['starwarsnewsnet.com'],kind:'rss'},
  {name:'Collider',url:'https://collider.com/tag/star-wars/',endpoint:'https://collider.com/feed/category/tag/star-wars/',trusted:false,hosts:['collider.com'],kind:'rss'},
  {name:'The Hollywood Reporter',url:'https://www.hollywoodreporter.com/t/star-wars/',endpoint:'https://www.hollywoodreporter.com/t/star-wars/feed/',trusted:false,hosts:['hollywoodreporter.com'],kind:'rss'},
  {name:'Deadline',url:'https://deadline.com/tag/star-wars/',endpoint:'https://deadline.com/tag/star-wars/feed/',trusted:false,hosts:['deadline.com'],kind:'rss'},
  {name:'Variety',url:'https://variety.com/t/star-wars/',endpoint:'https://variety.com/t/star-wars/feed/',trusted:false,hosts:['variety.com'],kind:'rss'},
  {name:'Forbes',url:'https://www.forbes.com/search/?q=star%20wars',endpoint:'https://www.forbes.com/news_sitemap.xml',trusted:false,hosts:['forbes.com'],kind:'news-sitemap'},
];

function rawTag(source:string,name:string){return source.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]??'';}
function tag(source:string,name:string){return cleanText(rawTag(source,name));}
function attr(element:string,name:string){return decodeEntities(element.match(new RegExp(`\\b${name}=["']([^"']+)`,'i'))?.[1]??'');}
function bounded(value:string,max:number){return value.slice(0,max).trim();}

function rssImage(item:string){
  const media=item.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*>/i)?.[0]??'';
  return attr(media,'url');
}

export function parseRssOrAtom(xml:string):Candidate[]{
  const blocks=[...xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(match=>match[2]);
  return blocks.map(item=>{
    const linkElement=item.match(/<link\b[^>]*>/i)?.[0]??'';
    const url=tag(item,'link')||attr(linkElement,'href')||tag(item,'guid');
    return {
      url,
      title:bounded(tag(item,'title'),500),
      description:bounded(tag(item,'description')||tag(item,'content:encoded')||tag(item,'summary')||tag(item,'content'),5_000),
      published:tag(item,'pubDate')||tag(item,'dc:date')||tag(item,'published')||tag(item,'updated'),
      image:rssImage(item),
    };
  });
}

export function parseStarWarsIndex(html:string):Candidate[]{
  const seen=new Set<string>();
  const candidates:Candidate[]=[];
  for(const match of html.matchAll(/href=["'](?:https?:\/\/(?:www\.)?starwars\.com)?(\/news\/[a-z0-9][^"'#?]*)/gi)){
    const path=match[1].replace(/\/+$/,'');
    if(seen.has(path)||/\/(?:category|tag)\//.test(path))continue;
    seen.add(path);
    candidates.push({url:`https://www.starwars.com${path}`,title:'',description:'',published:'',image:''});
    if(candidates.length>=60)break;
  }
  return candidates;
}

export function parseNewsSitemap(xml:string):Candidate[]{
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map(match=>({
    url:tag(match[1],'loc'),
    title:bounded(tag(match[1],'news:title'),500),
    description:'',
    published:tag(match[1],'news:publication_date')||tag(match[1],'lastmod'),
    image:tag(match[1],'image:loc'),
  }));
}

export function discoverCandidates(adapter:SourceAdapter,body:string){
  if(adapter.kind==='starwars-index')return parseStarWarsIndex(body);
  if(adapter.kind==='news-sitemap')return parseNewsSitemap(body);
  return parseRssOrAtom(body);
}

function metaContent(html:string,key:string){
  for(const match of html.matchAll(/<meta\b[^>]*>/gi)){
    const element=match[0];
    const name=attr(element,'property')||attr(element,'name')||attr(element,'itemprop');
    if(name.toLowerCase()===key.toLowerCase())return attr(element,'content');
  }
  return '';
}

export function enrichFromHtml(candidate:Candidate,html:string):Candidate{
  const jsonDate=html.match(/["']datePublished["']\s*:\s*["']([^"']+)/i)?.[1]??'';
  return {
    ...candidate,
    title:candidate.title||bounded(cleanText(metaContent(html,'og:title')),500),
    description:candidate.description||bounded(cleanText(metaContent(html,'og:description')||metaContent(html,'description')),5_000),
    published:candidate.published||metaContent(html,'article:published_time')||jsonDate,
    image:candidate.image||metaContent(html,'og:image'),
  };
}
