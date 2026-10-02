import {cleanText,decodeEntities,publicationDate} from './policy';

export type Candidate={url:string;title:string;description:string;published:string;image:string;headlineOnly?:boolean};
export type SourceId='starwars'|'swnn'|'collider'|'thr'|'deadline'|'variety'|'forbes';
export type SourceAdapter={id:SourceId;name:string;description:string;category:string;url:string;endpoint:string;trusted:boolean;hosts:readonly string[];kind:'rss'|'starwars-index'|'news-sitemap'};

export const sourceAdapters:readonly SourceAdapter[]=[
  {id:'starwars',name:'StarWars.com',description:'루카스필름 공식 소식',category:'OFFICIAL',url:'https://www.starwars.com/news',endpoint:'https://www.starwars.com/news',trusted:true,hosts:['starwars.com'],kind:'starwars-index'},
  {id:'swnn',name:'Star Wars News Net',description:'팬의 시선으로 보는 은하계',category:'FAN MEDIA',url:'https://www.starwarsnewsnet.com',endpoint:'https://www.starwarsnewsnet.com/feed',trusted:true,hosts:['starwarsnewsnet.com'],kind:'rss'},
  {id:'collider',name:'Collider',description:'영화와 시리즈 엔터테인먼트',category:'ENTERTAINMENT',url:'https://collider.com/tag/star-wars/',endpoint:'https://collider.com/feed/category/tag/star-wars/',trusted:false,hosts:['collider.com'],kind:'rss'},
  {id:'thr',name:'The Hollywood Reporter',description:'할리우드 산업 뉴스',category:'INDUSTRY',url:'https://www.hollywoodreporter.com/t/star-wars/',endpoint:'https://www.hollywoodreporter.com/t/star-wars/feed/',trusted:false,hosts:['hollywoodreporter.com'],kind:'rss'},
  {id:'deadline',name:'Deadline',description:'영화·방송 속보',category:'INDUSTRY',url:'https://deadline.com/tag/star-wars/',endpoint:'https://deadline.com/tag/star-wars/feed/',trusted:false,hosts:['deadline.com'],kind:'rss'},
  {id:'variety',name:'Variety',description:'엔터테인먼트 업계 소식',category:'INDUSTRY',url:'https://variety.com/t/star-wars/',endpoint:'https://variety.com/t/star-wars/feed/',trusted:false,hosts:['variety.com'],kind:'rss'},
  {id:'forbes',name:'Forbes',description:'비즈니스와 문화 분석',category:'BUSINESS',url:'https://www.forbes.com/search/?q=star%20wars',endpoint:'https://www.forbes.com/news_sitemap.xml',trusted:false,hosts:['forbes.com'],kind:'news-sitemap'},
];

