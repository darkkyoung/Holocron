import {FINAL_LAP_POLICY,FINAL_WINDOWS} from '../v13/ultimate';
import type {UltimateLaunchRule} from '../v10/ultimate';
export {PHANTOM_POLICY} from '../v12/ultimate';

/** v14 changes launch odds and spacing only. Gold and Phantom motion are inherited. */
export const FREQUENCY_V14=Object.freeze({cooldownSeconds:10,firstChanceScale:3.2,secondChanceScale:1.6});
export function makeLaunchV14(frequency:typeof FREQUENCY_V14):UltimateLaunchRule{return Object.freeze({
 policy:Object.freeze({...FINAL_LAP_POLICY,cooldownSeconds:frequency.cooldownSeconds}),
 protectActiveFromDsq:true,
 eligible:(p:number)=>Number.isFinite(p)&&p>=.88&&p<.96,
 weight:(p:number)=>FINAL_WINDOWS.find(w=>p>=w.from&&p<w.to)?.weight??0,
 conditional:(rank:number,p:number)=>rank>=5&&p>=.88&&p<.96,
 firstChanceScale:frequency.firstChanceScale,
 secondChanceScale:frequency.secondChanceScale,
});}
export const LAUNCH_V14=makeLaunchV14(FREQUENCY_V14);
