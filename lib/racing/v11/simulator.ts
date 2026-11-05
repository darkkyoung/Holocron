import {assembleWormholeMeeting,configV10} from '../v10/simulator';
import {raceSettings,type RaceSettings} from '../v6/config';
import {LAUNCH_V11} from './ultimate';
export const VERSION_V11='galactic-racing-0.11.0';
export function configV11(input:Partial<RaceSettings>={}){return Object.freeze({...configV10(input),version:VERSION_V11});}
export function simulateMeetingV11(seed:string,capture=true,input:Partial<RaceSettings>={}){
 const settings=raceSettings(input);
 return assembleWormholeMeeting(seed,capture,settings,configV11(settings),LAUNCH_V11);
}
