import type {RaceRecord} from '../types';
import type {CameraCue} from '../v2/types';
import {directRace} from '../v2/camera';

// Presentation-only direction. Gran Turismo's detailed proprietary algorithms
// are NOT replicated. Three simple on-track angles and deterministic finish shots.
export function directRaceV4(race:RaceRecord):CameraCue[]{
  const baseline=directRace(race);
  const finishers=race.results.filter(r=>r.finishMs!==null&&r.status==='FINISHED')
    .sort((a,b)=>a.finishMs!-b.finishMs!);
  const windows=finishers.map(r=>({
    atMs:Math.max(0,r.finishMs!-3500),
    endMs:r.finishMs!+700,
    racerId:r.id,
  }));
  const ordinary=baseline.filter(cue=>
    !windows.some(w=>cue.atMs>=w.atMs&&cue.atMs<w.endMs)).map((cue,i)=>({
      ...cue,shot:(cue.shot==='wide'?'wide':
        cue.reason==='ULTIMATE'?'front':
        i%4===1?'front':i%3===0?'side':'chase') as CameraCue['shot'],
    }));
  const arrivals:CameraCue[]=windows.map((w,i)=>({
    atMs:w.atMs,racerId:w.racerId,shot:'front',
    reason:i===0?'WINNER FINISH CAMERA':`FINISH P${i+1}`,
  }));
  return [...ordinary,...arrivals].sort((a,b)=>a.atMs-b.atMs||
    (a.reason.startsWith('FINISH')||a.reason.startsWith('WINNER')?-1:1));
}
