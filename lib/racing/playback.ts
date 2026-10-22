import type {RaceRecord,RacerFrame} from './types';

/** Pure timeline lookup. No PRNG or simulation import, including on replay. */
export function playbackAt(race:RaceRecord,elapsedMs:number){
  const last=race.durationTicks,step=race.config.tickMs;
  const safe=Number.isFinite(elapsedMs)?Math.max(0,Math.min(elapsedMs,last*step)):0;
  const tick=Math.min(last,Math.floor(safe/step)),fraction=safe/step-tick;
  const frame=race.frames[tick];
  if(!frame)throw Error('REPLAY_TIMELINE_REQUIRED');
  const next=race.frames[Math.min(last,tick+1)];
  // Status/rank/events stay authoritative at recorded ticks; interpolation is
  // visual only and cannot reveal a finish or retirement before its frame.
  const racers:readonly RacerFrame[]=frame.racers.map((r,i)=>({...r,progress:
    r.status==='RACING'?r.progress+(next.racers[i].progress-r.progress)*fraction:r.progress}));
  return {tick,elapsedMs:safe,racers,finished:tick===last,events:race.events.filter(e=>e.tick<=tick)};
}
