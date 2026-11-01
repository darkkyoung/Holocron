import assert from 'node:assert/strict';
import {loadV5} from './racing/load-v5.mjs';
import {loadTestModules} from './test-module-loader.mjs';

const v5=await loadV5();
const samples=await loadTestModules(['lib/racing/v5/track-samples.ts']);
const {MAIN_SAMPLES}=samples.modules['lib/racing/v5/track-samples.ts'];
const {BRANCH_SAMPLES,BRANCH_ENTRY,BRANCH_EXIT,SHORTCUT_RATIO,routePoint}=v5;
const assertNear=(a,b,epsilon,message)=>assert.ok(Math.abs(a-b)<=epsilon,message+' ('+a+' vs '+b+')');
const pos=(u,branch=false)=>{const p={x:0,z:0},t={x:0,z:0};routePoint(u,1,branch,p,t);
  assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(t.x)&&Number.isFinite(t.z));
  assertNear(Math.hypot(t.x,t.z),1,1e-9,'normalized heading');return {p,t};};
const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.x*b.x+a.z*b.z)))*180/Math.PI;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
let maximumOldHeadingJump=0,maximumMainHeadingJump=0,maximumBranchHeadingJump=0;
let maximumMainGeometryDrift=0,maximumBranchGeometryDrift=0;
try {
 const n=MAIN_SAMPLES.length-1,eps=0.0001;
 assert.equal(n,600,'historical main road sample count');
 for(let i=1;i<n;i++){
   const a=MAIN_SAMPLES[i-1],b=MAIN_SAMPLES[i],c=MAIN_SAMPLES[i+1];
   const ab={x:b[0]-a[0],z:b[1]-a[1]},bc={x:c[0]-b[0],z:c[1]-b[1]};
   const la=Math.hypot(ab.x,ab.z),lb=Math.hypot(bc.x,bc.z);
   maximumOldHeadingJump=Math.max(maximumOldHeadingJump,angle({x:ab.x/la,z:ab.z/la},{x:bc.x/lb,z:bc.z/lb}));
   const left=pos((i-eps)/n).t,right=pos((i+eps)/n).t;
   maximumMainHeadingJump=Math.max(maximumMainHeadingJump,angle(left,right));
   const at=pos(i/n).p;
   assertNear(at.x,b[0],1e-6,'main original sample x');
   assertNear(at.z,b[1],1e-6,'main original sample z');
 }
 for(let k=0;k<n*4;k++){
   const at=k/4,i=Math.floor(at),f=at-i;
   const linear={x:MAIN_SAMPLES[i][0]*(1-f)+MAIN_SAMPLES[i+1][0]*f,
     z:MAIN_SAMPLES[i][1]*(1-f)+MAIN_SAMPLES[i+1][1]*f};
   maximumMainGeometryDrift=Math.max(maximumMainGeometryDrift,dist(linear,pos(at/n).p));
 }
 const m=BRANCH_SAMPLES.length-1;assert.equal(m,160,'short route sample count');
 for(let i=1;i<m;i++){
   const u=BRANCH_ENTRY+(BRANCH_EXIT-BRANCH_ENTRY)*i/m;
   maximumBranchHeadingJump=Math.max(maximumBranchHeadingJump,angle(
     pos(BRANCH_ENTRY+(BRANCH_EXIT-BRANCH_ENTRY)*(i-eps)/m,true).t,
     pos(BRANCH_ENTRY+(BRANCH_EXIT-BRANCH_ENTRY)*(i+eps)/m,true).t));
   const at=pos(u,true).p;
   assertNear(at.x,BRANCH_SAMPLES[i].x,1e-6,'shortcut original sample x');
   assertNear(at.z,BRANCH_SAMPLES[i].z,1e-6,'shortcut original sample z');
 }
 for(let k=0;k<m*4;k++){
   const at=k/4,i=Math.floor(at),f=at-i,a=BRANCH_SAMPLES[i],b=BRANCH_SAMPLES[i+1];
   const linear={x:a.x*(1-f)+b.x*f,z:a.z*(1-f)+b.z*f};
   maximumBranchGeometryDrift=Math.max(maximumBranchGeometryDrift,
     dist(linear,pos(BRANCH_ENTRY+(BRANCH_EXIT-BRANCH_ENTRY)*at/m,true).p));
 }
 // Sampled render road remains a closed loop with no discontinuity at the seam.
 assert.ok(dist(pos(0).p,pos(1-1e-8).p)<.01,'closed seam position continuity');
 assert.ok(angle(pos(0).t,pos(1-1e-8).t)<.03,'closed seam heading continuity');
 for(const boundary of [BRANCH_ENTRY,BRANCH_EXIT]){
   assert.ok(dist(pos(boundary,false).p,pos(boundary,true).p)<1e-6,'branch joins main centerline');
   assert.ok(angle(pos(boundary,false).t,pos(boundary,true).t)<.005,'branch heading joins main exactly');
   // v0.5 integrates shorter-route progress at 1/ratio of physical speed.
   const delta=1e-5;
   const before=pos(boundary,false).p,previous=pos(boundary-delta,false).p;
   const after=pos(boundary+delta/SHORTCUT_RATIO,true).p;
   const speedRatio=dist(before,after)/dist(before,previous);
   assert.ok(speedRatio>.94&&speedRatio<1.06,'physical speed continuity at branch boundary: '+speedRatio);
 }
 assert.ok(maximumOldHeadingJump>15,'test must reproduce existing heading jump');
 assert.ok(maximumMainHeadingJump<.15,'main heading continuity under sub-sample motion');
 assert.ok(maximumBranchHeadingJump<.15,'branch heading continuity under sub-sample motion');
 assert.ok(maximumMainGeometryDrift<.2,'stay close to existing rendered road geometry');
 assert.ok(maximumBranchGeometryDrift<.2,'stay close to existing branch ribbon geometry');
 const race=v5.simulateMeetingV5('9re-0');
 const replay=v5.simulateMeetingV5('9re-0');
 assert.deepEqual(race.race.results,replay.race.results);
 assert.deepEqual(race.race.events,replay.race.events);
 assert.deepEqual(race.shortcutPassages,replay.shortcutPassages);
 console.log('PASS Phase 2-B.1: old heading discontinuity '+maximumOldHeadingJump.toFixed(3)+
  '°, new main '+maximumMainHeadingJump.toFixed(4)+'°, branch '+
  maximumBranchHeadingJump.toFixed(4)+'°; max centerline drift '+
  maximumMainGeometryDrift.toFixed(4)+'m, branch drift '+
  maximumBranchGeometryDrift.toFixed(4)+'m; v0.5 seeded results unchanged');
}finally{await v5.dispose();await samples.dispose();}
