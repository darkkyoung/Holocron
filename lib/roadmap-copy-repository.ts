import {db,setting} from '@/lib/news';
import {DEFAULT_ROADMAP_COPY,ROADMAP_COPY_SETTING_KEY,normalizeRoadmapCopy,validateRoadmapCopy,type RoadmapCopy} from '@/lib/roadmap-copy';
import {unstable_cache} from 'next/cache';
import {invalidatePublicRoadmapCopyCache,PUBLIC_ROADMAP_COPY_CACHE_SECONDS,PUBLIC_ROADMAP_COPY_CACHE_TAG} from '@/lib/public-cache';

async function readRoadmapCopy():Promise<RoadmapCopy>{
  const row=await db().prepare('SELECT value FROM settings WHERE key=?').bind(ROADMAP_COPY_SETTING_KEY).first<{value:string}>();
  if(!row?.value)return structuredClone(DEFAULT_ROADMAP_COPY);
  try{return normalizeRoadmapCopy(JSON.parse(row.value));}
  catch{return structuredClone(DEFAULT_ROADMAP_COPY);}
}

const loadPublicRoadmapCopy=unstable_cache(readRoadmapCopy,['public-roadmap-copy-v1'],{revalidate:PUBLIC_ROADMAP_COPY_CACHE_SECONDS,tags:[PUBLIC_ROADMAP_COPY_CACHE_TAG]});

export function loadRoadmapCopy():Promise<RoadmapCopy>{return loadPublicRoadmapCopy();}
export function loadRoadmapCopyFresh():Promise<RoadmapCopy>{return readRoadmapCopy();}

export async function saveRoadmapCopy(value:unknown):Promise<RoadmapCopy>{
  const copy=validateRoadmapCopy(value);
  await setting(ROADMAP_COPY_SETTING_KEY,JSON.stringify(copy));
  invalidatePublicRoadmapCopyCache();
  return copy;
}

export async function resetRoadmapCopy():Promise<RoadmapCopy>{
  await db().prepare('DELETE FROM settings WHERE key=?').bind(ROADMAP_COPY_SETTING_KEY).run();
  invalidatePublicRoadmapCopyCache();
  return structuredClone(DEFAULT_ROADMAP_COPY);
}
