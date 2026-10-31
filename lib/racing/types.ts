export type RacerStatus = 'RACING' | 'FINISHED' | 'DNF' | 'DSQ';
export type EventKind = 'START' | 'SLIPSTREAM' | 'BOOST' | 'SHORTCUT' | 'SHORTCUT_FAIL' |
  'MINOR' | 'MEDIUM' | 'MAJOR' | 'PIT' | 'PENALTY' | 'DNF' | 'DSQ' | 'ULTIMATE' | 'LEAD' | 'FINISH';
export type Motion = 'CRUISE' | 'SLIPSTREAM' | 'BOOST' | 'ULTIMATE' | 'DAMAGED' | 'PIT' | 'PENALTY' | 'STOPPED';
export interface Racer { readonly id: string; readonly name: string; readonly vehicle: string; readonly color: string }
export interface RaceEvent {
  readonly tick: number; readonly racerId: string; readonly kind: EventKind;
  readonly rank: number; readonly durationTicks: number; readonly power: number;
}
export interface RacerFrame {
  readonly id: string; readonly progress: number; readonly rank: number;
  readonly speed: number; readonly status: RacerStatus; readonly motion: Motion;
  readonly damage: number; readonly ultimate: boolean;
}
export interface Frame { readonly tick: number; readonly racers: readonly RacerFrame[] }
export interface Result {
  readonly id: string; readonly position: number; readonly grid: number; readonly status: RacerStatus;
  readonly finishMs: number | null; readonly progress: number; readonly ultimateUsed: boolean;
}
export interface RaceRecord {
  readonly raceId: string; readonly seed: string; readonly simulatorVersion: string;
  readonly config: RaceConfig; readonly racers: readonly Racer[]; readonly grid: readonly string[];
  readonly durationTicks: number; readonly events: readonly RaceEvent[];
  readonly frames: readonly Frame[]; readonly results: readonly Result[];
}
export interface RaceConfig {
  readonly sections?: readonly {readonly end:number; readonly pace:number; readonly label:string}[];
  readonly version: string; readonly track: { readonly id: string; readonly name: string; readonly length: number; readonly laps: number };
  readonly tickMs: number; readonly maxTicks: number; readonly maxEvents: number; readonly decisionTicks: number;
  readonly baseStep: number; readonly gridGap: number; readonly maxEliminations: number;
  readonly slipstreamGap: number; readonly slipstreamPower: number;
  readonly goodChance: number; readonly badChance: number; readonly shortcutShare: number; readonly shortcutSuccess: number;
  readonly minorShare: number; readonly mediumShare: number; readonly dnfShare: number; readonly dsqShare: number;
  readonly ultimateBase: number; readonly ultimateRankBonus: number;
  readonly ordinaryResistance: number; readonly majorResistance: number;
}
