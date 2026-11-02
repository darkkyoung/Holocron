import * as T from 'three';
import {box} from './track';
import {ceremonyState} from '../../lib/racing/v9/ceremony';
import type {Meeting} from '../../lib/racing/v2/types';
/** A small original SF stage with reused racer billboards. Only presentation reads. */
export function createPodium(scene:T.Scene,m:Meeting,portraits:readonly T.Object3D[]){
 const root=new T.Group();root.visible=false;scene.add(root);
 const floor=box(90,1,46,0x132638);floor.position.y=-.6;root.add(floor);
 const back=box(88,25,1,0x0d1b2b);back.position.set(0,12,-15);root.add(back);
 for(const x of [-40,-28,28,40]){const bar=box(.3,23,.3,0x5abbd2);bar.position.set(x,11,-13);root.add(bar);}
 const positions=[[0,11,0],[-21,7,0],[21,4,0]];
 for(let rank=0;rank<3;rank++){const [x,h]=positions[rank],block=box(17,h,18,rank===0?0xb69741:0x3c596f);block.position.set(x,h/2,0);root.add(block);
  const trim=box(17.2,.2,18.2,rank===0?0xffd557:0x9de6ff);trim.position.set(x,h,0);root.add(trim);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d')!;ctx.fillStyle=rank===0?'#fff2a8':'#d6f7ff';ctx.font='bold 86px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('P'+(rank+1),128,64);
  const label=new T.Mesh(new T.PlaneGeometry(8,4),new T.MeshBasicMaterial({map:new T.CanvasTexture(canvas),transparent:true,depthWrite:false}));label.position.set(x,h/2,9.1);root.add(label);
 }
 const racers=portraits.map(sprite=>{const clone=sprite.clone();clone.visible=false;root.add(clone);return clone;});
 const trophy=new T.Mesh(new T.OctahedronGeometry(2.2),new T.MeshBasicMaterial({color:0xffde64}));trophy.position.set(0,21,-8);root.add(trophy);
 const geom=new T.PlaneGeometry(.45,1.6),material=new T.MeshBasicMaterial({color:0xffdd69,side:T.DoubleSide,transparent:true,opacity:.75});
 const confetti=new T.InstancedMesh(geom,material,32);confetti.frustumCulled=false;root.add(confetti);
 const dummy=new T.Object3D(),aim=new T.Vector3();
 let pose:unknown=null;
 return {root,update(ms:number,camera:T.PerspectiveCamera,reduced:boolean){
  root.visible=true;const state=ceremonyState(m,ms),top=(state.reclassified?m.official:m.race.results).filter(r=>r.status==='FINISHED').slice(0,3);
  racers.forEach(r=>r.visible=false);
  for(const rank of state.visibleRanks){const result=top[rank];if(!result)continue;const i=m.race.racers.findIndex(r=>r.id===result.id),sprite=racers[i],[x,h,z]=positions[rank];
   const start=[14000,9000,4000][rank],entry=Math.min(1,Math.max(0,(state.cycle-start)/1800)),smooth=entry*entry*(3-2*entry);
   sprite.visible=true;sprite.position.set(x,h+3.5,z+7*(1-smooth));sprite.scale.set(8,10,1);}
  trophy.visible=state.visibleRanks.includes(0);trophy.rotation.y=ms/2200;
  confetti.visible=state.celebrate&&!reduced;
  if(confetti.visible){const age=(state.cycle-24000)/1000;for(let i=0;i<32;i++){dummy.position.set(Math.sin(i*13.31)*35,26-((age*4+i*1.37)%25),Math.cos(i*8.31)*12);dummy.rotation.set(age*.5+i,age+i*.2,i);dummy.updateMatrix();confetti.setMatrixAt(i,dummy.matrix);}confetti.instanceMatrix.needsUpdate=true;}
  const rank=state.rank,aspect=camera.aspect;
  if(rank!==null&&top[rank]){const [x,h]=positions[rank];aim.set(x,h+4,0);const distance=29/Math.min(1,aspect);camera.position.set(x+Math.sin(state.cycle/8500)*8,h+10,distance);camera.lookAt(aim);}
  else {const distance=Math.max(78,90/aspect);aim.set(0,9,0);camera.position.set(Math.sin(state.cycle/22000)*12,25,distance);camera.lookAt(aim);}
  root.updateMatrixWorld(true);
  pose={stage:state.stage,reclassified:state.reclassified,visible:state.visibleRanks.map(rank=>({rank:rank+1,id:top[rank]?.id,position:racers[m.race.racers.findIndex(r=>r.id===top[rank]?.id)]?.position.toArray()})),camera:camera.position.toArray()};
  return pose;
 }};
}
