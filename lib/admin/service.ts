import {collect} from '@/lib/collect';
import {config,list,seedNews} from '@/lib/news';
import {buildAdminPatches,type AdminAction} from './override-policy';
import {persistAdminPatches} from './repository';
import {runEditorialMaintenanceOnce} from '@/lib/collection/repository';

const actions=new Set<AdminAction>(['merge','split','exclude','restore','publish-review']);

export async function getManagementState(){
  const repaired=await runEditorialMaintenanceOnce();
  return {articles:await list(),ai:!!config().key,repaired};
}

export async function runManagementAction(action:string,ids?:unknown){
  if(action==='initialize'){
    await seedNews();
    return {ok:true};
  }
  if(action==='collect')return collect();
  if(!actions.has(action as AdminAction))throw new Error('지원하지 않는 작업입니다.');
  if(!Array.isArray(ids)||!ids.length||ids.length>100||!ids.every(id=>typeof id==='string'))throw new Error('기사를 선택해 주세요.');
  if(action==='merge'&&ids.length<2)throw new Error('두 개 이상의 기사를 선택해 주세요.');
  const patches=buildAdminPatches(action as AdminAction,ids,action==='merge'?crypto.randomUUID():undefined);
  await persistAdminPatches(patches);
  return {ok:true};
}
