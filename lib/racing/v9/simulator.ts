import {PODIUM_NORMAL_MS,PODIUM_SPECIAL_MS} from './ceremony';
import {assembleMeeting} from '../v6/simulator';
import {raceSettings,type RaceSettings} from '../v6/config';
import {configV8} from '../v8/simulator';
import {ultimateDynamics,ULTIMATE_POLICY,type UltimatePolicy} from './ultimate';
export const VERSION_V9='galactic-racing-0.9.0';
export function configV9(input:Partial<RaceSettings>={}){return Object.freeze({...configV8(raceSettings(input)),version:VERSION_V9});}
export function simulateMeetingV9(seed:string,capture=true,input:Partial<RaceSettings>={},policy:UltimatePolicy=ULTIMATE_POLICY){
 const settings=raceSettings(input),config=configV9(settings),ultimate=ultimateDynamics(seed,config,policy);
 const meeting=assembleMeeting(seed,capture,settings,config,'d1',ultimate.dynamics);
 return Object.freeze({...meeting,durationMs:meeting.ceremonyStartMs+(meeting.specialDsq?PODIUM_SPECIAL_MS:PODIUM_NORMAL_MS),ultimates:Object.freeze(ultimate.activations)});
}
