import {unstable_cache} from 'next/cache';
import {listPublicArticlesSince,type Article} from '../news';
import seed from '../seed.json';
import { buildStories } from './stories';
import {defaultSourceEnabledState,filterArticlesByEnabledSources,sourceSettingItems} from '../collection/source-settings';
import {loadSourceEnabledState} from '../collection/source-settings-repository';
import {PUBLIC_NEWS_CACHE_SECONDS,PUBLIC_NEWS_CACHE_TAG} from '../public-cache';

const WINDOW_MS=90*24*60*60*1000;
const loadPublicSnapshot=unstable_cache(async()=>{
  const now=Date.now();
  const [articles,sourceState]=await Promise.all([listPublicArticlesSince(new Date(now-WINDOW_MS).toISOString()),loadSourceEnabledState()]);
  return {articles,sourceState,now};
},['public-news-snapshot-v1'],{revalidate:PUBLIC_NEWS_CACHE_SECONDS,tags:[PUBLIC_NEWS_CACHE_TAG]});

/** Request-time data preparation, kept outside React rendering and client bundles. */
export async function loadArchive() {
  let articles: Article[] = seed as Article[];
  let initial = true;
  let sourceState=defaultSourceEnabledState();
  let now=Date.now();
  try {
    const snapshot=await loadPublicSnapshot();
    sourceState=snapshot.sourceState;
    now=snapshot.now;
    if(snapshot.articles.length){
      articles=snapshot.articles;
      initial = false;
    }
  } catch {
    // Keep the initial archive usable before database initialization.
  }
  return {
    stories:buildStories(filterArticlesByEnabledSources(articles,sourceState),now),
    sources:sourceSettingItems(sourceState).filter(source=>source.enabled),
    initial,
  };
}
