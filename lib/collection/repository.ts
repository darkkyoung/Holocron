import {db,setting,type Article} from '../news';
import {editorialReason} from './policy';

const EDITORIAL_MAINTENANCE_KEY='collection_maintenance_editorial_v1';

export async function insertCollectedArticle(article:Article){
  const result=await db().prepare('INSERT OR IGNORE INTO articles (id,topic,topic_override,title,summary,image,url,source,published,category,status,status_override,reason,franchise) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    .bind(article.id,article.topic,article.topicOverride,article.title,article.summary,article.image,article.url,article.source,article.published,article.category,article.status,article.statusOverride,article.reason,article.franchise).run();
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
