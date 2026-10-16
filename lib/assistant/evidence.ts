import type {Article} from '../news';
import type {Story} from '../news/stories';
import type {ArchiveSnapshot} from '../news/archive-snapshot';
import {displayArticleTitle} from '../news/presentation';
import {sourceIdForArticleSource} from '../collection/source-settings';
import {scoreArticle} from './retrieval';
import {compareText,EVIDENCE_POLICY,unicodeLength} from './types';

export function sourceIdentity(label:string){
  const id=sourceIdForArticleSource(label)??null;
  const sourceClass=id==='starwars'?'official':id==='swnn'?'specialist':id==='forbes'?'media_contributor':id?'media':'unclassified';
  const displayClass={official:'공식 채널',specialist:'팬·전문 매체',media_contributor:'언론·기고',media:'언론 보도',unclassified:'분류 미확인'}[sourceClass];
  return {id,label,sourceClass,displayClass,certainty:'unclear' as const};
}
export function citationUrl(raw:string){
  if(raw.length>2048||/[\u0000-\u0020\u007f]/u.test(raw))return null;
  try{const url=new URL(raw);return ['http:','https:'].includes(url.protocol)&&!url.username&&!url.password?url.href:null;}catch{return null;}
}
function evidenceArticle(article:Article,story:Story){
  const title=displayArticleTitle(article),summary=article.summary;
  return {evidenceId:article.id,articleId:article.id,storyId:story.topic,title:Array.from(title).slice(0,200).join(''),summary:Array.from(summary).slice(0,600).join(''),
    source:sourceIdentity(article.source),published:article.published,category:article.category,orderUncertain:story.orderUncertain,
    truncated:{title:unicodeLength(title)>200,summary:unicodeLength(summary)>600},url:citationUrl(article.url)};
}
export function storyEvidence(story:Story,terms:readonly string[]){
  const selected=[story.articles[0]],remaining=story.articles.slice(1);
  while(selected.length<3&&remaining.length){
    const sources=new Set(selected.map(a=>sourceIdForArticleSource(a.source)??a.source.trim().toLowerCase()));
    remaining.sort((a,b)=>Number(sources.has(sourceIdForArticleSource(a.source)??a.source.trim().toLowerCase()))-Number(sources.has(sourceIdForArticleSource(b.source)??b.source.trim().toLowerCase()))||scoreArticle(b,terms).score-scoreArticle(a,terms).score||Date.parse(a.published)-Date.parse(b.published)||compareText(a.id,b.id));
    selected.push(remaining.shift()!);
  }
  const evidence=selected.map(a=>evidenceArticle(a,story));
  return {storyId:story.topic,representative:evidence[0],sourceCount:new Set(story.articles.map(a=>sourceIdForArticleSource(a.source)??a.source.trim().toLowerCase())).size,
    evidence,omittedArticleCount:story.articles.length-evidence.length,orderUncertain:story.orderUncertain,workIds:story.workIds??[],independentVerification:false};
}
export async function fingerprintStory(story:Story,snapshot:ArchiveSnapshot){
  // ALL current public members, including omitted/source-filtered members. Full text,
  // not the truncated evidence preview; relation exclusions and provenance also matter.
  const members=[...story.articles].sort((a,b)=>compareText(a.id,b.id)).map(a=>({id:a.id,title:displayArticleTitle(a),summary:a.summary,url:a.url,source:sourceIdentity(a.source),published:a.published,category:a.category,status:a.status,topic:a.topic,
    relations:snapshot.relations.filter(r=>r.articleId===a.id).sort((a,b)=>compareText(a.workId,b.workId)).map(r=>({...r,work:snapshot.works.find(w=>w.id===r.workId)??null}))}));
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({policy:EVIDENCE_POLICY,storyId:story.topic,orderUncertain:story.orderUncertain,members})));
  return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
