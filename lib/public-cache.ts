import {revalidateTag} from 'next/cache';

// Sites currently uses Vinext's default per-isolate data cache. Tags make
// successful mutations immediate in the active isolate; the short TTL bounds
// stale reads in any other warm isolate without adding KV infrastructure.
export const PUBLIC_NEWS_CACHE_TAG='public-news-v1';
export const PUBLIC_NEWS_CACHE_SECONDS=60;
export const PUBLIC_SITE_COPY_CACHE_TAG='public-site-copy-v1';
export const PUBLIC_SITE_COPY_CACHE_SECONDS=60;
export const PUBLIC_ROADMAP_COPY_CACHE_TAG='public-roadmap-copy-v1';
export const PUBLIC_ROADMAP_COPY_CACHE_SECONDS=60;
export const PUBLIC_WORKS_CACHE_TAG='public-works-v1';
export const PUBLIC_WORKS_CACHE_SECONDS=60;

/** Route-handler mutations expire the current cache entry immediately. */
export function invalidatePublicNewsCache(){
  revalidateTag(PUBLIC_NEWS_CACHE_TAG,{expire:0});
}

export function invalidatePublicSiteCopyCache(){
  revalidateTag(PUBLIC_SITE_COPY_CACHE_TAG,{expire:0});
}

export function invalidatePublicRoadmapCopyCache(){
  revalidateTag(PUBLIC_ROADMAP_COPY_CACHE_TAG,{expire:0});
}

export function invalidatePublicWorksCache(){
  revalidateTag(PUBLIC_WORKS_CACHE_TAG,{expire:0});
}
