import {db} from '@/lib/news';
import type {AdminPatch} from './override-policy';

export async function persistAdminPatches(patches:readonly AdminPatch[]){
  if(!patches.length)return;
  await db().batch(patches.map(patch=>patch.kind==='topic'
    ?db().prepare('UPDATE articles SET topic=?, topic_override=? WHERE id=?').bind(patch.topic,patch.topicOverride,patch.id)
    :db().prepare('UPDATE articles SET status=?, status_override=?, reason=? WHERE id=?').bind(patch.status,patch.statusOverride,patch.reason,patch.id)));
}

export async function persistArticleTitleOverride(id:string,titleOverride:string|null){
  const result=await db().prepare('UPDATE articles SET title_override=? WHERE id=?').bind(titleOverride,id).run();
  if((result.meta?.changes??0)<1)throw new Error('기사를 찾을 수 없습니다.');
}
