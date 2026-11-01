import {randomStream} from '../prng';
import {POINTS} from './config';
import type {RaceRecord} from '../types';
import type {Meeting,QualifyingRecord,CameraCue} from './types';
function freeze<T>(value:T):T {
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export function finishMeeting(seed:string,version:string,qualifying:QualifyingRecord,race:RaceRecord,cameras:readonly CameraCue[],gridMs=10000):Meeting {
  const rng=randomStream(seed,`${version}:ceremony`);
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
  const raceStartMs=qualifying.durationMs+gridMs;
  const ceremonyStartMs=raceStartMs+race.durationTicks*race.config.tickMs+8000; // 8s of post-finish half-speed coast before the podium
  return freeze({
    version:version,qualifying,race,specialDsq,official,
    cameras,
    raceStartMs,ceremonyStartMs,durationMs:ceremonyStartMs+(specialDsq?40000:20000),
  });
}
