import {asc,eq} from 'drizzle-orm';
import {getDb} from '@/db';
import {works} from '@/db/schema';
import {INITIAL_WORKS} from './seed';
import type {Work,WorkStatus} from './types';

type WorkRow=typeof works.$inferSelect;
function toWork(row:WorkRow):Work{return {id:row.id,title:row.title,originalTitle:row.originalTitle,type:row.type as Work['type'],status:row.status as WorkStatus,posterUrl:row.posterUrl,releaseDate:row.releaseDate,releasePrecision:row.releasePrecision as Work['releasePrecision'],officialUrl:row.officialUrl,franchise:row.franchise};}

export async function seedWorksIfEmpty(){
  const db=getDb();
  const existing=await db.select({id:works.id}).from(works).limit(1);
  if(existing.length)return false;
  for(const work of INITIAL_WORKS)await db.insert(works).values({id:work.id,title:work.title,originalTitle:work.originalTitle,type:work.type,status:work.status,posterUrl:work.posterUrl,releaseDate:work.releaseDate,releasePrecision:work.releasePrecision,officialUrl:work.officialUrl,franchise:work.franchise}).onConflictDoNothing();
  return true;
}

export async function listWorks(){
  await seedWorksIfEmpty();
  return (await getDb().select().from(works).orderBy(asc(works.title))).map(toWork);
}

export async function updateWorkStatus(id:string,status:WorkStatus){
  const db=getDb();
  const changed=await db.update(works).set({status}).where(eq(works.id,id)).returning({id:works.id});
  if(!changed.length)throw new Error('작품을 찾을 수 없습니다.');
  return changed[0].id;
}
