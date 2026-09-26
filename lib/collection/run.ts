import {collect,type CollectionResult} from '@/lib/collect';
import {acquireCollectionLock,releaseCollectionLock,saveCollectionRun} from './run-repository';

export type CollectionTrigger='manual'|'scheduled';
export type CollectionRunStatus='running'|'success'|'partial'|'failed'|'skipped';
export type CollectionRunMetadata={
  at:string;trigger:CollectionTrigger;startedAt:string;finishedAt:string|null;status:CollectionRunStatus;
  count:number;duplicateCount:number;activeSources:number;sources:CollectionResult['sources'];
  localization:CollectionResult['localization']|null;report:string[];error:string;
};
export type CollectionRunResult=CollectionRunMetadata&{ok:boolean;reason?:'collection_in_progress'};

export const COLLECTION_LOCK_LEASE_MS=20*60*1000;

export type CollectionRunDependencies={
  collect:()=>Promise<CollectionResult>;
  acquire:(owner:string,trigger:CollectionTrigger,acquiredAt:string,expiresAt:string)=>Promise<boolean>;
  release:(owner:string)=>Promise<void>;
  save:(metadata:CollectionRunMetadata)=>Promise<void>;
  now:()=>Date;
  createOwner:()=>string;
};

const dependencies:CollectionRunDependencies={collect,acquire:acquireCollectionLock,release:releaseCollectionLock,save:saveCollectionRun,now:()=>new Date(),createOwner:()=>crypto.randomUUID()};

function emptyMetadata(trigger:CollectionTrigger,startedAt:string,status:CollectionRunStatus):CollectionRunMetadata{
  return {at:startedAt,trigger,startedAt,finishedAt:null,status,count:0,duplicateCount:0,activeSources:0,sources:[],localization:null,report:[],error:''};
}

function resultStatus(result:CollectionResult):'success'|'partial'{
  const sourceFailure=result.sources.some(source=>Boolean(source.sourceFailure)||source.aiFailure>0||source.processingFailure>0||source.persistenceFailure>0);
  return sourceFailure||result.localization.failed>0?'partial':'success';
}

function errorMessage(error:unknown){
  const message=error instanceof Error?error.message:'알 수 없는 오류';
  return message.slice(0,500);
}

export async function runCollectionWith(trigger:CollectionTrigger,deps:CollectionRunDependencies):Promise<CollectionRunResult>{
  const startedAt=deps.now().toISOString();
  const owner=deps.createOwner();
  const expiresAt=new Date(Date.parse(startedAt)+COLLECTION_LOCK_LEASE_MS).toISOString();
  const acquired=await deps.acquire(owner,trigger,startedAt,expiresAt);
  if(!acquired){
    const finishedAt=deps.now().toISOString();
    const skipped={...emptyMetadata(trigger,startedAt,'skipped'),finishedAt,report:['현재 다른 수집 작업이 진행 중입니다.']};
    await deps.save(skipped);
    return {...skipped,ok:true,reason:'collection_in_progress'};
  }

  try{
    await deps.save(emptyMetadata(trigger,startedAt,'running'));
    console.info(`[collection] ${trigger} run started`);
    const result=await deps.collect();
    const finishedAt=deps.now().toISOString();
    const metadata:CollectionRunMetadata={
      at:finishedAt,trigger,startedAt,finishedAt,status:resultStatus(result),count:result.count,
      duplicateCount:result.sources.reduce((sum,source)=>sum+source.duplicate,0),activeSources:result.activeSources,
      sources:result.sources,localization:result.localization,report:result.report,error:'',
    };
    await deps.save(metadata);
    console.info(`[collection] ${trigger} run finished with ${metadata.status}`);
    return {...metadata,ok:true};
  }catch(error){
    const finishedAt=deps.now().toISOString();
    const message=errorMessage(error);
    const failed={...emptyMetadata(trigger,startedAt,'failed'),at:finishedAt,finishedAt,report:['수집 실행에 실패했습니다.'],error:message};
    try{await deps.save(failed);}catch(saveError){console.error('[collection] failed to save run metadata',saveError);}
    console.error(`[collection] ${trigger} run failed`,message);
    throw error;
  }finally{
    try{await deps.release(owner);}catch(error){console.error('[collection] failed to release lease',error);}
  }
}

export function runCollection(trigger:CollectionTrigger){return runCollectionWith(trigger,dependencies);}
