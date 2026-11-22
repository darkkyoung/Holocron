// Presentation adapter: takes only public snapshot fields. Never accepts a Meeting.
import * as T from 'three';
import {box,buildTrack} from './track';
import {portrait,racerModel} from './racer-model';
import {passingLanes,gridBlend} from './visual-lanes';
import {podiumStage} from './podium-stage';
import type {Entry,Shot} from '../../lib/racing-broadcast/projection';
import {TV_STATIONS} from '../../lib/racing/v8/camera';
export type Snapshot=Shot&{race?:string;entries?:Entry[];offset?:number};
export type Angle='auto'|'chase'|'front'|'wide'|'trackside';
function vehicle(e:Entry,i:number){
 const {group,body}=racerModel(e.color);
 const badge=new T.Sprite(new T.SpriteMaterial({map:portrait(e.name,e.color,i)}));badge.scale.set(5,6.25,1);badge.position.y=6;group.add(badge);
 const ring=new T.Mesh(new T.TorusGeometry(4,.32,6,32),new T.MeshBasicMaterial());ring.rotation.x=Math.PI/2;ring.position.y=.45;group.add(ring);
 const trail=box(1.7,.5,13,0xffd747);trail.position.set(0,.6,-8);group.add(trail);
 return {group,body,ring,trail};
}
function release(root:T.Object3D){
 const mats=new Set<T.Material>(),geos=new Set<T.BufferGeometry>();
 root.traverse(o=>{const m=o as T.Mesh;if(m.geometry)geos.add(m.geometry);if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(x=>mats.add(x));});
 mats.forEach(m=>{(m as T.SpriteMaterial).map?.dispose();m.dispose();});geos.forEach(g=>g.dispose());
}
export function liveScene(host:HTMLElement,onLoss:()=>void){
 const gl=new T.WebGLRenderer({antialias:true,powerPreference:'low-power'}),canvas=gl.domElement;
 const scene=new T.Scene(),world=new T.Group(),fleet=new T.Group(),camera=new T.PerspectiveCamera(48,1,.4,2500);
 scene.add(world,fleet,new T.HemisphereLight(0xbdeaff,0x24303a,2.6));const sun=new T.DirectionalLight(0xffedcd,3);sun.position.set(100,250,100);scene.add(sun);
 buildTrack(world,false,false,true,.08);const podium=podiumStage(scene);
 gl.setClearColor(0x101d2c);gl.setPixelRatio(Math.min(devicePixelRatio,1.5));host.appendChild(canvas);
 canvas.setAttribute('aria-label','실시간 3D 베스퍼 서킷');
 const size=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){gl.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}});size.observe(host);
 let now:Snapshot={phase:'WAITING',riders:[]},prev=now,received=0,blend=0,key='',id=0,last=-Infinity,slot='',angle:Angle='auto';
 const cars=new Map<string,ReturnType<typeof vehicle>>(),aim=new T.Vector3();let stopped=false;
 function draw(time:number){
  id=requestAnimationFrame(draw);if(time-last<1000/30)return;last=time-(Number.isFinite(last)?(time-last)%(1000/30):0);
  const ceremony=now.phase==='FINAL'||now.phase.startsWith('PODIUM');world.visible=!ceremony;podium.root.visible=ceremony;
  const rows=now.riders??[],subject=slot||now.cameraSlot||now.cue?.slot||rows.find(r=>r.rank===1&&r.x!==undefined)?.slot||rows.find(r=>r.x!==undefined)?.slot;
  const amount=blend?Math.min(1,(time-received)/blend):1;
  for(const [s,car] of cars){
   const r=rows.find(x=>x.slot===s),old=prev.riders?.find(x=>x.slot===s);
   car.group.visible=false;if(!r)continue;
   if(ceremony){if(!r.rank||r.rank>3||r.status!=='FINISHED')continue;const [x,y,z]=podium.positions[r.rank-1];car.group.position.set(x,y,z);car.group.rotation.y=0;}
   else{if(r.x===undefined||r.z===undefined)continue;const smooth=old?.x!==undefined&&old.z!==undefined&&Math.hypot(old.x-r.x,old.z-r.z)<60;
    car.group.position.set(smooth?old.x!+(r.x-old.x!)*amount:r.x,0,smooth?old.z!+(r.z-old.z!)*amount:r.z);car.group.rotation.y=r.yaw??0;}
   car.group.visible=true;
   for(const piece of car.group.children)if(piece!==car.ring)piece.visible=!r.warpHidden;
   const effect=now.cue?.slot===s?now.cue.kind:'';
   car.trail.visible=effect==='GOLD'||effect==='HYPER';car.trail.material.color.setHex(effect==='GOLD'?0xffce35:0x87e8ff);
   car.ring.scale.setScalar(r.warpHidden?1.7:1);car.ring.visible=!!r.warpHidden||now.cue?.slot===s||r.status==='DNF'||r.status==='DSQ';car.ring.material.color.setHex(r.status==='DNF'||r.status==='DSQ'?0xff5947:now.cue?.kind==='GOLD'?0xffce35:0x66e6ff);
  }
  const car=subject?cars.get(subject):undefined;
  if(ceremony){camera.position.set(0,25,Math.max(76,84/camera.aspect));aim.set(0,9,0);}
  else if(!car?.group.visible||angle==='wide'){camera.position.set(0,Math.max(400,540/camera.aspect),310);aim.set(0,0,0);}
  else{const p=car.group.position,h=car.group.rotation.y;const front=angle==='front'||(angle==='auto'&&(!!now.cue||Math.floor((now.offset??0)/7000)%3===1));const d=front?29:-32;
   camera.position.set(p.x+Math.sin(h)*d+Math.cos(h)*8,14,p.z+Math.cos(h)*d-Math.sin(h)*8);aim.copy(p).y=3;}
  if(!ceremony&&car?.group.visible&&(angle==='trackside'||(angle==='auto'&&Math.floor((now.offset??0)/7000)%3===2))){
   const p=car.group.position,dist=(s:typeof TV_STATIONS[number])=>(s.position[0]-p.x)**2+(s.position[2]-p.z)**2;
   const station=TV_STATIONS.reduce((a,b)=>dist(a)<dist(b)?a:b);
   if(dist(station)<180**2){camera.position.set(...station.position);aim.copy(p).y=3;}
  }
  camera.lookAt(aim);gl.render(scene,camera);host.dataset.frames=String(gl.info.render.frame);host.dataset.subject=subject??'';
 }
 function dispose(){if(stopped)return;stopped=true;cancelAnimationFrame(id);size.disconnect();canvas.removeEventListener('webglcontextlost',loss);release(scene);gl.dispose();gl.forceContextLoss();canvas.remove();}
 function loss(e:Event){e.preventDefault();dispose();onLoss();}
 canvas.addEventListener('webglcontextlost',loss);id=requestAnimationFrame(draw);
 return {dispose,update(v:Snapshot){
  const next=JSON.stringify([v.race,v.entries]);if(next!==key){key=next;release(fleet);fleet.clear();cars.clear();v.entries?.forEach((e,i)=>{const c=vehicle(e,i);cars.set(e.slot,c);fleet.add(c.group);});}
  // Eight cars, 28 pairs, once per snapshot. Preserve the actual staggered grid at launch.
  if(v.phase==='RACE'&&v.riders.length===8){
   const xy=new Float64Array(16),dir=new Float64Array(16),active=new Uint8Array(8);
   const order=v.riders.map(r=>v.entries?.findIndex(e=>e.slot===r.slot)??0);
   v.riders.forEach((r,i)=>{xy[2*i]=r.x??0;xy[2*i+1]=r.z??0;dir[2*i]=Math.sin(r.yaw??0);dir[2*i+1]=Math.cos(r.yaw??0);active[i]=Number(r.status==='RACING');});
   const lanes=passingLanes(xy,dir,active,order,new Float64Array(8)),weight=1-gridBlend(v.offset??0);
   v={...v,riders:v.riders.map((r,i)=>({...r,x:xy[2*i]-dir[2*i+1]*lanes[i]*weight,z:xy[2*i+1]+dir[2*i]*lanes[i]*weight}))};
  }
  prev=now;now=v;const diff=(v.offset??0)-(prev.offset??0);blend=v.race===prev.race&&v.phase===prev.phase&&diff>0&&diff<=800?Math.min(500,diff):0;received=performance.now();
 },camera(s:string,a:Angle){slot=s;angle=a;}};
}
