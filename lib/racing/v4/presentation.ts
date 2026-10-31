import type {RaceRecord,RacerFrame} from '../types';

export interface FinishCoast {readonly finishMs:number;readonly speedCmPerSec:number}
export type FinishIndex=Readonly<Record<string,FinishCoast>>;

/** Presentation-only post-finish coasting. Never modifies the official results or frames. */
export function finishIndex(race:RaceRecord):FinishIndex{
  const output:Record<string,FinishCoast>={};
  if(!race.frames.length)return output;
  for(const result of race.results){
    if(result.status!=='FINISHED'||result.finishMs===null)continue;
    let speed=0;
    const finalTick=Math.min(race.frames.length-1,Math.ceil(result.finishMs/race.config.tickMs));
    for(let t=finalTick;t>=0;t--){
      const item=race.frames[t].racers.find(x=>x.id===result.id);
      if(item?.status==='RACING'&&item.speed>0){speed=item.speed;break;}
    }
    output[result.id]={finishMs:result.finishMs,speedCmPerSec:speed};
  }
  return output;
}
export function displayedProgress(race:RaceRecord,frame:RacerFrame,raceMs:number,finish:FinishIndex){
  const info=finish[frame.id];
  if(frame.status!=='FINISHED'||!info||raceMs<info.finishMs)return frame.progress;
  return race.config.track.length+Math.max(0,raceMs-info.finishMs)/1000*info.speedCmPerSec*.5;
}
export function displayedSpeed(frame:RacerFrame,raceMs:number,finish:FinishIndex){
  const info=finish[frame.id];
  if(frame.status==='FINISHED'&&info&&raceMs>=info.finishMs)return Math.round(info.speedCmPerSec*.5);
  return frame.speed;
}
