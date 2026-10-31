import {integrateRace} from '../integrator';
import {randomStream} from '../prng';
import {CONFIG_V2,VERSION,POINTS} from './config';
import {runQualifying} from './qualifying';
import {directRace} from './camera';
import type {Meeting} from './types';
export {VERSION,CONFIG_V2};
function freeze<T>(x:T):T {if(x&&typeof x==='object'&&!Object.isFrozen(x)){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
/** No override for grid, racer performance, winner or special DSQ. */
export function simulateMeeting(seed:string,capture=true):Meeting {
  if(typeof seed!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(seed))throw Error('INVALID_RACE_SEED');
  const qualifying=runQualifying(seed,capture),grid=qualifying.standings.map(x=>x.id);
  const race=integrateRace(seed,CONFIG_V2,grid,capture);
  const rng=randomStream(seed,`${VERSION}:ceremony`);
  const specialDsq=rng()<.01?{id:race.results[Math.floor(rng()*3)].id,reason:'규정 외 에너지 셀 사용',evidence:'봉인 검사 · 에너지 셀 규격 불일치 (임시 증거 그래픽)'}:null;
  const revised=[...race.results.filter(x=>x.id!==specialDsq?.id),...race.results.filter(x=>x.id===specialDsq?.id)];
  const official=revised.map((r,i)=>({...r,position:i+1,status:r.id===specialDsq?.id?'DSQ' as const:r.status,specialDsq:r.id===specialDsq?.id,points:r.id===specialDsq?.id||r.status!=='FINISHED'?0:POINTS[i]}));
  const raceStartMs=qualifying.durationMs+10000,ceremonyStartMs=raceStartMs+race.durationTicks*race.config.tickMs;
  return freeze({version:VERSION,qualifying,race,specialDsq,official,cameras:capture?directRace(race):[],raceStartMs,ceremonyStartMs,durationMs:ceremonyStartMs+(specialDsq?40000:20000)});
}
