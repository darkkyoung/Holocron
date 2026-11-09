import {cinematicState,retirementAt} from '../../lib/racing/v13/presentation';
import type {Meeting} from '../../lib/racing/v2/types';
import type {RacerFrame} from '../../lib/racing/types';
import {wormholePhase} from '../../lib/racing/v10/presentation';
import {phantomPhase} from '../../lib/racing/v12/presentation';
export function UltimateBanner({meeting,ms,racers}:{meeting:Meeting;ms:number;racers:readonly RacerFrame[]}){
 const cinematic=cinematicState(meeting,ms),event=retirementAt(meeting,ms),active=cinematic??meeting.ultimates?.find(a=>ms>=meeting.raceStartMs+a.startTick*250&&ms<meeting.raceStartMs+a.endTick*250);
 const retired=event&&(!active||event.leader||event.id===active.id)?event:null;
 if(retired)return <div className="ultimate-banner" role="status"><span>{retired.leader?'LEADER RETIRES':'DNF'}</span><strong>{meeting.race.racers.find(r=>r.id===retired.id)?.name}</strong><small>DNF · 공식 리타이어</small></div>;
 if(cinematic){const labels={charge:'3초 에너지 충전',stabilizing:'경로 안정화',burst:'폭발적 가속',fade:'투명화',departure:'WARP · 이동 중',travel:'WARP · 추적 중',arrival:'WARP · 도착 대기',return:'재출현',follow:'추격 재개',failed:'WARP FAILED · 정상 주행'};
  const r=racers.find(r=>r.id===cinematic.id);
  return <div className="ultimate-banner hyper" role="status"><span>HYPER · {labels[cinematic.phase]}</span><strong>{meeting.race.racers.find(r=>r.id===cinematic.id)?.name}</strong><small>{cinematic.masked?'공식 경기 진행 중':cinematic.phase==='follow'&&r?`P${r.rank} · GAP 확인`:'PHANTOM WARP'}</small></div>;
 }
 const elapsed=ms-meeting.raceStartMs,a=meeting.ultimates?.find(a=>elapsed>=a.startTick*250&&elapsed<a.endTick*250);
 if(!a)return null;const racer=racers.find(r=>r.id===a.id);if(!racer||racer.status!=='RACING')return null;
 const gain=Math.max(0,a.rankBefore-racer.rank),launch=elapsed-a.startTick*250<3500;if(!launch&&!gain&&!meeting.wormholes)return null;
 const phantom=phantomPhase(meeting,ms,a.id),wormhole=wormholePhase(meeting,ms,a.id),label=phantom?({charging:'PHANTOM 충전',acceleration:'폭발적 가속',fade:'투명화',transit:'PHANTOM WARP',return:'재출현',afterburn:'추격 재개'} as const)[phantom.phase]:wormhole?({entry:'웜홀 진입',transit:'공간 도약',exit:'웜홀 탈출',afterburn:'추격 재개'} as const)[wormhole.phase]:null;
 return <div className={'ultimate-banner '+a.type} role="status"><span>{a.type==='hyper'?'✧ HYPER':'✦ GOLD'} ULTIMATE{label?' · '+label:''}</span><strong>{meeting.race.racers.find(r=>r.id===a.id)?.name}</strong><small>{gain?`P${a.rankBefore} → P${racer.rank} · ${gain}계단 상승`:'가속 시작'}</small></div>;
}
