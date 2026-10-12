import type {ArticleWorkRelation,WorkChoice} from './types';

export async function relationWorks(database:D1Database){
  const rows=await database.prepare('SELECT id,title,original_title AS originalTitle,season_number AS seasonNumber FROM works ORDER BY title LIMIT 501').all<WorkChoice>();
  if(rows.results.length>500)throw new Error('작품 연결은 최대 500개 카탈로그까지 지원합니다.');
  return rows.results;
}
export async function linkedRelations(database:D1Database,cutoff:string){
  return (await database.prepare("SELECT r.article_id AS articleId,r.work_id AS workId FROM article_work_relations r JOIN articles a ON a.id=r.article_id WHERE r.state='linked' AND a.status='published' AND a.published>=?").bind(cutoff).all<{articleId:string;workId:string}>()).results;
}
export async function articleRelations(database:D1Database,articleId:string){return (await database.prepare('SELECT article_id AS articleId,work_id AS workId,state,origin FROM article_work_relations WHERE article_id=? ORDER BY work_id').bind(articleId).all<ArticleWorkRelation>()).results;}
export async function countManualRelations(database:D1Database,articleIds:readonly string[]){
  let count=0;
  const ids=[...new Set(articleIds)];
  for(let start=0;start<ids.length;start+=80){
    const batch=ids.slice(start,start+80);
    const rows=await database.prepare(`SELECT COUNT(*) AS count FROM article_work_relations WHERE origin='manual' AND article_id IN (${batch.map(()=>'?').join(',')})`).bind(...batch).all<{count:number}>();
    count+=rows.results[0]?.count??0;
  }
  return count;
}
export async function setManualRelation(database:D1Database,articleId:string,workId:string,state:'linked'|'excluded'){
  // Foreign keys reject missing parents. Conflict update deliberately upgrades to manual.
  await database.prepare("INSERT INTO article_work_relations (article_id,work_id,state,origin) VALUES (?,?,?,'manual') ON CONFLICT(article_id,work_id) DO UPDATE SET state=excluded.state,origin='manual'").bind(articleId,workId,state).run();
}
export async function addAutomaticRelations(database:D1Database,pairs:readonly {articleId:string;workId:string}[]){
  let added=0;
  for(let start=0;start<pairs.length;start+=40){
    const results=await database.batch(pairs.slice(start,start+40).map(pair=>database.prepare("INSERT INTO article_work_relations (article_id,work_id,state,origin) SELECT ?,?,'linked','automatic' WHERE EXISTS(SELECT 1 FROM articles WHERE id=?) AND EXISTS(SELECT 1 FROM works WHERE id=?) ON CONFLICT(article_id,work_id) DO NOTHING").bind(pair.articleId,pair.workId,pair.articleId,pair.workId)));
    added+=results.reduce((sum,result)=>sum+(result.meta.changes??0),0);
  }
  return added;
}
