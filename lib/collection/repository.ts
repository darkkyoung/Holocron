import {db,setting,type Article} from '../news';
import {COLLECTION_WINDOW_MS,editorialReason} from './policy';
import type {RecoveryArticlePatch} from './recovery-policy';
import type {LocalizationPatch} from './localization-policy';

const EDITORIAL_MAINTENANCE_KEY='collection_maintenance_editorial_v1';

export async function insertCollectedArticle(article:Article){
  const result=await db().prepare('INSERT OR IGNORE INTO articles (id,topic,topic_override,title,title_override,summary,image,url,source,published,category,status,status_override,reason,franchise) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(article.id,article.topic,article.topicOverride,article.title,article.titleOverride,article.summary,article.image,article.url,article.source,article.published,article.category,article.status,article.statusOverride,article.reason,article.franchise).run();
  return (result.meta?.changes??0)>0;
}

const AI_FAILURE_REASON_LIKE='AI 처리 실패:%';

export async function listAiFailedReviewArticles(limit:number){
  const rows=await db().prepare("SELECT * FROM articles WHERE status='review' AND reason LIKE ? AND status_override IS NULL AND topic_override IS NULL ORDER BY published DESC,id ASC LIMIT ?")
    .bind(AI_FAILURE_REASON_LIKE,limit).all<Article>();
  return rows.results;
}

export async function updateAiRecoverySuccess(id:string,patch:RecoveryArticlePatch){
  const result=await db().prepare("UPDATE articles SET title=?,summary=?,category=?,topic=?,status='published',reason='' WHERE id=? AND status='review' AND reason LIKE ? AND status_override IS NULL AND topic_override IS NULL")
    .bind(patch.title,patch.summary,patch.category,patch.topic,id,AI_FAILURE_REASON_LIKE).run();
  return (result.meta?.changes??0)>0;
}

export async function markAiRecoveryFailure(id:string,reason:string){
  const result=await db().prepare("UPDATE articles SET status='review',reason=? WHERE id=? AND status='review' AND reason LIKE ? AND status_override IS NULL AND topic_override IS NULL")
    .bind(reason,id,AI_FAILURE_REASON_LIKE).run();
  return (result.meta?.changes??0)>0;
}

export async function listPublishedLocalizationCandidates(now=Date.now()){
  const cutoff=new Date(now-COLLECTION_WINDOW_MS).toISOString().slice(0,10);
  const rows=await db().prepare("SELECT * FROM articles WHERE status='published' AND published>=? AND (title NOT GLOB '*[가-힣]*' OR summary NOT GLOB '*[가-힣]*') ORDER BY published DESC,id ASC")
    .bind(cutoff).all<Article>();
  return rows.results;
}

export async function updateLocalizationFields(id:string,patch:LocalizationPatch){
  const result=await db().prepare("UPDATE articles SET title=?,summary=?,category=? WHERE id=? AND status='published' AND (title NOT GLOB '*[가-힣]*' OR summary NOT GLOB '*[가-힣]*')")
    .bind(patch.title,patch.summary,patch.category,id).run();
  return (result.meta?.changes??0)>0;
}

export async function runEditorialMaintenanceOnce(){
  const done=await db().prepare('SELECT value FROM settings WHERE key=?').bind(EDITORIAL_MAINTENANCE_KEY).first<{value:string}>();
  if(done)return 0;
  const rows=await db().prepare("SELECT id,title,summary,url FROM articles WHERE status='published' AND status_override IS NULL").all<Pick<Article,'id'|'title'|'summary'|'url'>>();
  const updates=rows.results.flatMap(article=>{
    const reason=editorialReason(article.title,article.summary,article.url);
    return reason?[db().prepare("UPDATE articles SET status='review',reason=? WHERE id=? AND status_override IS NULL").bind(reason,article.id)]:[];
  });
  if(updates.length)await db().batch(updates);
  await setting(EDITORIAL_MAINTENANCE_KEY,new Date().toISOString());
  return updates.length;
}

const METADATA_FAILURE_REASON_LIKE='metadata 문제:%';
export const METADATA_RECOVERY_CURSOR_KEY='metadata_recovery_cursor_v1';

export async function listMetadataFailedReviewArticleIds(limit:number,cutoff:string){
  const predicate="status='review' AND reason LIKE ? AND status_override IS NULL AND topic_override IS NULL AND published>=?";
  const totalRow=await db().prepare(`SELECT COUNT(*) AS total FROM articles WHERE ${predicate}`).bind(METADATA_FAILURE_REASON_LIKE,cutoff).first<{total:number}>();
  const total=Number(totalRow?.total??0);
  if(!total)return {rows:[] as {id:string}[],total:0,offset:0,nextOffset:0};
  const cursorRow=await db().prepare('SELECT value FROM settings WHERE key=?').bind(METADATA_RECOVERY_CURSOR_KEY).first<{value:string}>();
  const stored=Number.parseInt(cursorRow?.value??'0',10);
  const offset=Number.isFinite(stored)&&stored>=0&&stored<total?stored:0;
  const rows=await db().prepare(`SELECT id FROM articles WHERE ${predicate} ORDER BY published DESC,id ASC LIMIT ? OFFSET ?`)
    .bind(METADATA_FAILURE_REASON_LIKE,cutoff,limit,offset).all<{id:string}>();
  const nextOffset=(offset+rows.results.length)%total;
  await setting(METADATA_RECOVERY_CURSOR_KEY,String(nextOffset));
  return {rows:rows.results,total,offset,nextOffset};
}

export async function updateMetadataRecovery(id:string,patch:RecoveryArticlePatch&{image:string;published:string},cutoff:string){
  const result=await db().prepare("UPDATE articles SET title=?,summary=?,category=?,topic=?,image=?,published=?,status=?,reason=? WHERE id=? AND status='review' AND reason LIKE ? AND status_override IS NULL AND topic_override IS NULL AND published>=?")
    .bind(patch.title,patch.summary,patch.category,patch.topic,patch.image,patch.published,patch.status,patch.reason,id,METADATA_FAILURE_REASON_LIKE,cutoff).run();
  return (result.meta?.changes??0)>0;
}

export async function listMissingImageArticleIds(limit:number,cutoff:string){
  const rows=await db().prepare("SELECT id FROM articles WHERE image='' AND published>=? ORDER BY published DESC,id ASC LIMIT ?")
    .bind(cutoff,limit).all<{id:string}>();
  return rows.results;
}

export async function updateArticleImage(id:string,image:string){
  const result=await db().prepare('UPDATE articles SET image=? WHERE id=?').bind(image,id).run();
  return (result.meta?.changes??0)>0;
}

export async function updateMissingArticleImage(id:string,image:string,cutoff:string){
  const result=await db().prepare("UPDATE articles SET image=? WHERE id=? AND image='' AND published>=?").bind(image,id,cutoff).run();
  return (result.meta?.changes??0)>0;
}
