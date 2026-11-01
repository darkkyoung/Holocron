import type {Meeting,CameraCue} from '../v2/types';
import {regularSchedule} from '../v5/broadcast';
export interface RaceBroadcast {
 readonly preshowStartMs:number;readonly countdownStartMs:number;
 readonly highlightsStartMs:number;readonly officialStartMs:number;
 readonly finisherIds:readonly string[];
}
/** All presentation phases are pure functions of record time, including seeking backwards. */
export function raceStage(m:Meeting,ms:number){
 const b=m.raceBroadcast;
 if(!b)return {kind:'race' as const,remaining:0,id:null};
 if(ms<m.raceStartMs)return {kind:ms<b.countdownStartMs?'preshow' as const:'countdown' as const,
  remaining:Math.ceil((m.raceStartMs-ms)/1000),id:null};
 if(ms<b.highlightsStartMs)return {kind:'race' as const,remaining:0,id:null};
 if(ms<b.officialStartMs)return {kind:'spotlight' as const,remaining:0,id:b.finisherIds[Math.min(b.finisherIds.length-1,Math.floor((ms-b.highlightsStartMs)/5000))]??null};
 return {kind:'official' as const,remaining:0,id:null};
}
export function preshowCamera(m:Meeting,ms:number):CameraCue{
 const b=m.raceBroadcast!,local=Math.max(0,ms-b.preshowStartMs),duration=m.raceStartMs-b.preshowStartMs;
 if(ms>=b.countdownStartMs)return {atMs:ms,racerId:m.race.grid[0],shot:'wide',reason:'START LIGHTS'};
 const part=local/duration;
 if(part<.3)return {atMs:ms,racerId:m.race.grid[0],shot:'wide',reason:part<.15?'CIRCUIT TOUR':'SHORTCUT TOUR'};
 const index=Math.min(7,Math.floor((part-.3)/.6*8));
 return {atMs:ms,racerId:m.race.grid[index],shot:index%3===0?'front':index%3===1?'side':'chase',reason:`GRID P${index+1}`};
}
/** Virtual-clock contract only: a local manual gate can never postpone these deadlines. */
export function scheduledBroadcast(kstDate:string,now:number,preshowSeconds:60|90|120){
 const s=regularSchedule(kstDate),start=s.race-preshowSeconds*1000;
 return {...s,preshow:start,countdown:s.race-5000,predictionsOpen:now<s.cutoff,
  phase:now>=s.race?'race':now>=s.race-5000?'countdown':now>=start?'preshow':now>=s.qualifying?'qualifying':'waiting',
  overrideManualHold:now>=start};
}
