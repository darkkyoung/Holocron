import {MAIN_SAMPLES} from './track-samples';
export interface Position {x:number;z:number}
export interface Passage {id:string;lap:number;rank:number;probability:number;success:boolean;entryMs:number;mergeMs:number|null;entryProgress:number;exitProgress:number}
export const BRANCH_ENTRY=.20,BRANCH_EXIT=.40;
function length(points:readonly Position[]){let n=0;for(let i=1;i<points.length;i++)n+=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z);return n;}
const main=MAIN_SAMPLES.map(([x,z])=>({x,z}));
function sample(points:readonly Position[],u:number,out:Position){const at=Math.max(0,Math.min(1,u))*(points.length-1),i=Math.min(points.length-2,Math.floor(at)),f=at-i;out.x=points[i].x+(points[i+1].x-points[i].x)*f;out.z=points[i].z+(points[i+1].z-points[i].z)*f;return out;}
const a=sample(main,BRANCH_ENTRY,{x:0,z:0}),b=sample(main,BRANCH_EXIT,{x:0,z:0});
const am=sample(main,BRANCH_ENTRY-.001,{x:0,z:0}),bp=sample(main,BRANCH_EXIT+.001,{x:0,z:0});
const ta={x:a.x-am.x,z:a.z-am.z},tb={x:bp.x-b.x,z:bp.z-b.z};
const la=Math.hypot(ta.x,ta.z),lb=Math.hypot(tb.x,tb.z),handle=80;
const controlA={x:a.x+ta.x/la*handle,z:a.z+ta.z/la*handle},controlB={x:b.x-tb.x/lb*handle,z:b.z-tb.z/lb*handle};
const raw=Array.from({length:401},(_,i)=>{const t=i/400,s=1-t;return {x:s*s*s*a.x+3*s*s*t*controlA.x+3*s*t*t*controlB.x+t*t*t*b.x,z:s*s*s*a.z+3*s*s*t*controlA.z+3*s*t*t*controlB.z+t*t*t*b.z};});
const cumulative=[0];for(let i=1;i<raw.length;i++)cumulative.push(cumulative[i-1]+Math.hypot(raw[i].x-raw[i-1].x,raw[i].z-raw[i-1].z));
const branchLength=cumulative[cumulative.length-1];
// Equal-distance samples keep speed physical; a cubic parameter is not distance.
export const BRANCH_SAMPLES=Array.from({length:161},(_,i)=>{const target=branchLength*i/160;let lo=0,hi=raw.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(cumulative[mid]<=target)lo=mid;else hi=mid;}const f=(target-cumulative[lo])/(cumulative[hi]-cumulative[lo]||1);return {x:raw[lo].x+(raw[hi].x-raw[lo].x)*f,z:raw[lo].z+(raw[hi].z-raw[lo].z)*f};});
export const MAIN_LENGTH=length(main);
export const SHORTCUT_RATIO=branchLength/(MAIN_LENGTH*(BRANCH_EXIT-BRANCH_ENTRY));

/**
 * Display geometry only: smooth first derivatives at the old polyline sample joins.
 * Previously the heading was atan2 of a single segment. At a tight corner that
 * segment heading could jump ~24 degrees across an arbitrarily small progress
 * change, making both vehicle yaw and the chase camera shake.
 *
 * The precomputed cubic Hermite interpolant passes through all existing samples,
 * is C1 at every sample, and requires no per-frame allocations. It changes no
 * simulator progress, seeded shortcut decision, event, race time, or result.
 */
function smoothTangents(points:readonly Position[],closed:boolean):Position[]{
 const last=points.length-1;
 return points.map((_,i)=>{
  const prev=points[closed?(i===0?last-1:i===last?last-1:i-1):Math.max(0,i-1)];
  const next=points[closed?(i===0||i===last?1:i+1):Math.min(last,i+1)];
  const weight=!closed&&(i===0||i===last)?1:.5;
  return {x:(next.x-prev.x)*weight,z:(next.z-prev.z)*weight};
 });
}
const mainTangents=smoothTangents(main,true);
const branchTangents=smoothTangents(BRANCH_SAMPLES,false);
// Give branch endpoints exactly the main-road direction. Scale the local
// derivative to account for the shorter route's faster equivalent progress,
// so the *physical* velocity also stays continuous when switching lanes.
const boundaryScale=SHORTCUT_RATIO*(main.length-1)*(BRANCH_EXIT-BRANCH_ENTRY)/(BRANCH_SAMPLES.length-1);
const entryTangent=mainTangents[Math.round(BRANCH_ENTRY*(main.length-1))];
const exitTangent=mainTangents[Math.round(BRANCH_EXIT*(main.length-1))];
branchTangents[0]={x:entryTangent.x*boundaryScale,z:entryTangent.z*boundaryScale};
branchTangents[branchTangents.length-1]={x:exitTangent.x*boundaryScale,z:exitTangent.z*boundaryScale};

function smoothSample(points:readonly Position[],tangents:readonly Position[],u:number,p:Position,t:Position){
 const at=Math.max(0,Math.min(1,u))*(points.length-1),index=Math.min(points.length-2,Math.floor(at)),f=at-index;
 const a=points[index],b=points[index+1],v=tangents[index],w=tangents[index+1],f2=f*f,f3=f2*f;
 const h00=2*f3-3*f2+1,h10=f3-2*f2+f,h01=-2*f3+3*f2,h11=f3-f2;
 p.x=h00*a.x+h10*v.x+h01*b.x+h11*w.x;
 p.z=h00*a.z+h10*v.z+h01*b.z+h11*w.z;
 const d00=6*f2-6*f,d10=3*f2-4*f+1,d01=-d00,d11=3*f2-2*f;
 const dx=d00*a.x+d10*v.x+d01*b.x+d11*w.x;
 const dz=d00*a.z+d10*v.z+d01*b.z+d11*w.z;
 const magnitude=Math.hypot(dx,dz)||1;
 t.x=dx/magnitude;t.z=dz/magnitude;
 return p;
}
export const shortcutProbability=(rank:number)=>.42+.10*(Math.max(1,Math.min(8,rank))-1)/7;
export function routePoint(progress:number,lapLength:number,branch:boolean,p:Position,t:Position){
 const u=((progress/lapLength)%1+1)%1;
 const onBranch=branch&&u>=BRANCH_ENTRY&&u<=BRANCH_EXIT;
 const v=onBranch?(u-BRANCH_ENTRY)/(BRANCH_EXIT-BRANCH_ENTRY):u;
 return onBranch?smoothSample(BRANCH_SAMPLES,branchTangents,v,p,t):
  smoothSample(main,mainTangents,v,p,t);
}
export function usesBranch(passages:readonly Passage[],id:string,progress:number){return passages.some(p=>p.id===id&&p.success&&progress>=p.entryProgress&&progress<p.exitProgress);}

/** Static scenery clearance only; never changes race outcomes. */
export function nearBranch(x:number,z:number,radius:number){for(let i=1;i<BRANCH_SAMPLES.length;i++){const a=BRANCH_SAMPLES[i-1],b=BRANCH_SAMPLES[i],dx=b.x-a.x,dz=b.z-a.z,u=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));if(Math.hypot(x-a.x-u*dx,z-a.z-u*dz)<radius)return true;}return false;}
