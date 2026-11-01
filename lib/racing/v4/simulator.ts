import {integrateRace} from '../integrator';
import {CONFIG_V4,VERSION_V4} from './config';
import {finishMeeting} from '../v2/meeting';
import {runQualifying} from '../v2/qualifying';
import {directRaceV4} from './camera';
import type {Meeting} from '../v2/types';

export {CONFIG_V4,VERSION_V4};
/** Same deterministic meeting contract; v0.4 retains pit-free racing but favors recovery and overtakes. */
export function simulateMeetingV4(seed:string,capture=true):Meeting {
  if(typeof seed!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(seed))throw Error('INVALID_RACE_SEED');
  const qualifying=runQualifying(seed,capture,CONFIG_V4,VERSION_V4);
  const grid=qualifying.standings.map(r=>r.id);
  const race=integrateRace(seed,CONFIG_V4,grid,capture);
  if(race.events.some(e=>e.kind==='PIT')||race.frames.some(f=>f.racers.some(r=>r.motion==='PIT')))
    throw Error('PIT_FORBIDDEN_V3');
  return finishMeeting(seed,VERSION_V4,qualifying,race,capture?directRaceV4(race):[]);
}
