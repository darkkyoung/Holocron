import type {Meeting,CameraCue} from '../v2/types';
import type {RacerFrame} from '../types';
export function cooldown(m:Meeting,ms:number){
 if(!m.raceBroadcast?.presentation)return null;
 return m.qualifying.rounds?.find(r=>ms>=r.finishMs&&ms<r.resultEndMs)??null;
}
/** Finishers coast at half their own measured pace; no new lap samples are recorded. */
export function qualifyingCoast(m:Meeting,ms:number):RacerFrame[]{
 const round=cooldown(m,ms);if(!round)return [];
 return m.qualifying.runs.filter(r=>r.round===round.round).map(r=>({id:r.id,
  progress:m.qualifying.lapLength+(ms-r.finishMs)*m.qualifying.lapLength/r.lapMs*.5,
  rank:0,speed:m.qualifying.lapLength/r.lapMs*500,status:'RACING',motion:'CRUISE',damage:0,ultimate:false}));
}
export function productionCamera(m:Meeting,ms:number):CameraCue|null{
 if(!m.raceBroadcast?.presentation)return null;
 const round=cooldown(m,ms),b=m.raceBroadcast;
 if(round){const slot=Math.floor((ms-round.finishMs)/5000);return {atMs:round.finishMs+slot*5000,
  racerId:m.qualifying.runs.filter(r=>r.round===round.round)[slot%8].id,
  shot:slot%3===0?'front':slot%3===1?'side':'chase',reason:'QUALIFYING COOLDOWN'};}
 const end=m.raceStartMs+m.race.durationTicks*m.race.config.tickMs;
 if(ms>=end&&ms<b.highlightsStartMs){const slot=Math.floor((ms-end)/5000);return {atMs:end+slot*5000,racerId:b.finisherIds[slot%b.finisherIds.length],shot:slot%2?'side':'chase',reason:'FINISH COAST'};}
 if(ms>=b.highlightsStartMs&&ms<b.officialStartMs){const slot=Math.floor((ms-b.highlightsStartMs)/5000);return {atMs:b.highlightsStartMs+slot*5000,racerId:b.finisherIds[slot],shot:slot===0?'front':slot===1?'side':'chase',reason:`PROVISIONAL P${slot+1}`};}
 return null;
}
/** DNF only: opacity from recorded time, not a DOM animation or playback history. */
export function retirementStyle(m:Meeting,id:string,ms:number){
 const e=m.race.events.find(e=>e.kind==='DNF'&&e.racerId===id),age=e?ms-m.raceStartMs-e.tick*m.race.config.tickMs:-1;
 if(age<0)return null;return {flash:age<1000?1:Math.max(0,1-(age-1000)/700),retired:true};
}
