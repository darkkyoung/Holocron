import type {RaceRecord} from '../types';
import type {CameraCue} from './types';

/** Presentation-only priorities. Season points never enter simulation or its seed. */
export function directRace(race:RaceRecord,seasonPoints:Readonly<Record<string,number>>={}):CameraCue[]{
  const cues:CameraCue[]=[];
  const contenders=Object.entries(seasonPoints).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);
  for(let atMs=0;atMs<=race.durationTicks*race.config.tickMs;atMs+=6000){
    const tick=Math.min(race.durationTicks,Math.floor(atMs/race.config.tickMs));
    const frame=race.frames[tick];if(!frame)continue;
    const leader=[...frame.racers].sort((a,b)=>a.rank-b.rank)[0];
    const recent=race.events.filter(e=>e.tick<=tick&&e.tick>tick-24);
    const priority:Record<string,number>={FINISH:100,ULTIMATE:90,MAJOR:85,DNF:85,DSQ:85,MEDIUM:75,PIT:70,LEAD:68,SLIPSTREAM:60,SHORTCUT:60,BOOST:40};
    const event=recent.filter(e=>priority[e.kind]).sort((a,b)=>(priority[b.kind]+(contenders.includes(b.racerId)?5:0))-(priority[a.kind]+(contenders.includes(a.racerId)?5:0))||b.tick-a.tick)[0];
    const finalStraight=leader.status==='RACING'&&leader.progress/race.config.track.length>.94;
    const racerId=event?.kind==='FINISH'?event.racerId:finalStraight?leader.id:event?.racerId??leader.id;
    cues.push({atMs,racerId,shot:atMs===0?'wide':finalStraight?'side':(cues.length%3===0?'side':'chase'),reason:finalStraight?'FINAL STRAIGHT':event?.kind??'LEAD BATTLE'});
  }
  return cues;
}
