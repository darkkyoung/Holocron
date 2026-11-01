import {assembleMeeting} from '../v6/simulator';
import {configV6,raceSettings,type RaceSettings} from '../v6/config';
export const VERSION_V7='galactic-racing-0.7.0';
export {raceSettings} from '../v6/config';
/** v0.6 rules, with an explicit 24m grid lead-in. Old records are never edited. */
export function configV7(settings:RaceSettings){return Object.freeze({...configV6(settings),version:VERSION_V7,gridLeadIn:2400});}
export function simulateMeetingV7(seed:string,capture=true,input:Partial<RaceSettings>={}){
 const settings=raceSettings(input);return assembleMeeting(seed,capture,settings,configV7(settings),'c1');
}
