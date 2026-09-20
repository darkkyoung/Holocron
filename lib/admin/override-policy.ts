export type ArticleStatus='published'|'excluded'|'review';
export type AdminAction='merge'|'split'|'exclude'|'restore'|'publish-review';

export type AdminPatch=
  |{kind:'topic';id:string;topic:string;topicOverride:string}
  |{kind:'status';id:string;status:'published'|'excluded';statusOverride:'published'|'excluded';reason:string};

export type OverrideState={
  topic:string;
  topicOverride:string|null;
  status:ArticleStatus;
  statusOverride:ArticleStatus|null;
  reason:string;
};

export type AutomaticDecision={topic?:string;status?:ArticleStatus;reason?:string};

export function buildAdminPatches(action:AdminAction,ids:readonly string[],mergedTopic?:string):AdminPatch[]{
  if(action==='merge'){
    if(!mergedTopic)throw new Error('병합할 주제 식별자가 필요합니다.');
    return ids.map(id=>({kind:'topic',id,topic:mergedTopic,topicOverride:mergedTopic}));
  }
  if(action==='split')return ids.map(id=>({kind:'topic',id,topic:id,topicOverride:id}));
  const published=action==='restore'||action==='publish-review';
  return ids.map(id=>({
    kind:'status',id,
    status:published?'published':'excluded',
    statusOverride:published?'published':'excluded',
    reason:action==='exclude'?'관리자 수동 제외':action==='publish-review'?'관리자 검토 후 공개':'관리자 수동 복구',
  }));
}

/** Automatic processing may propose values, but an explicit administrator value wins. */
export function applyAutomaticDecision(current:OverrideState,automatic:AutomaticDecision):OverrideState{
  const topic=current.topicOverride??automatic.topic??current.topic;
  const status=current.statusOverride??automatic.status??current.status;
  const automaticStatusApplied=current.statusOverride===null&&automatic.status!==undefined;
  return {
    ...current,
    topic,
    status,
    reason:automaticStatusApplied?(automatic.reason??''):current.reason,
  };
}
