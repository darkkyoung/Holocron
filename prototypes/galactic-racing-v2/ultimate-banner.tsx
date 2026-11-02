import type {Meeting} from '../../lib/racing/v2/types';
import type {RacerFrame} from '../../lib/racing/types';
export function UltimateBanner({meeting,ms,racers}:{meeting:Meeting;ms:number;racers:readonly RacerFrame[]}){
 const elapsed=ms-meeting.raceStartMs,a=meeting.ultimates?.find(a=>elapsed>=a.startTick*250&&elapsed<a.endTick*250);
 if(!a)return null;const racer=racers.find(r=>r.id===a.id);if(!racer||racer.status!=='RACING')return null;
 const gain=Math.max(0,a.rankBefore-racer.rank),launch=elapsed-a.startTick*250<3500;if(!launch&&!gain)return null;
 return <div className={'ultimate-banner '+a.type} role="status"><span>{a.type==='hyper'?'✧ HYPER':'✦ GOLD'} ULTIMATE</span><strong>{meeting.race.racers.find(r=>r.id===a.id)?.name}</strong><small>{gain?`P${a.rankBefore} → P${racer.rank} · ${gain}계단 상승`:'가속 시작'}</small></div>;
}
