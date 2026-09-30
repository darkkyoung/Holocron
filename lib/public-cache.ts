import {revalidateTag} from 'next/cache';

export const PUBLIC_NEWS_CACHE_TAG='public-news-v1';
export const PUBLIC_NEWS_CACHE_SECONDS=60;

/** Route-handler mutations expire the current cache entry immediately. */
export function invalidatePublicNewsCache(){
  revalidateTag(PUBLIC_NEWS_CACHE_TAG,{expire:0});
}
