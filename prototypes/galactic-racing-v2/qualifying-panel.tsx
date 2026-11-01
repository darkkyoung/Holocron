import type {Meeting} from '../../lib/racing/v2/types';
import {qualifyingRows,qualifyingStage} from '../../lib/racing/v5/qualifying';
export const lapText=(ms:number|null)=>ms===null||!Number.isFinite(ms)?'—':Math.floor(ms/60000)+':'+(ms%60000/1000).toFixed(3).padStart(6,'0');
export function QualifyingPanel({meeting,ms,className=''}:{meeting:Meeting;ms:number;className?:string}){
 const q=meeting.qualifying,stage=qualifyingStage(q,ms),rows=qualifyingRows(q,ms,meeting.race.racers.map(r=>r.id));
 if(stage.kind==='running'||(meeting.raceBroadcast?.presentation&&stage.kind==='result'&&ms-stage.startMs<3000))return null;
 const title=stage.kind==='preshow'?'퀄리파잉 프리쇼':stage.kind==='grid'?'최종 출발 그리드':`ROUND ${stage.round} 결과 발표`;
 return <section className={'qualifying-result '+(stage.kind==='preshow'?'qualifying-intro ':'')+className} data-stage={stage.kind} data-round={stage.round} aria-label={title}>
  <small>GALACTIC RACING · QUALIFYING</small><h2>{title}</h2>
  {stage.kind==='preshow'?<p>8명 · 3라운드 타임어택<br/>라운드별 기록 발표<br/>최고 기록으로 최종 P1–P8 결정</p>:<table><thead><tr><th>순위</th><th>선수</th><th>이번 기록</th><th>최고 기록</th></tr></thead><tbody>
   {rows.map((r,i)=><tr key={r.id}><td>{stage.kind==='grid'?'P':''}{i+1}</td><th>{meeting.race.racers.find(x=>x.id===r.id)?.name}</th><td>{r.valid===false?'무효':lapText(r.lapMs)}</td><td>{lapText(r.bestMs)}</td></tr>)}
  </tbody></table>}
  <p>{stage.kind==='grid'?'세 라운드의 최고 유효 기록으로 확정':stage.kind==='preshow'?'선수들은 일정 간격으로 중첩 출발합니다.':'기록 무효는 최고 기록에 포함되지 않습니다.'}</p>
 </section>;
}
