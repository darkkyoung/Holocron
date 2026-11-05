import type {State,Emit} from '../events';
import {distanceOf,crossingTime,type RaceTravel} from '../travel';
export interface LapTime {readonly id:string;readonly lap:number;readonly crossingMs:number;readonly lapMs:number}
/** Records crossing times from the same continuous step used by the official integrator. */
export function lapRecorder(travel:RaceTravel,lapLength:number,laps:number,tickMs:number){
 const records:LapTime[]=[],previous=new Map<string,number>();
 return {records,advance(state:State,tick:number,step:number,emit:Emit){
  const movement=travel.advance(state,tick,step,emit),distance=distanceOf(movement),next=state.progress+distance;
  const lap=Math.max(1,Math.floor(Math.max(0,state.progress)/lapLength)+1);
  if(lap<=laps&&state.progress<lap*lapLength&&next>=lap*lapLength){
   const crossingMs=crossingTime(state.progress,lap*lapLength,movement,tick,tickMs);
   records.push(Object.freeze({id:state.id,lap,crossingMs,lapMs:crossingMs-(previous.get(state.id)??0)}));previous.set(state.id,crossingMs);
  }
  return movement;
 }};
}
