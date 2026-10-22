import {CONFIG, RACERS, SIMULATOR_VERSION} from './config';
import {qualifying,randomStream} from './prng';
import {decisions,motion} from './events';
import type {State,Emit} from './events';
import type {RaceRecord,RaceEvent,Frame} from './types';

function freeze<T>(value:T):T {
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    for(const child of Object.values(value))freeze(child);
    Object.freeze(value);
  }
  return value;
}
function order(a:State,b:State){
  const category=(s:State)=>s.status==='FINISHED'?0:s.status==='RACING'?1:s.status==='DNF'?2:3;
  return category(a)-category(b)||
    (a.finishMs!==null&&b.finishMs!==null?a.finishMs-b.finishMs:b.progress-a.progress)||a.grid-b.grid;
}

/** The only public authoritative generator: no odds, popularity, winner or grid overrides. */
export function simulateRace(seed:string,version:string=SIMULATOR_VERSION):RaceRecord {
  return run(seed,version,true);
}
/** Offline statistics only. Same RNG path/results/events; avoids allocating replay frames. */
export function simulateSummary(seed:string,version:string=SIMULATOR_VERSION):RaceRecord {
  return run(seed,version,false);
}
function run(seed:string,version:string,capture:boolean):RaceRecord {
  if(typeof seed!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(seed))throw Error('INVALID_RACE_SEED');
  if(version!==SIMULATOR_VERSION)throw Error('UNSUPPORTED_SIMULATOR_VERSION');
  const c=CONFIG,grid=qualifying(seed,version,RACERS.map(r=>r.id));
  const states:State[]=RACERS.map(r=>({id:r.id,grid:grid.indexOf(r.id)+1,
    progress:0-grid.indexOf(r.id)*c.gridGap,rank:grid.indexOf(r.id)+1,speed:0,status:'RACING',finishMs:null,
    damage:0,stopUntil:0,slowUntil:0,boostUntil:0,ultimateUntil:0,ultimatePower:1000,
    ultimateUsed:false,slip:false,stopKind:'STOPPED',random:randomStream(seed,`${version}:race:${r.id}`)}));
  const events:RaceEvent[]=[],frames:Frame[]=[];
  let tick=0,eliminations=0,previousLeader=grid[0];
  const emit:Emit=(s,kind,duration=0,power=0)=>{
    if(events.length>=c.maxEvents)throw Error('EVENT_BOUND_EXCEEDED');
    events.push({tick,racerId:s.id,kind,rank:s.rank,durationTicks:duration,power});
  };
  const rank=()=>{const sorted=[...states].sort(order);sorted.forEach((s,i)=>s.rank=i+1);return sorted;};
  const snapshot=()=>{
    if(capture)frames.push({tick,racers:states.map(s=>({id:s.id,progress:s.progress,rank:s.rank,
      speed:s.speed,status:s.status,motion:motion(s,tick),damage:s.damage,ultimate:tick<s.ultimateUntil&&s.status==='RACING'}))});
  };
  const retire=(s:State,status:'DNF'|'DSQ')=>{
    if(eliminations>=c.maxEliminations)return false;
    eliminations++;s.status=status;s.speed=0;emit(s,status);return true;
  };
  states.forEach(s=>emit(s,'START'));snapshot();
  for(tick=1;tick<=c.maxTicks;tick++){
    // Evaluate proximity from ONE shared pre-step snapshot, not iteration order.
    const sorted=rank();
    const before=new Map(states.map(s=>[s.id,s.progress]));
    const drafting=new Set(sorted.filter((s,i)=>i>0&&s.status==='RACING'&&sorted[i-1].status==='RACING'&&
      sorted[i-1].progress-s.progress<=c.slipstreamGap&&tick>=s.stopUntil).map(s=>s.id));
    // Rotate cap-priority each decision, preventing a fixed racer-ID advantage.
    const offset=Math.floor(tick/c.decisionTicks)%8;
    const iteration=[...states.slice(offset),...states.slice(0,offset)];
    for(const s of iteration){
      if(s.status!=='RACING')continue;
      if(tick===s.stopUntil&&s.stopKind==='PIT')s.damage=0;
      if(tick%c.decisionTicks===0){
        const slip=drafting.has(s.id);
        if(slip&&!s.slip)emit(s,'SLIPSTREAM',c.decisionTicks,c.slipstreamPower);
        s.slip=slip;decisions(s,tick,c,emit,retire);
      }
      if(s.status!=='RACING')continue;
      if(tick<s.stopUntil){s.speed=0;continue;}
      const variation=965+Math.floor(s.random()*71);
      const power=tick<s.ultimateUntil?s.ultimatePower:tick<s.boostUntil?1200:s.slip?c.slipstreamPower:1000;
      const slow=tick<s.slowUntil?650:1000;
      const step=Math.max(1,Math.floor(c.baseStep*variation/1000*power/1000*slow/1000*(1000-s.damage)/1000));
      s.progress+=step;s.speed=Math.round(step*1000/c.tickMs); // cm/s
      if(s.progress>=c.track.length){
        const prior=before.get(s.id)!;
        const fraction=(c.track.length-prior)/(s.progress-prior);
        s.finishMs=(tick-1)*c.tickMs+Math.max(1,Math.round(fraction*c.tickMs));
        s.progress=c.track.length;s.status='FINISHED';s.speed=0;
      }
    }
    const now=rank();
    for(const s of now)if(s.status==='FINISHED'&&s.finishMs!>(tick-1)*c.tickMs)emit(s,'FINISH');
    if(now[0].id!==previousLeader){emit(now[0],'LEAD');previousLeader=now[0].id;}
    snapshot();
    if(states.every(s=>s.status!=='RACING'))break;
  }
  if(tick>c.maxTicks)throw Error('SIMULATION_BOUND_EXCEEDED');
  const results=rank().map(s=>({id:s.id,position:s.rank,grid:s.grid,status:s.status,
    finishMs:s.finishMs,progress:s.progress,ultimateUsed:s.ultimateUsed}));
  return freeze({raceId:`${version}:${seed}`,seed,simulatorVersion:version,config:c,racers:RACERS,grid,
    durationTicks:tick,events,frames,results});
}
