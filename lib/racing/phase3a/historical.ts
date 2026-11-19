import {simulateRace} from '../simulator';
import {simulateMeeting} from '../v2/simulator';
import {simulateMeetingV3} from '../v3/simulator';
import {simulateMeetingV4} from '../v4/simulator';
import {simulateMeetingV5} from '../v5/simulator';
import {simulateMeetingV6} from '../v6/simulator';
import {simulateMeetingV7} from '../v7/simulator';
import {simulateMeetingV8} from '../v8/simulator';
import {simulateMeetingV9} from '../v9/simulator';
import {simulateMeetingV10} from '../v10/simulator';
import {simulateMeetingV11} from '../v11/simulator';
import {simulateMeetingV12} from '../v12/simulator';
import {simulateMeetingV13} from '../v13/simulator';
import {simulateMeetingV14} from '../v14/simulator';
// Offline historical verification only. New scheduled generation uses separated stages.
export function historicalReplay(version:string,seed:string){
 const registry:Record<string,(seed:string)=>unknown>={
  'galactic-racing-0.1.0':simulateRace,'galactic-racing-0.2.0':simulateMeeting,
  'galactic-racing-0.3.0':simulateMeetingV3,'galactic-racing-0.4.0':simulateMeetingV4,
  'galactic-racing-0.5.0':simulateMeetingV5,'galactic-racing-0.6.0':simulateMeetingV6,
  'galactic-racing-0.7.0':simulateMeetingV7,'galactic-racing-0.8.0':simulateMeetingV8,
  'galactic-racing-0.9.0':simulateMeetingV9,'galactic-racing-0.10.0':simulateMeetingV10,
  'galactic-racing-0.11.0':simulateMeetingV11,'galactic-racing-0.12.0':simulateMeetingV12,
  'galactic-racing-0.13.0':simulateMeetingV13,'galactic-racing-0.14.0':simulateMeetingV14,
 };
 if(!Object.hasOwn(registry,version))throw Error('UNSUPPORTED_SIMULATOR_VERSION');return registry[version](seed);
}
