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
const MISSING_TITLE_PLACEHOLDER='제목 확인 필요';
const MISSING_SUMMARY_PLACEHOLDER='원문 메타데이터를 확인해 주세요.';
export const METADATA_RECOVERY_CURSOR_KEY='metadata_recovery_cursor_v1';

export async function listMetadataFailedReviewArticleIds(limit:number,cutoff:string){
  const predicate="((status='review' AND reason LIKE ? AND status_override IS NULL AND topic_override IS NULL AND (published>=? OR published='')) OR (status='published' AND published>=? AND (title=? OR summary=?)))";
  const args=[METADATA_FAILURE_REASON_LIKE,cutoff,cutoff,MISSING_TITLE_PLACEHOLDER,MISSING_SUMMARY_PLACEHOLDER] as const;
  const totalRow=await db().prepare(`SELECT COUNT(*) AS total FROM articles WHERE ${predicate}`).bind(...args).first<{total:number}>();
  const total=Number(totalRow?.total??0);
  if(!total)return {rows:[] as {id:string;published:string}[],total:0,cursor:null,nextCursor:null};
  const cursorRow=await db().prepare('SELECT value FROM settings WHERE key=?').bind(METADATA_RECOVERY_CURSOR_KEY).first<{value:string}>();
  let cursor:{published:string;id:string}|null=null;try{const value=JSON.parse(cursorRow?.value??'null');if(value&&typeof value.published==='string'&&typeof value.id==='string')cursor=value;}catch{}
  const rows:{id:string;published:string}[]=cursor?(await db().prepare(`SELECT id,published FROM articles WHERE ${predicate} AND (published<? OR (published=? AND id>?)) ORDER BY published DESC,id ASC LIMIT ?`).bind(...args,cursor.published,cursor.published,cursor.id,limit).all<{id:string;published:string}>()).results:[];
  if(rows.length<limit){
    const excluded=rows.length?` AND id NOT IN (${rows.map(()=>'?').join(',')})`:'';
    const wrapped=await db().prepare(`SELECT id,published FROM articles WHERE ${predicate}${excluded} ORDER BY published DESC,id ASC LIMIT ?`).bind(...args,...rows.map(row=>row.id),limit-rows.length).all<{id:string;published:string}>();
    rows.push(...wrapped.results);
  }
  const nextCursor=rows.length?rows.at(-1)!:cursor;
  if(nextCursor)await setting(METADATA_RECOVERY_CURSOR_KEY,JSON.stringify(nextCursor));
  return {rows,total,cursor,nextCursor};
}

export async function updateReviewMetadataRecovery(id:string,patch:RecoveryArticlePatch&{image:string;published:string},cutoff:string){
  const result=await db().prepare("UPDATE articles SET title=?,summary=?,category=?,topic=?,image=?,published=?,status=?,reason=? WHERE id=? AND status='review' AND reason LIKE ? AND status_override IS NULL AND topic_override IS NULL AND (published>=? OR published='')")
    .bind(patch.title,patch.summary,patch.category,patch.topic,patch.image,patch.published,patch.status,patch.reason,id,METADATA_FAILURE_REASON_LIKE,cutoff).run();
  return (result.meta?.changes??0)>0;
}

export async function updatePublishedMetadataRecovery(id:string,patch:RecoveryArticlePatch&{image:string},cutoff:string){
  const result=await db().prepare("UPDATE articles SET title=?,summary=?,category=?,topic=CASE WHEN topic_override IS NULL THEN ? ELSE topic END,image=CASE WHEN ?<>'' THEN ? ELSE image END WHERE id=? AND status='published' AND (title=? OR summary=?) AND published>=?")
    .bind(patch.title,patch.summary,patch.category,patch.topic,patch.image,patch.image,id,MISSING_TITLE_PLACEHOLDER,MISSING_SUMMARY_PLACEHOLDER,cutoff).run();
  return (result.meta?.changes??0)>0;
}

/** Backward-compatible review-only repository entry point. */
export const updateMetadataRecovery=updateReviewMetadataRecovery;

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
