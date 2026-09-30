import {config,list,seedNews} from '@/lib/news';
import {buildAdminPatches,type AdminAction} from './override-policy';
import {persistAdminPatches,persistArticleTitleOverride} from './repository';
import {normalizeArticleTitleOverride} from '@/lib/news/presentation';
import {runEditorialMaintenanceOnce} from '@/lib/collection/repository';
import {retryFailedAiArticles} from '@/lib/collection/recovery';
import {filterArticlesByEnabledSources,isSourceId,sourceSettingItems} from '@/lib/collection/source-settings';
import {loadSourceEnabledState,saveSourceEnabledState} from '@/lib/collection/source-settings-repository';
import {loadLastCollectionRun} from '@/lib/collection/run-repository';
import {runCollection} from '@/lib/collection/run';
import {isCollectionIntervalHours,nextScheduledCollectionAt} from '@/lib/collection/schedule-settings';
import {loadCollectionScheduleSettings,loadCollectionScheduleState,saveCollectionScheduleSettings} from '@/lib/collection/schedule-settings-repository';
import {invalidatePublicNewsCache} from '@/lib/public-cache';

const actions=new Set<AdminAction>(['merge','split','exclude','restore','publish-review']);

export async function getManagementState(){
  const repaired=await runEditorialMaintenanceOnce();
  const sourceState=await loadSourceEnabledState();
  const articles=await list();
  const lastCollection=await loadLastCollectionRun();
  const collectionSchedule=await loadCollectionScheduleSettings();
  const scheduleState=await loadCollectionScheduleState();
  const fallbackScheduledAt=!scheduleState.lastCompletedAt&&lastCollection?.trigger==='scheduled'&&(lastCollection.status==='success'||lastCollection.status==='partial')?lastCollection.finishedAt:null;
  const lastScheduledAt=scheduleState.lastCompletedAt??fallbackScheduledAt??null;
  return {articles,visibleArticles:filterArticlesByEnabledSources(articles,sourceState),sources:sourceSettingItems(sourceState),ai:!!config().key,repaired,lastCollection,collectionSchedule:{intervalHours:collectionSchedule.intervalHours,lastScheduledAt,nextScheduledAt:nextScheduledCollectionAt(lastScheduledAt,collectionSchedule.intervalHours)},now:Date.now()};
}

export async function runManagementAction(action:string,ids?:unknown,sourceId?:unknown,enabled?:unknown,id?:unknown,title?:unknown,intervalHours?:unknown){
  if(action==='initialize'){
    await seedNews();
    invalidatePublicNewsCache();
    return {ok:true};
  }
  if(action==='collect'){const result=await runCollection('manual');invalidatePublicNewsCache();return result;}
  if(action==='retry-ai'){const result=await retryFailedAiArticles();invalidatePublicNewsCache();return result;}
  if(action==='set-collection-interval'){
    if(!isCollectionIntervalHours(intervalHours))throw new Error('자동 수집 주기를 확인해 주세요.');
    await saveCollectionScheduleSettings(intervalHours);
    return {ok:true,report:[`자동 수집 주기를 ${intervalHours}시간으로 변경했습니다.`]};
  }
  if(action==='set-source-enabled'){
    if(!isSourceId(sourceId)||typeof enabled!=='boolean')throw new Error('뉴스 소스 설정을 확인해 주세요.');
    const state=await loadSourceEnabledState();
    await saveSourceEnabledState({...state,[sourceId]:enabled});
    invalidatePublicNewsCache();
    return {ok:true};
  }
  if(action==='set-title-override'){
    if(typeof id!=='string'||!id)throw new Error('기사를 확인해 주세요.');
    await persistArticleTitleOverride(id,normalizeArticleTitleOverride(title));
    invalidatePublicNewsCache();
    return {ok:true};
  }
  if(action==='clear-title-override'){
    if(typeof id!=='string'||!id)throw new Error('기사를 확인해 주세요.');
    await persistArticleTitleOverride(id,null);
    invalidatePublicNewsCache();
    return {ok:true};
  }
  if(!actions.has(action as AdminAction))throw new Error('지원하지 않는 작업입니다.');
  if(!Array.isArray(ids)||!ids.length||ids.length>100||!ids.every(id=>typeof id==='string'))throw new Error('기사를 선택해 주세요.');
  if(action==='merge'&&ids.length<2)throw new Error('두 개 이상의 기사를 선택해 주세요.');
  const patches=buildAdminPatches(action as AdminAction,ids,action==='merge'?crypto.randomUUID():undefined);
  await persistAdminPatches(patches);
  invalidatePublicNewsCache();
  return {ok:true};
}
