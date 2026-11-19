import {RACERS} from '../config';
import {raceSettings} from '../v6/config';
export type Stage='qualifying'|'main';
export type Role='scheduler'|'generator'|'incident'|'viewer';
export type RaceState='SEALED'|'GENERATING'|'READY'|'RUNNING'|'PROVISIONAL'|'FINAL'|'QUARANTINED'|'CANCELLED';
export const SCORING='points-25-18-15-12-10-8-6-4-dsq-zero-v1';
export function mondaySchedule(monday:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(monday))throw Error('INVALID_MONDAY');
 const date=new Date(monday+'T00:00:00Z');
 if(!Number.isFinite(+date)||date.toISOString().slice(0,10)!==monday||date.getUTCDay()!==1)throw Error('INVALID_MONDAY');
 return Array.from({length:7},(_,i)=>{const day=+date+i*86400000;return Object.freeze({round:i+1,date:new Date(day).toISOString().slice(0,10),qualifyingAt:day+11*3600000,startsAt:day+12*3600000});});
}
export function roster(input:readonly typeof RACERS[number][]=RACERS){
 if(input.length!==8||new Set(input.map(x=>x.id)).size!==8||input.some((x,i)=>x.id!==RACERS[i].id||typeof x.name!=='string'||x.name.length<1||x.name.length>80))throw Error('INVALID_ROSTER');
 return input.map((x,i)=>Object.freeze({slot:i+1,id:x.id,name:x.name,vehicle:x.vehicle,color:x.color}));
}
export function settings(laps:number){return raceSettings({laps,preshowSeconds:120});}
export function authorize(actual:Role,required:Role){if(actual!==required)throw Error('FORBIDDEN');}
export function clock(value:number){if(!Number.isSafeInteger(value)||value<0)throw Error('INVALID_CLOCK');return value;}
