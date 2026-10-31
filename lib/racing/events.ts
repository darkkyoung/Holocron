import type {EventKind, Motion, RacerStatus, RaceConfig} from './types';

// Mutable integration state is private to a single simulation, never returned.
export interface State {
  id:string; grid:number; progress:number; rank:number; speed:number; status:RacerStatus;
  finishMs:number|null; damage:number; stopUntil:number; slowUntil:number; boostUntil:number;
  ultimateUntil:number; ultimatePower:number; ultimateUsed:boolean; slip:boolean;
  stopKind:'PIT'|'PENALTY'|'STOPPED'; random:()=>number;
}
export type Emit = (s:State, kind:EventKind, duration?:number, power?:number)=>void;
export function motion(s:State,tick:number):Motion {
  if(s.status!=='RACING')return 'STOPPED';
  if(tick<s.stopUntil)return s.stopKind;
  if(tick<s.ultimateUntil)return 'ULTIMATE';
  if(tick<s.slowUntil)return 'DAMAGED';
  if(tick<s.boostUntil)return 'BOOST';
  return s.slip?'SLIPSTREAM':'CRUISE';
}

export function decisions(s:State,tick:number,c:RaceConfig,emit:Emit,retire:(s:State,status:'DNF'|'DSQ')=>boolean) {
  const r=s.random, lower=(s.rank-1)/7;
  if(tick<s.stopUntil)return;
  // One activation maximum; eligibility and chance are rank-dependent, not a
  // forced trailing-racer victory. Major resistance is deliberately much lower.
  if(!s.ultimateUsed&&s.progress>c.track.length*.2&&s.progress<c.track.length*.9&&
      r()<c.ultimateBase+c.ultimateRankBonus*lower){
    const duration=12+Math.floor(r()*13);
    s.ultimateUsed=true;s.ultimateUntil=tick+duration;s.ultimatePower=1250+Math.floor(r()*301);
    emit(s,'ULTIMATE',duration,s.ultimatePower);
  }
  // v0.3 adds rare external hazards; legacy v0.1/v0.2 make no additional RNG draws.
  if(c.externalChance&&r()<c.externalChance){
    const kind=1+Math.floor(r()*3); // debris, magnetic pulse, outside interference
    const duration=c.gentleIncidents?4+Math.floor(r()*5):10+Math.floor(r()*11);
    if(!(tick<s.ultimateUntil&&r()<c.ordinaryResistance)){
      s.slowUntil=Math.max(s.slowUntil,tick+duration);
      s.damage=Math.min(c.noPitStops?12:60,s.damage+(c.gentleIncidents?1:3));
      emit(s,'EXTERNAL',duration,kind);
    }
    return;
  }
  if(r()<c.badChance){
    const tier=r(),kind=tier<c.minorShare?'MINOR':tier<c.minorShare+c.mediumShare?'MEDIUM':'MAJOR';
    if(tick<s.ultimateUntil&&r()<(kind==='MAJOR'?c.majorResistance:c.ordinaryResistance))return;
    if(kind==='MINOR'){
      s.slowUntil=tick+(c.gentleIncidents?2:4)+Math.floor(r()*(c.gentleIncidents?3:5));s.damage=Math.min(c.noPitStops?12:60,s.damage+(c.gentleIncidents?0:c.noPitStops?1:3));emit(s,kind,s.slowUntil-tick);
    }else if(kind==='MEDIUM'){
      s.damage=Math.min(c.noPitStops?12:60,s.damage+(c.gentleIncidents?2:c.noPitStops?5:15));s.slowUntil=tick+(c.gentleIncidents?8:16);
      s.stopUntil=tick+(c.gentleIncidents?2:4)+Math.floor(r()*(c.gentleIncidents?4:9));s.stopKind='STOPPED';emit(s,kind,s.stopUntil-tick);
      if(!c.noPitStops&&(s.damage>=40||r()<.22)){s.stopUntil=tick+24;s.stopKind='PIT';emit(s,'PIT',24);}
    }else major(s,tick,emit,retire,c);
    return;
  }
  if(r()<c.goodChance*(1+.12*lower)){
    if(r()<c.shortcutShare){
      if(r()<c.shortcutSuccess){const gain=5000+Math.floor(r()*7001);s.progress+=gain;emit(s,'SHORTCUT',0,gain);}
      else {emit(s,'SHORTCUT_FAIL');major(s,tick,emit,retire,c);}
    }else{s.boostUntil=tick+8+Math.floor(r()*9);emit(s,'BOOST',s.boostUntil-tick,c.boostPower??1200);}
  }
}

function major(s:State,tick:number,emit:Emit,retire:(s:State,status:'DNF'|'DSQ')=>boolean,c:RaceConfig){
  emit(s,'MAJOR',24);s.damage=Math.min(c.noPitStops?12:60,s.damage+(c.gentleIncidents?5:c.noPitStops?10:30));s.slowUntil=tick+(c.gentleIncidents?12:24);
  const outcome=s.random();
  if(outcome<c.dnfShare+c.dsqShare){
    if(retire(s,outcome<c.dnfShare?'DNF':'DSQ'))return;
    // Once the field cap is consumed, a severe outcome costs time instead.
  }
  s.stopUntil=tick+(c.gentleIncidents?6:16)+Math.floor(s.random()*(c.gentleIncidents?7:17));
  s.stopKind=c.noPitStops?'PENALTY':outcome<.45?'PENALTY':'PIT';emit(s,s.stopKind,s.stopUntil-tick);
}
