import {CONFIG_V5} from '../v5/simulator';
import type {RaceConfig} from '../types';
export const VERSION_V6='galactic-racing-0.6.0';
export interface RaceSettings {readonly laps:number;readonly preshowSeconds:60|90|120}
export const DEFAULT_SETTINGS:RaceSettings=Object.freeze({laps:10,preshowSeconds:120});
export function raceSettings(input:Partial<RaceSettings>={}):RaceSettings{
 const value={...DEFAULT_SETTINGS,...input};
 if(!Number.isInteger(value.laps)||value.laps<1||value.laps>30)throw Error('LAPS_MUST_BE_1_TO_30');
 if(![60,90,120].includes(value.preshowSeconds))throw Error('INVALID_PRESHOW');
 return Object.freeze(value);
}
export function configV6(settings:RaceSettings):RaceConfig{
 return Object.freeze({...CONFIG_V5,version:VERSION_V6,baseStep:CONFIG_V5.baseStep*2,
  routeOffset:.08,gridGap:2400,
  sections:Object.freeze([{end:.20,pace:1080,label:'START'},{end:.35,pace:850,label:'HAIRPIN'},{end:.57,pace:1000,label:'CANYON'},{end:.73,pace:900,label:'TECHNICAL'},{end:1,pace:1080,label:'FINAL'}]),gridLanes:Object.freeze([-6,6,-6,6,-6,6,-6,6]),
  maxTicks:settings.laps*1200,maxEvents:settings.laps*6000,
  track:Object.freeze({...CONFIG_V5.track,id:'vesper-branch-v6',length:360000*settings.laps,laps:settings.laps})});
}
