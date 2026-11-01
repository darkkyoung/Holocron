import {integrateRace} from '../integrator';
import {CONFIG_V4} from '../v4/config';
import {directRaceV4} from '../v4/camera';
import {runQualifying} from '../v2/qualifying';
import {finishMeeting} from '../v2/meeting';
import {shortcutTravel} from './shortcut';
import {directQualifying} from './qualifying';
import type {RaceConfig} from '../types';
import type {Meeting} from '../v2/types';
export const VERSION_V5='galactic-racing-0.5.0';
export const CONFIG_V5:RaceConfig=Object.freeze({...CONFIG_V4,version:VERSION_V5,shortcutShare:0,
 track:Object.freeze({...CONFIG_V4.track,id:'vesper-branch-v5',name:'베스퍼 분기 서킷'})});
export function simulateMeetingV5(seed:string,capture=true,shortcut=true):Meeting{
 if(typeof seed!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(seed))throw Error('INVALID_RACE_SEED');
 const config=shortcut?CONFIG_V5:{...CONFIG_V5,track:{...CONFIG_V5.track,id:'vesper-main-v5',name:'베스퍼 본선 서킷'}};
 const qualifying=runQualifying(seed,capture,config,VERSION_V5,{preshowMs:10000,resultMs:12000,gridMs:10000});
 const grid=qualifying.standings.map(r=>r.id);
 const travel=shortcutTravel(seed,VERSION_V5,config.track.length/config.track.laps,config.track.laps,config.tickMs,shortcut);
 const race=integrateRace(seed,config,grid,capture,travel);
 const meeting=finishMeeting(seed,VERSION_V5,qualifying,race,capture?directRaceV4(race):[],0);
 return Object.freeze({...meeting,shortcutPassages:Object.freeze(travel.passages.map(p=>Object.freeze(p))),
  qualifyingCameras:Object.freeze(capture?directQualifying(qualifying,grid):[])});
}
