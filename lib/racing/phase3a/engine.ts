import {configV14,VERSION_V14} from '../v14/simulator';
import {runQualifying} from '../v2/qualifying';
import {assembleWormholeMeeting} from '../v10/simulator';
import {LAUNCH_V14,PHANTOM_POLICY,FREQUENCY_V14} from '../v14/ultimate';
import {settings,SCORING} from './domain';
import {canonical,digest} from './crypto';
import {MAIN_SAMPLES} from '../v5/track-samples';
import {BRANCH_SAMPLES,BRANCH_ENTRY,BRANCH_EXIT} from '../v5/track';
import {FINAL_WINDOWS} from '../v13/ultimate';
import type {QualifyingRecord} from '../v2/types';
export const ENGINE_VERSION=VERSION_V14;
export async function descriptor(laps:number){const s=settings(laps),config=configV14(s);return {version:ENGINE_VERSION,contract:'phase3a-separated-entropy-v1',configHash:await digest(canonical({config,launch:LAUNCH_V14.policy,frequency:FREQUENCY_V14,windows:FINAL_WINDOWS,hyper:PHANTOM_POLICY,scoring:SCORING})),trackHash:await digest(canonical({track:config.track,mainSamples:MAIN_SAMPLES,branchSamples:BRANCH_SAMPLES,branchEntry:BRANCH_ENTRY,branchExit:BRANCH_EXIT,routeOffset:config.routeOffset,sections:config.sections})),laps};}
export function qualify(seed:string,laps:number){const c=configV14(settings(laps));return runQualifying(seed,true,c,ENGINE_VERSION,{preshowMs:10000,resultMs:15000,gridMs:10000,incidentTimeScale:.5});}
export function main(seed:string,laps:number,q:QualifyingRecord){
 if(q.standings.length!==8||new Set(q.standings.map(x=>x.id)).size!==8||q.standings.some((x,i)=>x.grid!==i+1))throw Error('INVALID_GRID');
 return assembleWormholeMeeting(seed,true,settings(laps),configV14(settings(laps)),LAUNCH_V14,PHANTOM_POLICY,q);
}
