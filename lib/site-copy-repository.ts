import {db,setting} from '@/lib/news';
import {DEFAULT_SITE_COPY,SITE_COPY_SETTING_KEY,normalizeSiteCopy,validateSiteCopy,type SiteCopy} from '@/lib/site-copy';
import {unstable_cache} from 'next/cache';
import {invalidatePublicSiteCopyCache,PUBLIC_SITE_COPY_CACHE_SECONDS,PUBLIC_SITE_COPY_CACHE_TAG} from '@/lib/public-cache';

async function readSiteCopy():Promise<SiteCopy>{
  const row=await db().prepare('SELECT value FROM settings WHERE key=?').bind(SITE_COPY_SETTING_KEY).first<{value:string}>();
  if(!row?.value)return {...DEFAULT_SITE_COPY};
  try{return normalizeSiteCopy(JSON.parse(row.value));}
  catch{return {...DEFAULT_SITE_COPY};}
}

const loadPublicSiteCopy=unstable_cache(readSiteCopy,['public-site-copy-v1'],{revalidate:PUBLIC_SITE_COPY_CACHE_SECONDS,tags:[PUBLIC_SITE_COPY_CACHE_TAG]});

export function loadSiteCopy():Promise<SiteCopy>{return loadPublicSiteCopy();}
export function loadSiteCopyFresh():Promise<SiteCopy>{return readSiteCopy();}

export async function saveSiteCopy(value:unknown):Promise<SiteCopy>{
  const copy=validateSiteCopy(value);
  await setting(SITE_COPY_SETTING_KEY,JSON.stringify(copy));
  invalidatePublicSiteCopyCache();
  return copy;
}

export async function resetSiteCopy():Promise<SiteCopy>{
  await db().prepare('DELETE FROM settings WHERE key=?').bind(SITE_COPY_SETTING_KEY).run();
  invalidatePublicSiteCopyCache();
  return {...DEFAULT_SITE_COPY};
}
