import {and,asc,eq,isNull} from 'drizzle-orm';
import {getDb} from '@/db';
import {works} from '@/db/schema';
import {INITIAL_WORKS} from './seed';
import type {Work,WorkStatus} from './types';
import type {WorkDraft} from './validation';

type WorkRow=typeof works.$inferSelect;
function toWork(row:WorkRow):Work{return {id:row.id,title:row.title,originalTitle:row.originalTitle,type:row.type as Work['type'],status:row.status as WorkStatus,posterUrl:row.posterUrl,releaseDate:row.releaseDate,releasePrecision:row.releasePrecision as Work['releasePrecision'],officialUrl:row.officialUrl,franchise:row.franchise,seriesKey:row.seriesKey,seasonNumber:row.seasonNumber===null?null:Number(row.seasonNumber),tmdbMediaType:row.tmdbMediaType as Work['tmdbMediaType'],tmdbId:row.tmdbId===null?null:Number(row.tmdbId),tmdbSeasonNumber:row.tmdbSeasonNumber===null?null:Number(row.tmdbSeasonNumber)};}
function values(draft:WorkDraft){return {title:draft.title,originalTitle:draft.originalTitle,type:draft.type,status:draft.status,posterUrl:draft.posterUrl,releaseDate:draft.releaseDate,releasePrecision:draft.releasePrecision,officialUrl:draft.officialUrl,seriesKey:draft.seriesKey,seasonNumber:draft.seasonNumber===null?null:String(draft.seasonNumber),...(draft.tmdbMediaType&&draft.tmdbId?{tmdbMediaType:draft.tmdbMediaType,tmdbId:String(draft.tmdbId),tmdbSeasonNumber:draft.tmdbSeasonNumber===null?null:String(draft.tmdbSeasonNumber)}:{})};}

export async function seedWorksIfEmpty(){
  const db=getDb();
  const existing=await db.select({id:works.id}).from(works).limit(1);
  if(existing.length)return false;
  for(const work of INITIAL_WORKS)await db.insert(works).values({id:work.id,title:work.title,originalTitle:work.originalTitle,type:work.type,status:work.status,posterUrl:work.posterUrl,releaseDate:work.releaseDate,releasePrecision:work.releasePrecision,officialUrl:work.officialUrl,franchise:work.franchise,seriesKey:work.seriesKey??null,seasonNumber:work.seasonNumber===undefined||work.seasonNumber===null?null:String(work.seasonNumber)}).onConflictDoNothing();
  return true;
}

export async function listWorks(){
  await seedWorksIfEmpty();
  return (await getDb().select().from(works).orderBy(asc(works.title))).map(toWork);
}

export async function findWorkByTmdbReference(mediaType:'movie'|'tv',tmdbId:number,seasonNumber:number|null){
  const reference=and(eq(works.tmdbMediaType,mediaType),eq(works.tmdbId,String(tmdbId)),seasonNumber===null?isNull(works.tmdbSeasonNumber):eq(works.tmdbSeasonNumber,String(seasonNumber)));
  const found=await getDb().select().from(works).where(reference).limit(1);
  return found[0]?toWork(found[0]):null;
}

export async function updateWorkStatus(id:string,status:WorkStatus){
  const db=getDb();
  const changed=await db.update(works).set({status}).where(eq(works.id,id)).returning({id:works.id});
  if(!changed.length)throw new Error('작품을 찾을 수 없습니다.');
  return changed[0].id;
}

export async function createWork(id:string,draft:WorkDraft){
  const created=await getDb().insert(works).values({id,...values(draft),franchise:'star-wars'}).returning();
  if(!created.length)throw new Error('작품을 등록하지 못했습니다.');
  return toWork(created[0]);
}

export async function updateWork(id:string,draft:WorkDraft){
  const changed=await getDb().update(works).set(values(draft)).where(eq(works.id,id)).returning();
  if(!changed.length)throw new Error('작품을 찾을 수 없습니다.');
  return toWork(changed[0]);
}

export async function deleteWork(id:string){
  const deleted=await getDb().delete(works).where(eq(works.id,id)).returning({id:works.id});
  if(!deleted.length)throw new Error('작품을 찾을 수 없습니다.');
  return deleted[0].id;
}
