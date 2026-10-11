export const ROLLING_BACKFILL_DAYS=14;
export const MAX_ROLLING_REQUESTS_PER_SOURCE=2;
export const MAX_HISTORICAL_REQUESTS_PER_SOURCE=6;
export const MAX_ARCHIVE_CANDIDATES_PER_SOURCE=100;

export function monthKeys(start:string,end:string){
  const keys:string[]=[];const cursor=new Date(`${start.slice(0,7)}-01T00:00:00Z`);const last=end.slice(0,7);
  while(cursor.toISOString().slice(0,7)<=last){keys.push(cursor.toISOString().slice(0,7));cursor.setUTCMonth(cursor.getUTCMonth()+1);}
  return keys;
}

export function rollingMonthKeys(now:number){
  const end=new Date(now).toISOString().slice(0,10),start=new Date(now-ROLLING_BACKFILL_DAYS*86400000).toISOString().slice(0,10);
  return monthKeys(start,end);
}
