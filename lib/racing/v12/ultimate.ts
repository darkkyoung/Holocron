import type {HyperMotionPolicy} from '../v10/ultimate';
export {LAUNCH_V11,LATE_ULTIMATE_POLICY,LATE_WINDOWS} from '../v11/ultimate';
/** Candidate parameters are tuned on pilot Seeds only; frozen before audit. */
export const PHANTOM_POLICY:HyperMotionPolicy=Object.freeze({
 jumpFraction:[.20,.30] as const,entrySeconds:.75,exitSeconds:.25,
 afterburnPower:[2500,3000] as const,afterburnSeconds:5,maxEntrySeconds:8,phantomBurstPower:6000,
});
