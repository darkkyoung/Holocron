import {CONFIG, RACERS, SIMULATOR_VERSION} from './config';
import {qualifying} from './prng';
import {integrateRace} from './integrator';
import type {RaceRecord} from './types';

// Frozen v0.1 API: no caller-supplied grid/configuration. Golden verifies the shared integrator.
export function simulateRace(seed:string,version:string=SIMULATOR_VERSION):RaceRecord {return run(seed,version,true);}
export function simulateSummary(seed:string,version:string=SIMULATOR_VERSION):RaceRecord {return run(seed,version,false);}
function run(seed:string,version:string,capture:boolean):RaceRecord {
  if(typeof seed!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(seed))throw Error('INVALID_RACE_SEED');
  if(version!==SIMULATOR_VERSION)throw Error('UNSUPPORTED_SIMULATOR_VERSION');
  return integrateRace(seed,CONFIG,qualifying(seed,version,RACERS.map(r=>r.id)),capture);
}
