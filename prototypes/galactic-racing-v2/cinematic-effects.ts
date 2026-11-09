import * as T from 'three';
import type {Meeting} from '../../lib/racing/v2/types';
import {cinematicState,retirementAt,CINEMATIC} from '../../lib/racing/v13/presentation';
import {spatialPointInto} from './track';
/** Pooled charge / failure / retirement effects and a pure, road-following camera.
 * No physics writes, additional RAF, random draw, lights or postprocessing. */
export function cinematicEffects(scene:T.Scene,m:Meeting){
 const root=new T.Group();scene.add(root);
 const energy=new T.MeshBasicMaterial({color:0x9beeff,transparent:true,opacity:.65,depthWrite:false});
 const smokeMaterial=new T.MeshBasicMaterial({color:0x606777,transparent:true,opacity:.6,depthWrite:false});
 const sparkMaterial=new T.MeshBasicMaterial({color:0xffbd69,transparent:true,opacity:.8,depthWrite:false});
 const ring=new T.Mesh(new T.TorusGeometry(1,.10,6,32),energy);root.add(ring);
 const smokeGeometry=new T.IcosahedronGeometry(1,1),sparkGeometry=new T.BoxGeometry(.2,.2,1);
 const smoke=Array.from({length:8},()=>{const x=new T.Mesh(smokeGeometry,smokeMaterial);root.add(x);return x;});
 const sparks=Array.from({length:12},()=>{const x=new T.Mesh(sparkGeometry,energy);root.add(x);return x;});
 const p=new T.Vector3(),t=new T.Vector3(),side=new T.Vector3(),aim=new T.Vector3(),anchor=new T.Vector3();
 const lap=m.qualifying.lapLength,origin=(m.race.config.routeOffset??0)*lap;
 const point=(progress:number)=>spatialPointInto(progress+origin,lap,0,false,p,t);
 const smooth=(x:number)=>{const a=Math.max(0,Math.min(1,x));return a*a*(3-2*a);};
 return {update(ms:number,reduced:boolean,position:(id:string)=>T.Vector3){
  const state=cinematicState(m,ms),event=retirementAt(m,ms),retired=event&&(!state||event.leader||event.id===state.id)?event:null;
  const s=retired?null:state;root.visible=!!s||!!retired;if(!root.visible)return;
  const id=retired?.id??s!.id,target=position(id);
  let decay=0,age=0;
  if(retired){age=ms-m.raceStartMs-retired.at;decay=1-age/CINEMATIC.retirement;}
  else if(s?.phase==='failed'){age=s.time-s.plan.failedAt!;decay=s.smoke;}
  anchor.copy(target);
  if(s&&['departure','travel'].includes(s.phase)){
   const f=s.phase==='travel'?smooth((s.time-s.plan.flight)/CINEMATIC.travel):0;
   point(s.plan.departureProgress+(s.plan.arrivalProgress-s.plan.departureProgress)*f);anchor.copy(p);
  }
  const charging=s?.phase==='charge'||s?.phase==='stabilizing';
  ring.visible=!decay&&s?.phase!=='arrival'&&s?.phase!=='follow';
  ring.position.copy(anchor).setY(2);ring.rotation.set(Math.PI/2,0,0);
  ring.scale.setScalar(charging?2+(s?.charge??1)*3:4+smooth((s?.time??0)-(s?.plan.reveal??0))*6);
  energy.opacity=reduced?.3:charging?.25+(s?.charge??1)*.5:.65;
  smokeMaterial.opacity=Math.max(0,decay)*.65;
  for(let i=0;i<smoke.length;i++){const x=smoke[i];x.visible=decay>0;x.position.copy(target);x.position.x+=Math.sin(i*2.4)*age/600;x.position.z+=Math.cos(i*2.4)*age/600;x.position.y=2+age/400+i*.35;x.scale.setScalar(1.2+age/800);}
  for(let i=0;i<sparks.length;i++){
   const x=sparks[i];x.visible=(!reduced||i<4)&&(decay>0?age<500:s?.phase!=='follow'&&s?.phase!=='arrival');x.material=decay?sparkMaterial:energy;
   x.position.copy(anchor);const theta=i*Math.PI*2/12+(reduced?0:ms/1200);const radius=charging?3+(1-(s?.charge??1))*3:5;
   x.position.x+=Math.cos(theta)*radius;x.position.z+=Math.sin(theta)*radius;x.position.y=2+i%3;
   x.rotation.y=theta;x.scale.z=charging?2:decay?4:9;
  }
  root.updateMatrixWorld(true);
 },camera(ms:number,camera:T.PerspectiveCamera,id:string,target:T.Vector3){
  const s=cinematicState(m,ms,id);if(!s||['charge','stabilizing','failed','follow'].includes(s.phase))return false;
  const q=s.plan;
  // Departure and arrival positions stay fixed; the lens pans. Flight travels
  // along the road rather than drawing a chord across the circuit.
  let progress=q.departureProgress;
  if(s.phase==='travel')progress+=(q.arrivalProgress-progress)*smooth((s.time-q.flight)/CINEMATIC.travel);
  else if(['arrival','return'].includes(s.phase))progress=q.arrivalProgress;
  point(progress);side.set(-t.z,0,t.x);camera.position.copy(p).addScaledVector(t,-32).addScaledVector(side,22).setY(19);
  aim.copy(['burst','fade','return'].includes(s.phase)?target:p);aim.y+=3;
  if(s.phase==='arrival'){aim.copy(target);aim.y+=3;}
  camera.lookAt(aim);return true;
 }};
}
