import type {State,Emit} from './events';
/** Explicit discontinuity, applied at the END of its tick, after ordinary travel. */
export interface ProgressJump {readonly id:string;readonly tick:number;readonly from:number;readonly to:number}
export type TravelStep=number|{readonly distance:number;readonly jump:ProgressJump};
export interface RaceTravel {advance:(state:State,tick:number,step:number,emit:Emit)=>TravelStep}
export function distanceOf(step:TravelStep){return typeof step==='number'?step:step.distance;}
export function crossingTime(prior:number,boundary:number,step:TravelStep,tick:number,tickMs:number){
 if(typeof step!=='number'&&boundary>step.jump.from)return tick*tickMs;
 const distance=typeof step==='number'?step:step.jump.from-prior;
 return (tick-1)*tickMs+Math.max(1,Math.round((boundary-prior)/distance*tickMs));
}
