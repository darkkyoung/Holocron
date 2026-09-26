import {config,list,seedNews} from '@/lib/news';
import {buildAdminPatches,type AdminAction} from './override-policy';
import {persistAdminPatches} from './repository';
import {runEditorialMaintenanceOnce} from '@/lib/collection/repository';
import {retryFailedAiArticles} from '@/lib/collection/recovery';
import {filterArticlesByEnabledSources,isSourceId,sourceSettingItems} from '@/lib/collection/source-settings';
import {loadSourceEnabledState,saveSourceEnabledState} from '@/lib/collection/source-settings-repository';
import {loadLastCollectionRun} from '@/lib/collection/run-repository';
import {runCollection} from '@/lib/collection/run';

const actions=new Set<AdminAction>(['merge','split','exclude','restore','publish-review']);

export async function getManagementState(){
  const repaired=await runEditorialMaintenanceOnce();
  const sourceState=await loadSourceEnabledState();
  const articles=await list();
  const lastCollection=await loadLastCollectionRun();
  return {articles,visibleArticles:filterArticlesByEnabledSources(articles,sourceState),sources:sourceSettingItems(sourceState),ai:!!config().key,repaired,lastCollection,now:Date.now()};
}

export async function runManagementAction(action:string,ids?:unknown,sourceId?:unknown,enabled?:unknown){
  if(action==='initialize'){
    await seedNews();
    return {ok:true};
  }
  if(action==='collect')return runCollection('manual');
  if(action==='retry-ai')return retryFailedAiArticles();
  if(action==='set-source-enabled'){
    if(!isSourceId(sourceId)||typeof enabled!=='boolean')throw new Error('뉴스 소스 설정을 확인해 주세요.');
    const state=await loadSourceEnabledState();
    await saveSourceEnabledState({...state,[sourceId]:enabled});
    return {ok:true};
  }
  if(!actions.has(action as AdminAction))throw new Error('지원하지 않는 작업입니다.');
  if(!Array.isArray(ids)||!ids.length||ids.length>100||!ids.every(id=>typeof id==='string'))throw new Error('기사를 선택해 주세요.');
  if(action==='merge'&&ids.length<2)throw new Error('두 개 이상의 기사를 선택해 주세요.');
  const patches=buildAdminPatches(action as AdminAction,ids,action==='merge'?crypto.randomUUID():undefined);
  await persistAdminPatches(patches);
  return {ok:true};
}
