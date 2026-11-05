import * as T from 'three';
import type {Meeting} from '../../lib/racing/v2/types';
import {phantomPhase} from '../../lib/racing/v12/presentation';
import {spatialPointInto} from './track';
/** One pooled sonic shell and 16 route-tangent streaks. No portals, particles,
 * extra RAF, lights, random draw or history-dependent camera smoothing. */
export function phantomEffects(scene:T.Scene,m:Meeting){
 const root=new T.Group();root.visible=false;scene.add(root);
 const blue=new T.MeshBasicMaterial({color:0x82e7ff,transparent:true,opacity:.75,depthWrite:false});
 const white=new T.MeshBasicMaterial({color:0xedfdff,transparent:true,opacity:.8,depthWrite:false});
 const ring=new T.Mesh(new T.TorusGeometry(1,.08,6,32),blue);root.add(ring);
 const geo=new T.BoxGeometry(.16,.16,1),lines=Array.from({length:16},(_,i)=>{const l=new T.Mesh(geo,i%3?blue:white);root.add(l);return l;});
 const p=new T.Vector3(),t=new T.Vector3(),side=new T.Vector3(),aim=new T.Vector3(),anchor=new T.Vector3();
 const lap=m.qualifying.lapLength,origin=(m.race.config.routeOffset??0)*lap;
 const point=(progress:number)=>spatialPointInto(progress+origin,lap,0,false,p,t);
 return {root,update(ms:number,reduced:boolean,target:T.Vector3|null){
  const s=phantomPhase(m,ms);root.visible=!!s&&!['charging','afterburn'].includes(s.phase);if(!s||!root.visible||!target)return s;
  const transit=s.phase==='transit',returning=s.phase==='return';
  if(transit)point(s.effectProgress);else p.copy(target);
  anchor.copy(p);anchor.y+=1.5;
  ring.position.copy(anchor);ring.rotation.x=Math.PI/2;
  const ringAge=returning?(s.age-(s.record.jumpTick!-s.record.phantomStartTick!)*250)/250:s.age/375;
  ring.visible=!reduced&&!transit;ring.scale.setScalar(3+Math.min(1,ringAge)*10);
  blue.opacity=reduced?.28:.7;white.opacity=reduced?.32:.85;
  for(let i=0;i<lines.length;i++){
   const line=lines[i];line.visible=!reduced||i<4;
   // The streak train follows official road curvature, never a chord through a corner.
   const travel=transit?s.effectProgress:(returning?s.record.toProgress!:s.record.entryProgress);
   point(Math.max(s.record.entryProgress,travel-i*800));side.set(-t.z,0,t.x);
   line.position.copy(p).addScaledVector(side,((i%4)-1.5)*1.3);line.position.y=1+(i%3)*.6;
   line.rotation.y=Math.atan2(t.x,t.z);line.scale.z=transit?10:6+i%4*2;
  }
  root.updateMatrixWorld(true);return s;
 },camera(ms:number,camera:T.PerspectiveCamera,id:string,target:T.Vector3){
  const s=phantomPhase(m,ms,id);if(!s||['charging','afterburn'].includes(s.phase))return false;
  const h=s.record;
  if(s.phase==='transit'){
   point(s.effectProgress);aim.copy(p).setY(4);side.set(-t.z,0,t.x);
   camera.position.copy(p).addScaledVector(t,-38).addScaledVector(side,18).setY(19);
  }else{
   // Fixed burst/arrival placement with a panning aim: movement is visible in
   // the shot, instead of a camera glued to the accelerating vehicle.
   const start=h.phantomStartTick??h.startTick;
   const frame=m.race.frames[Math.min(start,m.race.durationTicks)].racers.find(r=>r.id===id)!;
   point(s.phase==='return'?h.toProgress!:frame.progress);side.set(-t.z,0,t.x);
   camera.position.copy(p).addScaledVector(t,-34).addScaledVector(side,20).setY(18);
   aim.copy(target);aim.y+=4;
  }
  camera.lookAt(aim);return true;
 }};
}
