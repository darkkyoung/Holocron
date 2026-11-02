import {ceremonyState} from '../../lib/racing/v9/ceremony';
import type {Meeting} from '../../lib/racing/v2/types';
export function CeremonyHud({meeting:m,ms,name,below=false}:{meeting:Meeting;ms:number;name:(id:string)=>string;below?:boolean}){
 const state=ceremonyState(m,ms),investigation=state.modern?['alert','evidence','verdict'].includes(state.stage):state.reveal&&!state.final;
 const rows=(state.reclassified||state.final?m.official:m.race.results).filter(r=>r.status==='FINISHED').slice(0,3);
 const labels:Record<string,string>={overview:'포디엄 · 잠정 순위',third:'3위 등장',second:'2위 등장',first:'우승자 등장',winner:state.reclassified?'공식 우승자':'잠정 우승자',celebration:'포디엄을 축하합니다'};
 const heading=state.final?'최종 시상식':investigation?state.reclassified?'DSQ · 공식 순위 수정':'! 경기 조사':state.modern?labels[state.stage]??'최종 재시상식':'잠정 시상식';
 return <section className={below?'mobile-ceremony '+(investigation?'warning':''):'ceremony-card '+(state.modern?'modern-podium ':'')+(investigation?'alert':'')} role="status" data-stage={state.stage}>
  <small>{investigation?'RACE CONTROL · '+(state.reclassified?'RECLASSIFICATION':'INVESTIGATION'):state.final||state.reclassified?'OFFICIAL PODIUM':'PROVISIONAL PODIUM'}</small><h2>{heading}</h2>
  {investigation&&m.specialDsq?<><p><strong>{name(m.specialDsq.id)}</strong> · {m.specialDsq.reason}</p>{state.evidence&&<p className="evidence">{m.specialDsq.evidence}</p>}</>:<p>{rows.map((r,i)=>(i+1)+'위 '+name(r.id)).join(' · ')}</p>}
  {!state.reclassified&&!state.final&&<span>검수 전 순위 · 최종 결과와 다를 수 있습니다</span>}
 </section>;
}
