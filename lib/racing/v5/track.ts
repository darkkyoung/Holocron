import {MAIN_SAMPLES} from './track-samples';
export interface Position {x:number;z:number}
export interface Passage {id:string;lap:number;rank:number;probability:number;success:boolean;entryMs:number;mergeMs:number|null;entryProgress:number;exitProgress:number}
export const BRANCH_ENTRY=.22,BRANCH_EXIT=.37;
function length(points:readonly Position[]){let n=0;for(let i=1;i<points.length;i++)n+=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z);return n;}
const main=MAIN_SAMPLES.map(([x,z])=>({x,z}));
function sample(points:readonly Position[],u:number,out:Position){const at=Math.max(0,Math.min(1,u))*(points.length-1),i=Math.min(points.length-2,Math.floor(at)),f=at-i;out.x=points[i].x+(points[i+1].x-points[i].x)*f;out.z=points[i].z+(points[i+1].z-points[i].z)*f;return out;}
const a=sample(main,BRANCH_ENTRY,{x:0,z:0}),b=sample(main,BRANCH_EXIT,{x:0,z:0});
const am=sample(main,BRANCH_ENTRY-.001,{x:0,z:0}),bp=sample(main,BRANCH_EXIT+.001,{x:0,z:0});
const ta={x:a.x-am.x,z:a.z-am.z},tb={x:bp.x-b.x,z:bp.z-b.z};
const la=Math.hypot(ta.x,ta.z),lb=Math.hypot(tb.x,tb.z),handle=65;
const controlA={x:a.x+ta.x/la*handle,z:a.z+ta.z/la*handle},controlB={x:b.x-tb.x/lb*handle,z:b.z-tb.z/lb*handle};
const raw=Array.from({length:401},(_,i)=>{const t=i/400,s=1-t;return {x:s*s*s*a.x+3*s*s*t*controlA.x+3*s*t*t*controlB.x+t*t*t*b.x,z:s*s*s*a.z+3*s*s*t*controlA.z+3*s*t*t*controlB.z+t*t*t*b.z};});
const cumulative=[0];for(let i=1;i<raw.length;i++)cumulative.push(cumulative[i-1]+Math.hypot(raw[i].x-raw[i-1].x,raw[i].z-raw[i-1].z));
const branchLength=cumulative[cumulative.length-1];
// Equal-distance samples keep speed physical; a cubic parameter is not distance.
export const BRANCH_SAMPLES=Array.from({length:161},(_,i)=>{const target=branchLength*i/160;let lo=0,hi=raw.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(cumulative[mid]<=target)lo=mid;else hi=mid;}const f=(target-cumulative[lo])/(cumulative[hi]-cumulative[lo]||1);return {x:raw[lo].x+(raw[hi].x-raw[lo].x)*f,z:raw[lo].z+(raw[hi].z-raw[lo].z)*f};});
export const MAIN_LENGTH=length(main);
export const SHORTCUT_RATIO=branchLength/(MAIN_LENGTH*(BRANCH_EXIT-BRANCH_ENTRY));
export const shortcutProbability=(rank:number)=>.42+.10*(Math.max(1,Math.min(8,rank))-1)/7;
export function routePoint(progress:number,lapLength:number,branch:boolean,p:Position,t:Position){
 const u=((progress/lapLength)%1+1)%1;
 const onBranch=branch&&u>=BRANCH_ENTRY&&u<=BRANCH_EXIT;
 const points=onBranch?BRANCH_SAMPLES:main,v=onBranch?(u-BRANCH_ENTRY)/(BRANCH_EXIT-BRANCH_ENTRY):u;
 sample(points,v,p);const at=Math.min(points.length-2,Math.floor(v*(points.length-1))),a=points[at],b=points[at+1],d=Math.hypot(b.x-a.x,b.z-a.z)||1;t.x=(b.x-a.x)/d;t.z=(b.z-a.z)/d;return p;
}
export function usesBranch(passages:readonly Passage[],id:string,progress:number){return passages.some(p=>p.id===id&&p.success&&progress>=p.entryProgress&&progress<p.exitProgress);}
