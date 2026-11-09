import {assembleWormholeMeeting} from '../v10/simulator';
import {configV12} from '../v12/simulator';
import {raceSettings,type RaceSettings} from '../v6/config';
import {LAUNCH_V13,PHANTOM_POLICY} from './ultimate';
export const VERSION_V13='galactic-racing-0.13.0';
export function configV13(input:Partial<RaceSettings>={}){return Object.freeze({...configV12(input),version:VERSION_V13});}
export function simulateMeetingV13(seed:string,capture=true,input:Partial<RaceSettings>={}){
 const settings=raceSettings(input);return assembleWormholeMeeting(seed,capture,settings,configV13(settings),LAUNCH_V13,PHANTOM_POLICY);
}
