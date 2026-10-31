import {CONFIG_V2} from '../v2/config';
import type {RaceConfig} from '../types';

/** New simulator contract; v0.1 and v0.2 remain available for historical replays. */
export const VERSION_V3='galactic-racing-0.3.0';
export const CONFIG_V3:RaceConfig=Object.freeze({
  ...CONFIG_V2,
  version:VERSION_V3,
  noPitStops:true,
  externalChance:0.006,
});
