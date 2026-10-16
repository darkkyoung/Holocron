import type {Article} from '../news';
import {decodeArticle} from './rows';
import {buildStories} from './stories';
import {projectNewsWorks} from '../news-work/projection';
import type {ArticleWorkRelation,WorkChoice} from '../news-work/types';
import {COLLECTION_SOURCES_SETTING_KEY,parseSourceEnabledState,filterArticlesByEnabledSources} from '../collection/source-settings';

export const ARCHIVE_WINDOW_MS=90*86400000;
export const SNAPSHOT_LIMITS={articles:2000,works:500,relations:10000,bytes:4*1024*1024} as const;
export class ArchiveSnapshotError extends Error {
  constructor(public readonly code:'ARCHIVE_CAPACITY'|'ARCHIVE_UNAVAILABLE'){super(code);}
}

// Fixed allowlist. No images, hero metadata, security settings or content bodies.
const definitions=[
  {name:'article_rows',limit:SNAPSHOT_LIMITS.articles,columns:['id','topic','title','titleOverride','summary','url','source','published','category','status'],
    sql:"SELECT id,topic,title,title_override AS titleOverride,summary,url,source,published,category,status FROM articles WHERE status='published' AND julianday(published)>=julianday(?)"},
  {name:'work_rows',limit:SNAPSHOT_LIMITS.works,columns:['id','title','originalTitle','seasonNumber'],
    sql:'SELECT id,title,original_title AS originalTitle,season_number AS seasonNumber FROM works'},
  {name:'relation_rows',limit:SNAPSHOT_LIMITS.relations,columns:['articleId','workId','state','origin'],
    sql:'SELECT r.article_id AS articleId,r.work_id AS workId,r.state,r.origin FROM article_work_relations r JOIN article_rows a ON a.id=r.article_id'},
  {name:'source_rows',limit:1,columns:['value'],sql:'SELECT value FROM settings WHERE key=?'},
] as const;
const ctes=definitions.map(d=>`${d.name} AS (${d.sql})`).join(',');
const budgets=definitions.map(d=>`SELECT '${d.name}' AS dataset,COUNT(*) AS row_count,COALESCE(SUM(length(CAST(json_object(${d.columns.map(c=>`'${c}',${c}`).join(',')}) AS BLOB))),0) AS byte_count FROM ${d.name}`).join(' UNION ALL ');
const prefix=`WITH ${ctes}, budgets AS (${budgets})`;
const guard=`(SELECT SUM(byte_count)<=${SNAPSHOT_LIMITS.bytes} FROM budgets) AND NOT EXISTS(SELECT 1 FROM budgets WHERE ${definitions.map(d=>`(dataset='${d.name}' AND row_count>${d.limit})`).join(' OR ')})`;

/** Every invocation starts at primary, including future pre/post-generation checks.
 * One read-only batch transaction: guards and all row projections share a snapshot.
 * Guard published rows before source filtering: conservative ceiling, no partial Story.
 */
export async function readArchiveSnapshot(database:D1Database,now=Date.now()){
  try{
    const session=database.withSession('first-primary');
    const params=[new Date(now-ARCHIVE_WINDOW_MS).toISOString(),COLLECTION_SOURCES_SETTING_KEY];
    const queries=[`${prefix} SELECT * FROM budgets`,...definitions.map(d=>`${prefix} SELECT * FROM ${d.name} WHERE ${guard} LIMIT ${d.limit+1}`)];
    const result=await session.batch<Record<string,unknown>>(queries.map(sql=>session.prepare(sql).bind(...params)));
    if(result.length!==5||result.some(r=>!r.success))throw new ArchiveSnapshotError('ARCHIVE_UNAVAILABLE');
    const stats=result[0].results;
    if(stats.length!==4)throw new ArchiveSnapshotError('ARCHIVE_UNAVAILABLE');
    let total=0;
    for(const [i,d] of definitions.entries()){
      const stat=stats.find(s=>s.dataset===d.name);
      if(!stat||!Number.isSafeInteger(stat.row_count)||!Number.isSafeInteger(stat.byte_count))throw new ArchiveSnapshotError('ARCHIVE_UNAVAILABLE');
      total+=stat.byte_count as number;
      if((stat.row_count as number)>d.limit||total>SNAPSHOT_LIMITS.bytes)throw new ArchiveSnapshotError('ARCHIVE_CAPACITY');
      // A later oversized dataset suppresses ALL payloads; check counts after all guards.
      if(result[i+1].results.length>d.limit)throw new ArchiveSnapshotError('ARCHIVE_CAPACITY');
    }
    definitions.forEach((d,i)=>{if(result[i+1].results.length!==stats.find(s=>s.dataset===d.name)!.row_count)throw new ArchiveSnapshotError('ARCHIVE_UNAVAILABLE');});
    const sourceState=parseSourceEnabledState((result[4].results[0]?.value as string|undefined));
    const articles=filterArticlesByEnabledSources((result[1].results as unknown as Article[]).map(a=>decodeArticle({...a,image:'',reason:'',franchise:'star-wars',topicOverride:null,statusOverride:null})),sourceState);
    const works=result[2].results as unknown as WorkChoice[];
    const visible=new Set(articles.map(a=>a.id));
    const relations=(result[3].results as unknown as ArticleWorkRelation[]).filter(r=>visible.has(r.articleId));
    const stories=projectNewsWorks(buildStories(articles,now),relations.filter(r=>r.state==='linked'),works).stories;
    return {articles,works,relations,stories,sourceState,asOf:new Date(now).toISOString(),archiveWindow:{from:new Date(now-ARCHIVE_WINDOW_MS).toISOString(),to:new Date(now).toISOString()}};
  }catch(error){if(error instanceof ArchiveSnapshotError)throw error;throw new ArchiveSnapshotError('ARCHIVE_UNAVAILABLE');}
}
export type ArchiveSnapshot=Awaited<ReturnType<typeof readArchiveSnapshot>>;
