export const COLLECTION_SCHEDULE_SETTING_KEY='collection_schedule_v1';
export const COLLECTION_SCHEDULE_STATE_KEY='collection_schedule_state_v1';
export const COLLECTION_INTERVAL_OPTIONS=[1,2,3,6,12,24] as const;

export type CollectionIntervalHours=typeof COLLECTION_INTERVAL_OPTIONS[number];
export type CollectionScheduleSettings={intervalHours:CollectionIntervalHours};
export type CollectionScheduleState={lastCompletedAt:string|null};

export const DEFAULT_COLLECTION_SCHEDULE:CollectionScheduleSettings={intervalHours:6};

export function isCollectionIntervalHours(value:unknown):value is CollectionIntervalHours{
  return typeof value==='number'&&(COLLECTION_INTERVAL_OPTIONS as readonly number[]).includes(value);
}

export function normalizeCollectionSchedule(value:unknown):CollectionScheduleSettings{
  if(!value||typeof value!=='object'||Array.isArray(value))return DEFAULT_COLLECTION_SCHEDULE;
  const intervalHours=(value as Record<string,unknown>).intervalHours;
  return {intervalHours:isCollectionIntervalHours(intervalHours)?intervalHours:DEFAULT_COLLECTION_SCHEDULE.intervalHours};
}

export function parseCollectionSchedule(value:string|null|undefined){
  if(!value)return DEFAULT_COLLECTION_SCHEDULE;
  try{return normalizeCollectionSchedule(JSON.parse(value));}
  catch{return DEFAULT_COLLECTION_SCHEDULE;}
}

export function parseCollectionScheduleState(value:string|null|undefined):CollectionScheduleState{
  if(!value)return {lastCompletedAt:null};
  try{
    const parsed=JSON.parse(value) as Record<string,unknown>;
    const lastCompletedAt=typeof parsed.lastCompletedAt==='string'&&!Number.isNaN(Date.parse(parsed.lastCompletedAt))?parsed.lastCompletedAt:null;
    return {lastCompletedAt};
  }catch{return {lastCompletedAt:null};}
}

export function nextScheduledCollectionAt(lastCompletedAt:string|null,intervalHours:CollectionIntervalHours){
  if(!lastCompletedAt)return null;
  const value=Date.parse(lastCompletedAt);
  if(Number.isNaN(value))return null;
  return new Date(value+intervalHours*60*60*1000).toISOString();
}

export function isScheduledCollectionDue(now:Date,lastCompletedAt:string|null,intervalHours:CollectionIntervalHours){
  const next=nextScheduledCollectionAt(lastCompletedAt,intervalHours);
  return !next||now.getTime()>=Date.parse(next);
}
