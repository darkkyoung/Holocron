import type {RaceConfig, Racer} from './types';

// Published version freezes both algorithm and these constants. Tuning requires a
// new version + new golden fixture, never silently rewriting an existing result.
export const SIMULATOR_VERSION = 'galactic-racing-0.1.0';
export const CONFIG: RaceConfig = Object.freeze({
  version: SIMULATOR_VERSION,
  track: Object.freeze({id: 'vesper-ring', name: '베스퍼 링', length: 720_000, laps: 3}), // centimetres
  tickMs: 250, maxTicks: 2400, maxEvents: 12000, decisionTicks: 8,
  baseStep: 1200, gridGap: 1600, maxEliminations: 2,
  slipstreamGap: 3200, slipstreamPower: 1060, // integer per-mille speed multipliers
  goodChance: 0.075, badChance: 0.055, shortcutShare: 0.22, shortcutSuccess: 0.76,
  minorShare: 0.62, mediumShare: 0.29, dnfShare: 0.10, dsqShare: 0.03,
  ultimateBase: 0.001, ultimateRankBonus: 0.005,
  ordinaryResistance: 0.65, majorResistance: 0.25,
});

// Original fictional roster; appearance is the ONLY racer-specific property.
export const RACERS: readonly Racer[] = Object.freeze([
  {id:'r1', name:'노바 렌', vehicle:'스파크핀', color:'#ffcf4a'},
  {id:'r2', name:'이오 베일', vehicle:'오비트 니들', color:'#59d9ec'},
  {id:'r3', name:'케스트', vehicle:'코멧 베인', color:'#ff8675'},
  {id:'r4', name:'미라 솔', vehicle:'루멘 윙', color:'#b3a0ff'},
  {id:'r5', name:'오린 벡', vehicle:'아이언 모스', color:'#8dddab'},
  {id:'r6', name:'탈라 킨', vehicle:'베일 스키퍼', color:'#e9a1cf'},
  {id:'r7', name:'루크스', vehicle:'펄스 크래들', color:'#86aaff'},
  {id:'r8', name:'세라 닉스', vehicle:'앰버 드리프트', color:'#e3b789'},
].map(r => Object.freeze(r)));
