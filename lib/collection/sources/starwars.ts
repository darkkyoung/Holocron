import {cleanText,publicationDate} from '../policy';
import {attr,bounded,enrichGenericFromHtml,firstElement,mergeCandidateMetadata,validImageUrl} from './common';
import type {Candidate,SourceAdapter} from './types';

export type StarWarsIndexResult={candidates:Candidate[];paths:string[]};

function starWarsDate(value:string){
  const match=value.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})$/i);
  if(!match)return value;
  const months=['january','february','march','april','may','june','july','august','september','october','november','december'];
  return `${match[3]}-${String(months.indexOf(match[1].toLowerCase())+1).padStart(2,'0')}-${match[2].padStart(2,'0')}`;
}

function srcsetImage(value:string){
  for(const candidate of value.split(',')){
    const image=validImageUrl(candidate.trim().split(/\s+/)[0]??'');
    if(image)return image;
  }
  return '';
}

export function parseStarWarsIndexWithDiagnostics(html:string):StarWarsIndexResult{
  const candidates=new Map<string,Candidate>();
  const paths=new Set<string>();
  const add=(candidate:Candidate)=>{
    let url:URL;
    try{url=new URL(candidate.url,'https://www.starwars.com');}catch{return;}
    if(!/^\/news\/[a-z0-9]/i.test(url.pathname)||/\/(?:category|tag)\//i.test(url.pathname))return;
    url.protocol='https:';url.hostname='www.starwars.com';url.search='';url.hash='';url.pathname=url.pathname.replace(/\/+$/,'');
    const key=url.href,normalized={...candidate,url:key},existing=candidates.get(key);
    candidates.set(key,existing?mergeCandidateMetadata(existing,normalized,key):normalized);
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
            paths.add('embedded');
            const assets=record.image_assets as {featured_image?:{src?:unknown};featured_image_16x9?:{src?:unknown}}|undefined;
            const featured=record.featured_image as {src?:unknown}|undefined;
            add({url:record.href,title:bounded(cleanText(typeof record.title==='string'?record.title:''),500),description:bounded(cleanText(typeof record.description==='string'?record.description:''),5_000),published:typeof record.content_date==='string'?record.content_date:starWarsDate(typeof record.publish_date==='string'?record.publish_date:''),image:validImageUrl(typeof assets?.featured_image?.src==='string'?assets.featured_image.src:'')||validImageUrl(typeof assets?.featured_image_16x9?.src==='string'?assets.featured_image_16x9.src:'')||validImageUrl(typeof featured?.src==='string'?featured.src:'')});
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
      const card=match[1],links=[...card.matchAll(/<a\b[^>]*>/gi)].map(value=>value[0]);
      const link=links.find(value=>/\/news\/[a-z0-9]/i.test(attr(value,'href')));
      if(!link)continue;
      const titleElement=card.match(/<h3\b[^>]*class=["'][^"']*(?:\barticle-title\b|\btitle\b)[^"']*["'][^>]*>([\s\S]*?)<\/h3>/i)?.[1]??'';
      const descriptionElement=card.match(/<p\b[^>]*class=["'][^"']*\bdesc\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]??'';
      const dateElement=card.match(/<p\b[^>]*class=["'][^"']*\bpublish-date\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1]??'';
      const imageElement=card.match(/<img\b[^>]*>/i)?.[0]??'';
      add({url:attr(link,'href').trim(),title:bounded(cleanText(attr(link,'data-title')||titleElement),500),description:bounded(cleanText(descriptionElement),5_000),published:starWarsDate(cleanText(dateElement)),image:validImageUrl(attr(imageElement,'src'))||validImageUrl(attr(imageElement,'data-src'))||srcsetImage(attr(imageElement,'srcset'))});
      paths.add('cards');
      if(candidates.size>=60)return {candidates:[...candidates.values()],paths:[...paths]};
    }
  }
  return {candidates:[...candidates.values()],paths:[...paths]};
}

export function parseStarWarsIndex(html:string){return parseStarWarsIndexWithDiagnostics(html).candidates;}

export function enrichStarWarsFromHtml(candidate:Candidate,html:string):Candidate{
  const article=html.match(/<section\b[^>]*class=["'][^"']*\binc_rich_article\b[^"']*["'][^>]*>([\s\S]*?)<\/section>/i)?.[1]??html;
  const visibleTitle=firstElement(article,/<div\b[^>]*class=["'][^"']*\bheadline-area\b[^"']*["'][^>]*>[\s\S]*?<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const visibleDescription=firstElement(article,/<div\b[^>]*class=["'][^"']*\bcontent-area\b[^"']*["'][^>]*>[\s\S]*?<div\b[^>]*class=["'][^"']*\bsummary\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  const visibleDate=starWarsDate(firstElement(article,/<(?:div|p)\b[^>]*class=["'][^"']*\bpublish-date\b[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|p)>/i));
  const featured=article.match(/<div\b[^>]*class=["'][^"']*\bfeatured-image\b[^"']*["'][^>]*>[\s\S]*?<img\b[^>]*>/i)?.[0]??'';
  return {...candidate,title:candidate.title||bounded(visibleTitle,500),description:candidate.description||bounded(visibleDescription,5_000),published:publicationDate(candidate.published).kind!=='review'?candidate.published:visibleDate||candidate.published,image:candidate.image||validImageUrl(attr(featured,'src'))||validImageUrl(attr(featured,'data-src'))||srcsetImage(attr(featured,'srcset'))};
}

export const starWarsAdapter:SourceAdapter={
  id:'starwars',name:'StarWars.com',description:'루카스필름 공식 소식',category:'OFFICIAL',url:'https://www.starwars.com/news',endpoint:'https://www.starwars.com/news',trusted:true,hosts:['starwars.com'],
  parsePrimary:parseStarWarsIndexWithDiagnostics,
  enrichFromHtml:(candidate,html)=>enrichGenericFromHtml(enrichStarWarsFromHtml(candidate,html),html),
  coverage:()=>({coverage:'complete',coverageNote:'StarWars.com 현재 /news structured index 범위를 조회합니다.'}),
};
