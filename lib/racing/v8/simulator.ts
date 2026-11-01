import {assembleMeeting} from '../v6/simulator';
import {configV7} from '../v7/simulator';
import {raceSettings,type RaceSettings} from '../v6/config';
export const VERSION_V8='galactic-racing-0.8.0';
export {raceSettings} from '../v6/config';
export function configV8(settings:RaceSettings){return Object.freeze({...configV7(settings),version:VERSION_V8});}
/** Same main rules; measured qualifying now uses the main base speed and a new RNG namespace. */
export function simulateMeetingV8(seed:string,capture=true,input:Partial<RaceSettings>={}){
 const settings=raceSettings(input);return assembleMeeting(seed,capture,settings,configV8(settings),'d1');
}
