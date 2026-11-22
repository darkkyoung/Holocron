import * as T from 'three';
import {box} from './track';
export function podiumStage(scene:T.Scene){
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
 return {root,positions};
}
