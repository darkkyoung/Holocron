import {ULTIMATE_POLICY} from '../v9/ultimate';
import type {UltimateLaunchRule} from '../v10/ultimate';
export {PHANTOM_POLICY} from '../v12/ultimate';
export const FINAL_LAP_POLICY=Object.freeze({...ULTIMATE_POLICY,minProgress:.88,maxProgress:.96,minRemainingLaps:0});
export const FINAL_WINDOWS=Object.freeze([{from:.88,to:.90,weight:.35},{from:.90,to:.94,weight:1.6},{from:.94,to:.96,weight:.65}].map(w=>Object.freeze(w)));
export const LAUNCH_V13:UltimateLaunchRule=Object.freeze({policy:FINAL_LAP_POLICY,protectActiveFromDsq:true,
 eligible:(p:number)=>Number.isFinite(p)&&p>=.88&&p<.96,
 weight:(p:number)=>FINAL_WINDOWS.find(w=>p>=w.from&&p<w.to)?.weight??0,
 conditional:(rank:number,p:number)=>rank>=5&&p>=.88&&p<.96,
});
