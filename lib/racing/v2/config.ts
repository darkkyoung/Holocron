import {CONFIG} from '../config';
import type {RaceConfig} from '../types';
export const VERSION='galactic-racing-0.2.0';
export const CONFIG_V2:RaceConfig=Object.freeze({...CONFIG,version:VERSION,
  track:Object.freeze({id:'vesper-circuit',name:'베스퍼 서킷',length:1_080_000,laps:3}),
  gridGap:1200,
  sections:Object.freeze([
    {end:.28,pace:1080,label:'스타트 · 롱 스트레이트'},
    {end:.43,pace:850,label:'헤어핀'},
    {end:.65,pace:1000,label:'캐니언 · 장애물'},
    {end:.81,pace:900,label:'테크니컬 코너'},
    {end:1,pace:1080,label:'파이널 스트레이트'},
  ].map(x=>Object.freeze(x))),
});
export const POINTS=Object.freeze([25,18,15,12,10,8,6,4]);
