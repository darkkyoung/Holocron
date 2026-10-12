import type {Story} from '../news/stories';
import {displayArticleTitle} from '../news/presentation';
import type {WorkChoice,WorkNews,WorkNewsOption} from './types';

export function projectNewsWorks(stories:readonly Story[],relations:readonly {articleId:string;workId:string}[],works:readonly Pick<WorkChoice,'id'|'title'>[]){
  const titles=new Map(works.map(work=>[work.id,work.title])),byArticle=new Map<string,Set<string>>();
  for(const relation of relations){if(!titles.has(relation.workId))continue;const ids=byArticle.get(relation.articleId)??new Set<string>();ids.add(relation.workId);byArticle.set(relation.articleId,ids);}
  const related:Record<string,WorkNews>={};
  const projected=stories.map(story=>{
    const workIds=[...new Set(story.articles.filter(article=>article.status==='published').flatMap(article=>[...byArticle.get(article.id)??[]]))].sort();
    for(const id of workIds){
      const news=related[id]??{count:0,stories:[]};news.count++;
      if(news.stories.length<8){const first=story.articles[0];news.stories.push({topic:story.topic,title:displayArticleTitle(first),published:first.published,source:first.source,sourceCount:new Set(story.articles.map(article=>article.source)).size,url:first.url});}
      related[id]=news;
    }
    return {...story,workIds};
  });
  const workOptions:WorkNewsOption[]=Object.entries(related).map(([id,news])=>({id,title:titles.get(id)!,count:news.count})).sort((a,b)=>a.title.localeCompare(b.title,'ko'));
  return {stories:projected,workOptions,related};
}
export function workNewsUrl(id:string){return `/?work=${encodeURIComponent(id)}`;}
