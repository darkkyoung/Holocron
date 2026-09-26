import {db,setting} from '@/lib/news';
import type {CollectionRunMetadata,CollectionTrigger} from './run';

const LOCK_NAME='news-collection';
const LAST_COLLECTION_KEY='last_collection';

export async function acquireCollectionLock(owner:string,trigger:CollectionTrigger,acquiredAt:string,expiresAt:string){
  const result=await db().prepare(`INSERT INTO collection_locks (name,owner,trigger,acquired_at,expires_at)
    VALUES (?,?,?,?,?)
    ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,trigger=excluded.trigger,acquired_at=excluded.acquired_at,expires_at=excluded.expires_at
    WHERE collection_locks.expires_at<=?`)
    .bind(LOCK_NAME,owner,trigger,acquiredAt,expiresAt,acquiredAt).run();
  return (result.meta?.changes??0)>0;
}

export async function releaseCollectionLock(owner:string){
  await db().prepare('DELETE FROM collection_locks WHERE name=? AND owner=?').bind(LOCK_NAME,owner).run();
}

export async function saveCollectionRun(metadata:CollectionRunMetadata){
  await setting(LAST_COLLECTION_KEY,JSON.stringify(metadata));
}

export async function loadLastCollectionRun():Promise<CollectionRunMetadata|null>{
  const row=await db().prepare('SELECT value FROM settings WHERE key=?').bind(LAST_COLLECTION_KEY).first<{value:string}>();
  if(!row?.value)return null;
  try{
    const parsed=JSON.parse(row.value) as Partial<CollectionRunMetadata>;
    if((parsed.trigger!=='manual'&&parsed.trigger!=='scheduled')||typeof parsed.startedAt!=='string'||typeof parsed.status!=='string')return null;
    return parsed as CollectionRunMetadata;
  }catch{return null;}
}
