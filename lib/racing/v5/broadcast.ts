import type {Meeting} from '../v2/types';
export const MANUAL_LIMIT_MS=300000;
/** Local control only, no scheduler/seed mutation. Gate consumption is idempotent. */
export function createBroadcastHold(now:()=>number=()=>Date.now()){
 let current:{key:string;until:number}|null=null;
 const consumed=new Set<string>();
 return {begin(key:string){if(consumed.has(key))return false;if(current?.key===key)return true;current={key,until:now()+MANUAL_LIMIT_MS};return true;},
  release(key:string,manual=false){if(!current||current.key!==key||(!manual&&now()<current.until))return false;consumed.add(key);current=null;return true;},
  remaining(){return current?Math.max(0,current.until-now()):0;},reset(){current=null;consumed.clear();}};
}
export function broadcastGates(m:Meeting){return [
 ...(m.qualifying.rounds??[]).map(r=>({key:`round-${r.round}`,start:r.finishMs,end:r.resultEndMs})),
 ...(m.qualifying.gridStartMs!==undefined?[{key:'grid',start:m.qualifying.gridStartMs,end:m.raceStartMs}]:[]),
 {key:'finish',start:m.ceremonyStartMs,end:m.ceremonyStartMs},
 ];}
/** Future fixed schedule is independent of any local manual gate. No operational scheduler here. */
export function regularSchedule(kstDate:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(kstDate))throw Error('INVALID_DATE');
 return Object.freeze({qualifying:Date.parse(kstDate+'T20:00:00+09:00'),cutoff:Date.parse(kstDate+'T20:55:00+09:00'),race:Date.parse(kstDate+'T21:00:00+09:00')});
}
