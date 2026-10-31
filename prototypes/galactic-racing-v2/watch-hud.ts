import type {Meeting} from '../../lib/racing/v2/types';
import type {RacerFrame} from '../../lib/racing/types';

export type HudPhase='qualifying'|'grid'|'race'|'ceremony';

export function lapIndicator(
  meeting:Meeting,phase:HudPhase,ms:number,
  racers:readonly RacerFrame[],manual:string|null,
){
  if(phase==='qualifying'){
    // Qualifying is pipelined, so completed attempts / 8 is not the current round.
    const started=meeting.qualifying.runs.filter(run=>run.startMs<=ms);
    const round=Math.max(1,...started.map(run=>run.round));
    return {label:'QUALIFYING',value:'R'+round+' / 3',description:'퀄리파잉 '+round+'라운드'};
  }
  if(phase==='grid')return {label:'GRID',value:'P1–P8',description:'스타팅 그리드'};
  if(phase==='ceremony')return {label:'RACE FINISHED',value:'3 / 3',description:'본경기 완주'};
  const focus=manual?racers.find(r=>r.id===manual):undefined;
  const leader=[...racers].sort((a,b)=>a.rank-b.rank)[0];
  const racer=focus??leader;
  if(!racer)return {label:'LAP',value:'1 / '+meeting.race.config.track.laps,description:'현재 랩 1'};
  const laps=meeting.race.config.track.laps;
  const lapLength=meeting.race.config.track.length/laps;
  // Finishers are always on the last lap; negative initial grid offsets are lap 1.
  const lap=racer.status==='FINISHED'?laps:Math.min(laps,Math.max(1,Math.floor(Math.max(0,racer.progress)/lapLength)+1));
  return {label:manual?'TRACKED LAP':'LEADER LAP',value:lap+' / '+laps,
    description:(manual?'추적 레이서':'선두 레이서')+' 현재 '+lap+'랩 / 전체 '+laps+'랩'};
}
