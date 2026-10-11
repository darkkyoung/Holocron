import {cleanText,decodeEntities,publicationDate} from '../policy';
import type {Candidate} from './types';

export function rawTag(source:string,name:string){return source.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'))?.[1]??'';}
export function tag(source:string,name:string){return cleanText(rawTag(source,name));}
export function attr(element:string,name:string){return decodeEntities(element.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*["']([^"']+)`,'i'))?.[1]??'');}
export function bounded(value:string,max:number){return value.slice(0,max).trim();}

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

export function parseNewsSitemap(xml:string):Candidate[]{
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map(match=>({
    url:tag(match[1],'loc'),
    title:bounded(tag(match[1],'news:title'),500),
    description:'',
    published:tag(match[1],'news:publication_date')||tag(match[1],'lastmod'),
    image:tag(match[1],'image:loc'),
  }));
}

/** Parses first-party monthly article sitemaps. Article HTML supplies the headline and description. */
export function parseArticleSitemap(xml:string):Candidate[]{
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)].map(match=>({
    url:tag(match[1],'loc'),title:'',description:'',published:'',image:tag(match[1],'image:loc'),discoveryDate:tag(match[1],'lastmod'),
  }));
}

export function mergeCandidateMetadata(existing:Candidate,candidate:Candidate,url=candidate.url):Candidate{
  const merged:Candidate={
    url,
    title:existing.title||candidate.title,
    description:existing.description||candidate.description,
    published:existing.published||candidate.published,
    image:validImageUrl(existing.image)||validImageUrl(candidate.image),
  };
  const discoveryDate=existing.discoveryDate||candidate.discoveryDate;
  if(discoveryDate)merged.discoveryDate=discoveryDate;
  if(existing.headlineOnly||candidate.headlineOnly)merged.headlineOnly=true;
  return merged;
}

function metaContent(html:string,key:string){
  for(const match of html.matchAll(/<meta\b[^>]*>/gi)){
    const element=match[0];
    const name=attr(element,'property')||attr(element,'name')||attr(element,'itemprop');
    if(name.toLowerCase()===key.toLowerCase())return attr(element,'content');
  }
  return '';
}

export function firstElement(html:string,pattern:RegExp){return cleanText(html.match(pattern)?.[1]??'');}

export function enrichGenericFromHtml(candidate:Candidate,html:string):Candidate{
  const jsonDate=html.match(/["']datePublished["']\s*:\s*["']([^"']+)/i)?.[1]??'';
  return {
    ...candidate,
    title:candidate.title||bounded(cleanText(metaContent(html,'og:title')),500),
    description:candidate.description||bounded(cleanText(metaContent(html,'og:description')||metaContent(html,'description')),5_000),
    published:publicationDate(candidate.published).kind!=='review'?candidate.published:metaContent(html,'article:published_time')||jsonDate||candidate.published,
    image:candidate.image||validImageUrl(metaContent(html,'og:image')),
  };
}
