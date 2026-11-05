import {lapRecorder} from './lap-times';
import {integrateRace,type RaceDynamics} from '../integrator';
import {runQualifying} from '../v2/qualifying';
import {finishMeeting} from '../v2/meeting';
import {shortcutTravel} from '../v5/shortcut';
import {directQualifying} from '../v5/qualifying';
import {directRaceV4} from '../v4/camera';
import {raceSettings,configV6,VERSION_V6,type RaceSettings} from './config';
import type {Meeting} from '../v2/types';
import type {RaceConfig} from '../types';
import type {RaceTravel} from '../travel';
export {raceSettings,configV6,VERSION_V6} from './config';
export function simulateMeetingV6(seed:string,capture=true,input:Partial<RaceSettings>={}):Meeting{
 const settings=raceSettings(input);
 return assembleMeeting(seed,capture,settings,configV6(settings));
}
/** Shared integration; explicit version/config preserves historical RNG and records. */
export function assembleMeeting(seed:string,capture:boolean,settings:RaceSettings,config:RaceConfig,production?:'c1'|'d1',dynamics?:RaceDynamics,wrapTravel?:(travel:ReturnType<typeof shortcutTravel>)=>RaceTravel):Meeting{
 const version=config.version;
 // Historical profiles retain half-speed qualifying and its original RNG namespace.
 const qualifying=runQualifying(seed,capture,{...config,baseStep:production==='d1'?config.baseStep:config.baseStep/2},production==='d1'?version:VERSION_V6,{preshowMs:10000,resultMs:production?15000:12000,gridMs:10000,...(production==='d1'?{incidentTimeScale:.5}:{})});
 const grid=qualifying.standings.map(r=>r.id);
 const travel=shortcutTravel(seed,version,360000,settings.laps,config.tickMs,true,config.routeOffset);
 const timing=lapRecorder(wrapTravel?wrapTravel(travel):travel,360000,settings.laps,config.tickMs);
 const integrated=integrateRace(seed,config,grid,capture,timing,dynamics);
 const race=Object.freeze({...integrated,raceId:integrated.raceId+':'+settings.laps+'laps'});
 const base=finishMeeting(seed,version,qualifying,race,capture?directRaceV4(race):[],settings.preshowSeconds*1000);
 const highlightsStartMs=base.raceStartMs+race.durationTicks*config.tickMs+(production?10000:8000);
 const finisherIds=Object.freeze(race.results.filter(r=>r.status==='FINISHED').slice(0,production?3:8).map(r=>r.id));
 const officialStartMs=highlightsStartMs+5000*finisherIds.length,ceremonyStartMs=officialStartMs+8000;
 const raceBroadcast=Object.freeze({...(production?{presentation:production}:{}),preshowStartMs:qualifying.durationMs,countdownStartMs:base.raceStartMs-5000,highlightsStartMs,officialStartMs,finisherIds});
 return Object.freeze({...base,raceSettings:settings,raceLaps:Object.freeze(timing.records),raceBroadcast,ceremonyStartMs,durationMs:ceremonyStartMs+(base.specialDsq?40000:20000),
  shortcutPassages:Object.freeze(travel.passages.map(p=>Object.freeze(p))),
  qualifyingCameras:Object.freeze(capture?directQualifying(qualifying,grid):[])});
}
