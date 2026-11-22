import {routePoint} from '../v5/track';
export interface TracksideStation {readonly id:string;readonly label:string;readonly position:readonly [number,number,number]}
// Render-space positions derived from the same Hermite road as the cars. Inside
// bank avoids the outer canyon blocks; elevated lenses clear the low barriers.
export const TV_STATIONS:readonly TracksideStation[]=Object.freeze([
 ['finish','START / FINISH',.08,-50],['turn1','FIRST CORNER',.27,-65],
 ['straight','LONG STRAIGHT',.70,-48],['entry','BRANCH ENTRY',.20,-45],
 ['merge','BRANCH MERGE',.40,-48],['last','LAST CORNER',.92,-50],
].map(([id,label,u,offset])=>{const p={x:0,z:0},t={x:0,z:0};routePoint(Number(u),1,false,p,t);
 return Object.freeze({id:String(id),label:String(label),position:Object.freeze([p.x-t.z*Number(offset),32,p.z+t.x*Number(offset)]) as readonly [number,number,number]});}));
