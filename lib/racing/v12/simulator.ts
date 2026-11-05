import {assembleWormholeMeeting} from '../v10/simulator';
import type {HyperMotionPolicy} from '../v10/ultimate';
import {configV11} from '../v11/simulator';
import {raceSettings,type RaceSettings} from '../v6/config';
import {LAUNCH_V11,PHANTOM_POLICY} from './ultimate';
export const VERSION_V12='galactic-racing-0.12.0';
export function configV12(input:Partial<RaceSettings>={}){return Object.freeze({...configV11(input),version:VERSION_V12});}
/** Explicit policy override is for isolated offline pilot comparison only. */
export function simulateMeetingV12(seed:string,capture=true,input:Partial<RaceSettings>={},hyper:HyperMotionPolicy=PHANTOM_POLICY){
 const settings=raceSettings(input);return assembleWormholeMeeting(seed,capture,settings,configV12(settings),LAUNCH_V11,hyper);
}
