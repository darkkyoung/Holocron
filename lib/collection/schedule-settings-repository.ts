import {db,setting} from '@/lib/news';
import {loadLastCollectionRun} from './run-repository';
import {
  COLLECTION_SCHEDULE_SETTING_KEY,COLLECTION_SCHEDULE_STATE_KEY,
  parseCollectionSchedule,parseCollectionScheduleState,isScheduledCollectionDue,nextScheduledCollectionAt,
  type CollectionIntervalHours,type CollectionScheduleSettings,
} from './schedule-settings';

export async function loadCollectionScheduleSettings():Promise<CollectionScheduleSettings>{
  const row=await db().prepare('SELECT value FROM settings WHERE key=?').bind(COLLECTION_SCHEDULE_SETTING_KEY).first<{value:string}>();
  return parseCollectionSchedule(row?.value);
}

export async function saveCollectionScheduleSettings(intervalHours:CollectionIntervalHours){
  const settings={intervalHours};
  await setting(COLLECTION_SCHEDULE_SETTING_KEY,JSON.stringify(settings));
  return settings;
}

export async function loadCollectionScheduleState(){
  const row=await db().prepare('SELECT value FROM settings WHERE key=?').bind(COLLECTION_SCHEDULE_STATE_KEY).first<{value:string}>();
  return parseCollectionScheduleState(row?.value);
}

export async function scheduledCollectionGate(now=new Date()){
  const settings=await loadCollectionScheduleSettings();
  const state=await loadCollectionScheduleState();
  let lastCompletedAt=state.lastCompletedAt;
  if(!lastCompletedAt){
    const last=await loadLastCollectionRun();
    if(last?.trigger==='scheduled'&&(last.status==='success'||last.status==='partial')&&last.finishedAt)lastCompletedAt=last.finishedAt;
  }
  return {
    intervalHours:settings.intervalHours,
    lastCompletedAt,
    nextDueAt:nextScheduledCollectionAt(lastCompletedAt,settings.intervalHours),
    due:isScheduledCollectionDue(now,lastCompletedAt,settings.intervalHours),
  };
}

export async function markScheduledCollectionCompleted(finishedAt:string){
  await setting(COLLECTION_SCHEDULE_STATE_KEY,JSON.stringify({lastCompletedAt:finishedAt}));
}
