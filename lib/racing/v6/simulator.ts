import {lapRecorder} from './lap-times';
import {integrateRace} from '../integrator';
import {runQualifying} from '../v2/qualifying';
import {finishMeeting} from '../v2/meeting';
import {shortcutTravel} from '../v5/shortcut';
import {directQualifying} from '../v5/qualifying';
import {directRaceV4} from '../v4/camera';
import {raceSettings,configV6,VERSION_V6,type RaceSettings} from './config';
import type {Meeting} from '../v2/types';
export {raceSettings,configV6,VERSION_V6} from './config';
export function simulateMeetingV6(seed:string,capture=true,input:Partial<RaceSettings>={}):Meeting{
 const settings=raceSettings(input),config=configV6(settings);
 // Keep the established three-round qualifying pace/format; higher speed is main race only.
 const qualifying=runQualifying(seed,capture,{...config,baseStep:config.baseStep/2},VERSION_V6,{preshowMs:10000,resultMs:12000,gridMs:10000});
 const grid=qualifying.standings.map(r=>r.id);
 const travel=shortcutTravel(seed,VERSION_V6,360000,settings.laps,config.tickMs,true,config.routeOffset);
 const timing=lapRecorder(travel,360000,settings.laps,config.tickMs);
 const integrated=integrateRace(seed,config,grid,capture,timing);
 const race=Object.freeze({...integrated,raceId:integrated.raceId+':'+settings.laps+'laps'});
 const base=finishMeeting(seed,VERSION_V6,qualifying,race,capture?directRaceV4(race):[],settings.preshowSeconds*1000);
 const highlightsStartMs=base.raceStartMs+race.durationTicks*config.tickMs+8000;
 const finisherIds=Object.freeze(race.results.filter(r=>r.status==='FINISHED').map(r=>r.id));
 const officialStartMs=highlightsStartMs+5000*finisherIds.length,ceremonyStartMs=officialStartMs+8000;
 const raceBroadcast=Object.freeze({preshowStartMs:qualifying.durationMs,countdownStartMs:base.raceStartMs-5000,highlightsStartMs,officialStartMs,finisherIds});
 return Object.freeze({...base,raceSettings:settings,raceLaps:Object.freeze(timing.records),raceBroadcast,ceremonyStartMs,durationMs:ceremonyStartMs+(base.specialDsq?40000:20000),
  shortcutPassages:Object.freeze(travel.passages.map(p=>Object.freeze(p))),
  qualifyingCameras:Object.freeze(capture?directQualifying(qualifying,grid):[])});
}
