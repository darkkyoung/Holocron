export const FIRST_VISIT_KEY='guest_first_visit_v1';
export const OPENING_KEY='opening_first_visit_v1';
const DAY=86_400_000;
const kstFormat=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'});
export function kstDate(now:Date){
  const parts=kstFormat.formatToParts(now),part=(type:string)=>parts.find(value=>value.type===type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function shiftDate(date:string,days:number){return new Date(Date.parse(date+'T00:00:00Z')+days*DAY).toISOString().slice(0,10);}
export function kstWeek(now:Date){
  const today=kstDate(now),weekday=new Date(today+'T00:00:00Z').getUTCDay();
  const week=shiftDate(today,-((weekday+6)%7));
  return {today,week,dates:Array.from({length:7},(_,i)=>shiftDate(week,i))};
}
export const attendanceKey=(week:string,date:string)=>`attendance:${week}:${date}`;
export const quizRewardKey=(quizId:string)=>`quiz_correct:${quizId}`;
export function attendanceState(now:Date,claimedDates:string[]){
  const {today,week,dates}=kstWeek(now),claimed=new Set(claimedDates);
  let cursor=claimed.has(today)?today:shiftDate(today,-1),streak=0;
  while(cursor>=week&&claimed.has(cursor)){streak++;cursor=shiftDate(cursor,-1);}
  return {today,week,streak,claimedToday:claimed.has(today),days:dates.map(date=>({date,claimed:claimed.has(date),today:date===today,missed:date<today&&!claimed.has(date)}))};
}
export type AttendanceState=ReturnType<typeof attendanceState>;
export type RewardSummary={reason:'first_visit'|'opening'|'attendance';requested:number;applied:number;streak?:number};
export type GuestCreditState={balance:number;cap:10;attendance:AttendanceState;rewards:RewardSummary[]};
export type QuizCreditReward={requested:number;applied:number;balance:number;capped:boolean;newlyApplied:boolean};
