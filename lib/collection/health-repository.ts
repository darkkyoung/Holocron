import {db,setting} from '@/lib/news';
import type {CollectionResult} from '@/lib/collect';
import {parseCollectionHealthSnapshot,updateCollectionHealthSnapshot,type CollectionHealthSnapshot} from './health';

export const COLLECTION_HEALTH_KEY='collection_source_health_v1';

export async function loadCollectionHealth():Promise<CollectionHealthSnapshot>{
  const row=await db().prepare('SELECT value FROM settings WHERE key=?').bind(COLLECTION_HEALTH_KEY).first<{value:string}>();
  return parseCollectionHealthSnapshot(row?.value);
}

export async function updateCollectionHealth(result:CollectionResult,checkedAt:string){
  const next=updateCollectionHealthSnapshot(await loadCollectionHealth(),result.sources,checkedAt);
  await setting(COLLECTION_HEALTH_KEY,JSON.stringify(next));
  return next;
}