function rawTag(source:string,name:string){return source.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]??'';}
function tag(source:string,name:string){return cleanText(rawTag(source,name));}
function attr(element:string,name:string){return decodeEntities(element.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']+)`,'i'))?.[1]??'');}
function bounded(value:string,max:number){return value.slice(0,max).trim();}

export function validImageUrl(value:string){
  try{const url=new URL(value.trim());return url.protocol==='http:'||url.protocol==='https:'?url.href:'';}catch{return '';}
}

function srcsetImage(value:string){
  for(const candidate of decodeEntities(value).split(',')){
    const image=validImageUrl(candidate.trim().split(/\s+/)[0]??'');
    if(image)return image;
  }
  return '';
}

function rssImage(item:string){
  for(const tagName of ['media:content','media:thumbnail','enclosure']){
    for(const match of item.matchAll(new RegExp(`<${tagName}\\b[^>]*>`,'gi'))){
      const image=validImageUrl(attr(match[0],'url'));
      if(image)return image;
    }
  }
  for(const name of ['content:encoded','description']){
    const html=decodeEntities(rawTag(item,name));
    for(const match of html.matchAll(/<img\b[^>]*>/gi)){
      const image=validImageUrl(attr(match[0],'src'))
        ||validImageUrl(attr(match[0],'data-src'))
        ||validImageUrl(attr(match[0],'data-lazy-src'))
        ||validImageUrl(attr(match[0],'data-original'))
        ||srcsetImage(attr(match[0],'srcset'));
      if(image)return image;
    }
  }
  return '';
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
  const candidates=new Map<string,Candidate>();
  const add=(candidate:Candidate)=>{
    let url:URL;
    try{url=new URL(candidate.url,'https://www.starwars.com');}catch{return;}
    if(!/^\/news\/[a-z0-9]/i.test(url.pathname)||/\/(?:category|tag)\//i.test(url.pathname))return;
    url.protocol='https:';url.hostname='www.starwars.com';url.search='';url.hash='';url.pathname=url.pathname.replace(/\/+$/,'');
    const key=url.href;
    const normalized={...candidate,url:key};
    const existing=candidates.get(key);
    candidates.set(key,existing?{
      url:key,title:existing.title||normalized.title,description:existing.description||normalized.description,
      published:existing.published||normalized.published,image:existing.image||normalized.image,
    }:normalized);
  };

  const marker='this.Grill?Grill.burger=';
  const jsonStart=html.indexOf(marker);
  if(jsonStart>=0){
    const valueStart=jsonStart+marker.length;
    const valueEnd=html.indexOf(':(function(){',valueStart);
    if(valueEnd>valueStart){
      try{
        const walk=(value:unknown)=>{
          if(!value||typeof value!=='object')return;
          const record=value as Record<string,unknown>;
          if(record.entity_type==='articlepage'&&typeof record.href==='string'){
            const assets=record.image_assets as {featured_image?:{src?:unknown};featured_image_16x9?:{src?:unknown}}|undefined;
            const featured=record.featured_image as {src?:unknown}|undefined;
            add({
              url:record.href,
              title:bounded(cleanText(typeof record.title==='string'?record.title:''),500),
              description:bounded(cleanText(typeof record.description==='string'?record.description:''),5_000),
              published:typeof record.content_date==='string'?record.content_date:starWarsDate(typeof record.publish_date==='string'?record.publish_date:''),
              image:validImageUrl(typeof assets?.featured_image?.src==='string'?assets.featured_image.src:'')
                ||validImageUrl(typeof assets?.featured_image_16x9?.src==='string'?assets.featured_image_16x9.src:'')
                ||validImageUrl(typeof featured?.src==='string'?featured.src:''),
            });
          }
          for(const child of Object.values(record))walk(child);
        };
        walk(JSON.parse(html.slice(valueStart,valueEnd)));
      }catch{/* Keep the semantic-card fallback when embedded data changes shape. */}
    }
  }
  const cardPatterns=[
    /<li\b[^>]*class=["'][^"']*\bcol\b[^"']*\bitem\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi,
    /<li\b[^>]*class=["'][^"']*\bbuilding-block-config\b[^"']*\barticlepage-content\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi,
    /<li\b[^>]*class=["'][^"']*\barticle\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi,
  ];
  for(const pattern of cardPatterns){
    for(const match of html.matchAll(pattern)){
      const card=match[1];
      const links=[...card.matchAll(/<a\b[^>]*>/gi)].map(value=>value[0]);
      const link=links.find(value=>/\/news\/[a-z0-9]/i.test(attr(value,'href')));
      if(!link)continue;
      const rawUrl=attr(link,'href').trim();
      const titleElement=card.match(/<h3\b[^>]*class=["'][^"']*(?:\barticle-title\b|\btitle\b)[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)?.[1]??'';
      const descriptionElement=card.match(/<p\b[^>]*class=["'][^"']*\bdesc\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]??'';
      const dateElement=card.match(/<p\b[^>]*class=["'][^"']*\bpublish-date\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]??'';
      const imageElement=card.match(/<img\b[^>]*>/i)?.[0]??'';
      const candidate:Candidate={
        url:rawUrl,
        title:bounded(cleanText(attr(link,'data-title')||titleElement),500),
        description:bounded(cleanText(descriptionElement),5_000),
        published:starWarsDate(cleanText(dateElement)),
        image:validImageUrl(attr(imageElement,'src'))||validImageUrl(attr(imageElement,'data-src'))||srcsetImage(attr(imageElement,'srcset')),
      };
      add(candidate);
      if(candidates.size>=60)return [...candidates.values()];
    }
  }
  return [...candidates.values()];
}

function starWarsDate(value:string){
  const match=value.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$/i);
  if(!match)return value;
  const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
  return `${match[3]}-${String(months.indexOf(match[1].toLowerCase())+1).padStart(2,'0')}-${match[2].padStart(2,'0')}`;
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
    published:publicationDate(candidate.published).kind!=='review'?candidate.published:metaContent(html,'article:published_time')||jsonDate||candidate.published,
    image:candidate.image||validImageUrl(metaContent(html,'og:image')),
  };
}
