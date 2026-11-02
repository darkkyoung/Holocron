import * as T from 'three';
import type {UltimateActivation} from '../../lib/racing/v9/ultimate';

/** Allocated once per car, enabled only during a recorded activation. No particles,
 * lights, postprocessing or history-dependent animation. Scene owns disposal. */
export function ultimateEffects(parent:T.Group){
 const root=new T.Group();root.visible=false;parent.add(root);
 const glow=new T.MeshBasicMaterial({color:0xffcd38,transparent:true,opacity:.75,depthWrite:false});
 const pale=new T.MeshBasicMaterial({color:0xfff4b1,transparent:true,opacity:.65,depthWrite:false});
 const ring=new T.Mesh(new T.TorusGeometry(1,.045,5,32),glow);ring.position.set(0,1,0);root.add(ring);
 const aura=new T.Mesh(new T.RingGeometry(2.3,3.5,24),new T.MeshBasicMaterial({color:0xffd238,transparent:true,opacity:.3,side:T.DoubleSide,depthWrite:false}));aura.rotation.x=-Math.PI/2;aura.position.y=.2;root.add(aura);
 const outline=new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(3.4,1.8,6)),new T.LineBasicMaterial({color:0xffde55,transparent:true,opacity:1}));outline.position.y=1.4;root.add(outline);
 const geometry=new T.BoxGeometry(.14,.14,1),streaks:T.Mesh[]=[];
 for(let i=0;i<8;i++){const line=new T.Mesh(geometry,i%2?pale:glow);root.add(line);streaks.push(line);}
 let type='';
 return {root,update(a:UltimateActivation|undefined,elapsedMs:number,reduced:boolean){
  const active=!!a&&elapsedMs>=a.startTick*250&&elapsedMs<a.endTick*250;root.visible=active;if(!active||!a)return;
  if(type!==a.type){type=a.type;const hyper=type==='hyper';glow.color.setHex(hyper?0x78dcff:0xffcd38);pale.color.setHex(hyper?0xf3fdff:0xfff4b1);aura.material.color.setHex(hyper?0x8beaff:0xffd238);outline.material.color.setHex(hyper?0xd0f8ff:0xffde55);}
  const age=(elapsedMs-a.startTick*250)/1000,left=(a.endTick*250-elapsedMs)/1000,fade=Math.min(1,age/.35,left/.45),hyper=a.type==='hyper';
  glow.opacity=(reduced?.45:.75)*fade;pale.opacity=(reduced?.35:.65)*fade;outline.material.opacity=fade;
  // One outward sonic ring. Reduced-motion removes the flash and pulsing aura.
  ring.visible=!reduced&&age<1.2;ring.scale.setScalar(1+age*7);ring.position.z=-age*6;
  aura.scale.setScalar(reduced?1:1+Math.sin(age*6)*.06);aura.material.opacity=(reduced?.18:.32)*fade;
  for(let i=0;i<streaks.length;i++){const line=streaks[i];const theta=i*Math.PI/4;
   line.visible=!reduced||i<4;line.position.set(Math.cos(theta)*(hyper?3.2:2.5),1.6+Math.sin(theta)*1.1,-9-i%3*2);
   line.scale.z=(hyper?20:14)+(reduced?0:Math.sin(age*4+i)*2);}
 }};
}
