import {assembleWormholeMeeting} from '../v10/simulator';
import {configV12} from '../v12/simulator';
import {raceSettings,type RaceSettings} from '../v6/config';
import {LAUNCH_V14,PHANTOM_POLICY} from './ultimate';
export const VERSION_V14='galactic-racing-0.14.0';
export function configV14(input:Partial<RaceSettings>={}){return Object.freeze({...configV12(input),version:VERSION_V14});}
export function simulateMeetingV14(seed:string,capture=true,input:Partial<RaceSettings>={}){
 const settings=raceSettings(input);return assembleWormholeMeeting(seed,capture,settings,configV14(settings),LAUNCH_V14,PHANTOM_POLICY);
}
