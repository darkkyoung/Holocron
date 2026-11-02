import type {Meeting} from '../v2/types';
export const PODIUM_NORMAL_MS=40000,PODIUM_SPECIAL_MS=84000;
/** One disclosure clock shared by 3D, HUD and official checkers. */
export function ceremonyState(m:Meeting,ms:number){
 const t=Math.max(0,ms-m.ceremonyStartMs),modern=!!m.ultimates,special=!!m.specialDsq;
 if(!modern)return {t,modern,cycle:t,stage:'legacy',rank:null as number|null,reveal:special&&t>=10000,evidence:special&&t>=14000,reclassified:special&&t>=20000,final:t>=(special?28000:10000),visibleRanks:[0,1,2],celebrate:false};
 const reveal=special&&t>=30000,reclassified=special&&t>=40000,final=t>=(special?74000:30000);
 const cycle=special&&t>=44000?t-44000:t;
 const investigation=special&&t>=30000&&t<44000;
 const stage=investigation?t<34000?'alert':t<40000?'evidence':'verdict':cycle<4000?'overview':cycle<9000?'third':cycle<14000?'second':cycle<19000?'first':cycle<24000?'winner':final?'final':'celebration';
 const rank=stage==='third'?2:stage==='second'?1:stage==='first'||stage==='winner'?0:null;
 const visibleRanks=investigation?[0,1,2]:cycle<4000?[]:cycle<9000?[2]:cycle<14000?[2,1]:[0,1,2];
 return {t,modern,cycle,stage,rank,reveal,evidence:reveal&&t>=34000,reclassified,final,visibleRanks,celebrate:!investigation&&cycle>=24000};
}
