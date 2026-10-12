import {db,type Article} from '../news';
import {invalidatePublicNewsCache,invalidatePublicWorksCache} from '../public-cache';
import {buildWorkMatchIndex,matchArticleWorks} from './matcher';
import {addAutomaticRelations,articleRelations,countManualRelations,relationWorks,setManualRelation} from './repository';
import type {AssociationReport} from './types';

export function invalidateNewsWorks(){invalidatePublicNewsCache();invalidatePublicWorksCache();}
export async function associateArticles(articles:readonly Pick<Article,'id'|'title'|'titleOverride'|'summary'>[],database=db()):Promise<AssociationReport>{
  const index=buildWorkMatchIndex(await relationWorks(database));
  const report:AssociationReport={inspected:articles.length,added:0,ambiguous:0,unmatched:0,manualPreserved:0,nextCursor:null};
  const pairs:{articleId:string;workId:string}[]=[];
  // Bounded counts describe preserved decisions; conflict protection remains atomic.
  report.manualPreserved=await countManualRelations(database,articles.map(article=>article.id));
  for(const article of articles){const match=matchArticleWorks(index,article);if(match.ambiguous)report.ambiguous++;if(!match.workIds.length&&!match.ambiguous)report.unmatched++;for(const workId of match.workIds)pairs.push({articleId:article.id,workId});}
  try{report.added=await addAutomaticRelations(database,pairs);}finally{if(pairs.length)invalidateNewsWorks();}
  return report;
}
export function associationReportLine(report:AssociationReport){return `관련 작품: 기사 ${report.inspected}건 확인 · 관계 ${report.added}건 추가 · 모호 ${report.ambiguous}건 · 미일치 ${report.unmatched}건 · 수동 상태 ${report.manualPreserved}건 보존`;}
/** Optional enrichment must never turn successful collection into a failed run. */
export async function associateCollectedArticles(articles:readonly Pick<Article,'id'|'title'|'titleOverride'|'summary'>[]){
  if(!articles.length)return [];
  try{return [associationReportLine(await associateArticles(articles))];}
  catch{return ['관련 작품 자동 연결 실패 · 기사 수집은 유지됩니다. 관리자에서 관련 작품 재검사를 실행해 주세요.'];}
}
export async function backfillWorkRelations(cursor:unknown){
  if(cursor!==undefined&&(typeof cursor!=='string'||cursor.length>200))throw new Error('커서를 확인해 주세요.');
  const rows=(await db().prepare('SELECT id,title,title_override AS titleOverride,summary FROM articles WHERE id>? ORDER BY id LIMIT 201').bind(cursor??'').all<Pick<Article,'id'|'title'|'titleOverride'|'summary'>>()).results;
  const batch=rows.slice(0,200),report=await associateArticles(batch);
  report.nextCursor=rows.length>200?batch.at(-1)!.id:null;
  return report;
}
export async function getArticleWorkState(id:string){return {works:await relationWorks(db()),relations:await articleRelations(db(),id)};}
export async function editArticleWork(articleId:unknown,workId:unknown,state:unknown){
  if(typeof articleId!=='string'||!articleId||articleId.length>200||typeof workId!=='string'||!workId||workId.length>200||!['linked','excluded'].includes(String(state)))throw new Error('기사·작품·연결 상태를 확인해 주세요.');
  await setManualRelation(db(),articleId,workId,state as 'linked'|'excluded');invalidateNewsWorks();
  return getArticleWorkState(articleId);
}
