import type {RaceRecord,Result} from '../types';
export type QualifyingIncident='GLITCH'|'WALL'|'OFF_TRACK'|'INVALID';
export interface QualifyingRun {
  readonly id:string; readonly round:number; readonly startMs:number; readonly finishMs:number;
  readonly lapMs:number; readonly valid:boolean;
  readonly incident:{kind:QualifyingIncident;atMs:number;durationMs:number}|null;
  readonly samples:readonly {ms:number;progress:number}[];
}
export interface QualifyingRecord {
  readonly runs:readonly QualifyingRun[]; readonly durationMs:number; readonly lapLength:number;
  readonly standings:readonly {id:string;bestMs:number|null;grid:number}[];
}
export interface CameraCue {readonly atMs:number; readonly racerId:string;readonly shot:'chase'|'side'|'front'|'wide';readonly reason:string}
export interface Meeting {
  readonly version:string; readonly qualifying:QualifyingRecord; readonly race:RaceRecord;
  readonly specialDsq:{readonly id:string;readonly reason:string;readonly evidence:string}|null;
  readonly official:readonly (Result&{readonly points:number;readonly specialDsq:boolean})[];
  readonly cameras:readonly CameraCue[]; readonly raceStartMs:number;readonly ceremonyStartMs:number; readonly durationMs:number;
}
