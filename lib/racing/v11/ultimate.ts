import {ULTIMATE_POLICY} from '../v9/ultimate';
import type {UltimateLaunchRule} from '../v10/ultimate';
/** Own cumulative distance, not leader lap. 95% is an exclusive launch cutoff. */
export const LATE_ULTIMATE_POLICY=Object.freeze({...ULTIMATE_POLICY,minProgress:.7,maxProgress:.95,minRemainingLaps:0});
export const LATE_WINDOWS=Object.freeze([
 Object.freeze({from:.7,to:.8,weight:.3}),
 Object.freeze({from:.8,to:.9,weight:1.6}),
 Object.freeze({from:.9,to:.95,weight:.65}),
]);
export const LAUNCH_V11:UltimateLaunchRule=Object.freeze({policy:LATE_ULTIMATE_POLICY,
 eligible:(p:number)=>Number.isFinite(p)&&p>=.7&&p<.95,
 weight:(p:number)=>LATE_WINDOWS.find(w=>p>=w.from&&p<w.to)?.weight??0,
 conditional:(rank:number,p:number)=>rank>=5&&p>=.7&&p<.95,
});
