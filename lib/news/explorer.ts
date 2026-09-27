import type {Story} from './stories';
import {displayArticleTitle} from './presentation';

export const NEWS_ROWS_PER_PAGE=5;

const NEWS_CATEGORY_ORDER=['영화','시리즈','애니메이션','게임','컬처'] as const;

export function storyCategories(stories:readonly Story[]){
  const categories=[...new Set(stories.map(story=>story.articles[0]?.category).filter((value):value is string=>Boolean(value)))];
  const rank=new Map<string,number>(NEWS_CATEGORY_ORDER.map((value,index)=>[value,index]));
  return categories.sort((a,b)=>(rank.get(a)??NEWS_CATEGORY_ORDER.length)-(rank.get(b)??NEWS_CATEGORY_ORDER.length)||a.localeCompare(b,'ko'));
}

export function filterStories(stories:readonly Story[],query:string,category:string){
  const normalized=query.trim().toLocaleLowerCase('ko');
  return stories.filter(story=>{
    const representative=story.articles[0];
    if(category&&representative?.category!==category)return false;
    if(!normalized)return true;
    return story.articles.some(article=>[displayArticleTitle(article),article.title,article.summary]
      .some(value=>value.toLocaleLowerCase('ko').includes(normalized)));
  });
}

export function newsPageSize(columns:number){return Math.max(1,Math.floor(columns))*NEWS_ROWS_PER_PAGE;}
export function newsPageCount(total:number,columns:number){return Math.max(1,Math.ceil(total/newsPageSize(columns)));}
export function paginateStories<T>(stories:readonly T[],page:number,columns:number){
  const size=newsPageSize(columns);
  const safePage=Math.min(Math.max(1,Math.floor(page)),Math.max(1,Math.ceil(stories.length/size)));
  return stories.slice((safePage-1)*size,safePage*size);
}
