import * as T from 'three';
import type {Meeting} from '../../lib/racing/v2/types';
import {wormholePhase} from '../../lib/racing/v10/presentation';
import {spatialPointInto} from './track';

/** Two pooled portals. Coordinates come from the official jump; never integrate
 * viewer history or create particles in RAF. Scene owns all resource disposal. */
export function wormholeEffects(scene:T.Scene,m:Meeting){
 const root=new T.Group();root.visible=false;scene.add(root);
 const material=new T.MeshBasicMaterial({color:0x8feaff,transparent:true,opacity:.85,side:T.DoubleSide,depthWrite:false});
 const white=new T.MeshBasicMaterial({color:0xecfcff,transparent:true,opacity:.8,depthWrite:false});
 const geometry=new T.TorusGeometry(5.5,.35,6,40),inner=new T.RingGeometry(0,5.1,32);
 const portals=[0,1].map(()=>{const group=new T.Group(),ring=new T.Mesh(geometry,material),disc=new T.Mesh(inner,new T.MeshBasicMaterial({color:0x91e6ff,transparent:true,opacity:.16,side:T.DoubleSide,depthWrite:false}));group.add(ring,disc);root.add(group);return group;});
 const lineGeo=new T.BoxGeometry(.12,.12,1),lines=Array.from({length:12},(_,i)=>{const mesh=new T.Mesh(lineGeo,i%2?material:white);root.add(mesh);return mesh;});
 const p=new T.Vector3(),t=new T.Vector3(),aim=new T.Vector3(),side=new T.Vector3();
 const point=(progress:number)=>spatialPointInto(progress+(m.race.config.routeOffset??0)*m.qualifying.lapLength,m.qualifying.lapLength,0,false,p,t);
 return {root,update(ms:number,reduced:boolean){
  const state=wormholePhase(m,ms);root.visible=!!state&&state.phase!=='afterburn';if(!state||!root.visible)return state;
  const h=state.record,progress=[h.fromProgress??h.entryProgress,h.toProgress??h.entryProgress];
  for(let i=0;i<2;i++){point(progress[i]);const portal=portals[i];portal.position.copy(p);portal.position.y=5;portal.rotation.y=Math.atan2(t.x,t.z);portal.visible=i===0?state.phase!=='exit':state.phase==='exit';
   const age=(ms-m.raceStartMs-h.startTick*m.race.config.tickMs)/1000;portal.scale.setScalar(reduced?1:1+Math.sin(age*4)*.035);}
  const anchor=state.phase==='exit'?portals[1]:portals[0];
  for(let i=0;i<lines.length;i++){const line=lines[i],theta=i*Math.PI/6;line.visible=!reduced&&state.phase==='transit';line.position.copy(anchor.position);line.position.x+=Math.cos(theta)*8;line.position.y+=Math.sin(theta)*4;line.rotation.copy(anchor.rotation);line.scale.z=12+i%3*8;}
  root.updateMatrixWorld(true);return state;
 },camera(ms:number,camera:T.PerspectiveCamera,id:string,target:T.Vector3,yaw:number){
  const state=wormholePhase(m,ms,id);if(!state||state.phase==='afterburn')return false;
  const h=state.record;point(state.phase==='exit'?(h.toProgress??h.entryProgress):(h.fromProgress??h.entryProgress));
  // An intentional portal-to-portal cut at the authoritative jump. No long
  // camera interpolation across the intervening road or chase of a hidden car.
  if(state.phase==='exit'){
   // Stay at the exit portal and pan with the emerging car. Aiming at the
   // stationary portal lets the faster car leave a portrait viewport.
   aim.copy(target);aim.y+=4;side.set(-t.z,0,t.x);camera.position.copy(p).addScaledVector(t,-28).addScaledVector(side,17);camera.position.y=15;
  }else{
   // Entry must show the approaching racer, even when a branch delays the jump.
   // Track the already sampled car until transit ends; never aim ahead at a
   // future portal so early that the actual subject is behind the camera.
   t.set(Math.sin(yaw),0,Math.cos(yaw));side.set(-t.z,0,t.x);
   aim.copy(target).addScaledVector(t,8);aim.y+=4;
   camera.position.copy(target).addScaledVector(t,-32).addScaledVector(side,16);camera.position.y+=16;
  }
  camera.lookAt(aim);return true;
 }};
}
