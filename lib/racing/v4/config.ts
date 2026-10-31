import {CONFIG_V3} from '../v3/config';
import type {RaceConfig} from '../types';

// Version-gated softer incidents and stronger recoverable passing.
// Existing v0.1/v0.2/v0.3 RNG, golden records and durations remain untouched.
export const VERSION_V4='galactic-racing-0.4.0';
export const CONFIG_V4:RaceConfig=Object.freeze({
  ...CONFIG_V3,
  version:VERSION_V4,
  gentleIncidents:true,
  badChance:0.024,
  externalChance:0.003,
  goodChance:0.105,
  shortcutShare:0.14,
  shortcutSuccess:0.81,
  slipstreamPower:1080,
  boostPower:1250,
});
