import {integrateRace} from '../integrator';
import {randomStream} from '../prng';
import {CONFIG_V3,VERSION_V3} from './config';
import {POINTS} from '../v2/config';
import {runQualifying} from '../v2/qualifying';
import {directRace} from '../v2/camera';
import type {Meeting} from '../v2/types';

export {CONFIG_V3,VERSION_V3};
function freeze<T>(value:T):T {
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

/** Same deterministic meeting contract; v0.3 prohibits pit repairs and adds outside hazards. */
export function simulateMeetingV3(seed:string,capture=true):Meeting {
  if(typeof seed!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(seed))throw Error('INVALID_RACE_SEED');
  const qualifying=runQualifying(seed,capture,CONFIG_V3,VERSION_V3);
  const grid=qualifying.standings.map(r=>r.id);
  const race=integrateRace(seed,CONFIG_V3,grid,capture);
  if(race.events.some(e=>e.kind==='PIT')||race.frames.some(f=>f.racers.some(r=>r.motion==='PIT')))
    throw Error('PIT_FORBIDDEN_V3');
  const rng=randomStream(seed,`${VERSION_V3}:ceremony`);
  const specialDsq=rng()<.01?{
    id:race.results[Math.floor(rng()*3)].id,
    reason:'규정 외 에너지 셀 사용',
    evidence:'봉인 검사 · 에너지 셀 규격 불일치 (임시 증거 그래픽)',
  }:null;
  const revised=[...race.results.filter(r=>r.id!==specialDsq?.id),...race.results.filter(r=>r.id===specialDsq?.id)];
  const official=revised.map((r,i)=>({
    ...r,position:i+1,
    status:r.id===specialDsq?.id?'DSQ' as const:r.status,
    specialDsq:r.id===specialDsq?.id,
    points:r.id===specialDsq?.id||r.status!=='FINISHED'?0:POINTS[i],
  }));
  const raceStartMs=qualifying.durationMs+10000;
  const ceremonyStartMs=raceStartMs+race.durationTicks*race.config.tickMs;
  return freeze({
    version:VERSION_V3,qualifying,race,specialDsq,official,
    cameras:capture?directRace(race):[],
    raceStartMs,ceremonyStartMs,durationMs:ceremonyStartMs+(specialDsq?40000:20000),
  });
}
