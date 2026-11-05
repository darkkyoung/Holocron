import {createPodium} from './podium-scene';
import {ultimateEffects} from './ultimate-effects';
import {wormholeEffects} from './wormhole-effects';
import {wormholePhase} from '../../lib/racing/v10/presentation';
import {TV_STATIONS} from '../../lib/racing/v8/camera';
import {passingLanes,gridBlend} from './visual-lanes';
import {usesBranch} from '../../lib/racing/v5/track';
import * as T from 'three';
import {SVGRenderer,SVGObject} from 'three/addons/renderers/SVGRenderer.js';
import {point,pointInto,spatialPointInto,buildTrack,box} from './track';
import {meetingAt,cameraAt} from '../../lib/racing/v2/playback';
import {finishIndex,displayedProgress} from '../../lib/racing/v4/presentation';
import type {CameraCue} from '../../lib/racing/v2/types';
import type {Meeting} from '../../lib/racing/v2/types';
import type {RacerFrame} from '../../lib/racing/types';

function portrait(name:string,color:string,index:number){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=160;const c=canvas.getContext('2d')!;
 c.fillStyle=color;c.beginPath();c.roundRect(20,72,88,75,22);c.fill();
 c.fillStyle='#dae8ec';c.beginPath();c.arc(64,53,35,0,Math.PI*2);c.fill();
 c.fillStyle=color;c.beginPath();c.arc(64,49,31,Math.PI,Math.PI*2);c.fill();
 c.fillStyle='#142131';c.fillRect(33,43,62,20);c.fillStyle='#84efff';c.fillRect(38,48,47,7);
 c.fillStyle='#142131';c.font='bold 28px sans-serif';c.textAlign='center';c.fillText(String(index+1),64,113);
 c.fillStyle='#ffffff';c.font='15px sans-serif';c.fillText(name,64,156);
 return new T.CanvasTexture(canvas);
}

const eventBadges={
  ULTIMATE:{label:'ULTIMATE',symbol:'✦',accent:'#e5baff'},
  BOOST:{label:'부스트',symbol:'⚡',accent:'#f5d276'},
  SLIPSTREAM:{label:'드래프트',symbol:'»',accent:'#87e0ef'},
  EXTERNAL:{label:'외부 충격',symbol:'!',accent:'#ff937e'},
  MAJOR:{label:'큰 사고',symbol:'!',accent:'#ff937e'},
  MEDIUM:{label:'접촉',symbol:'!',accent:'#ffbd89'},
  DAMAGED:{label:'감속',symbol:'!',accent:'#ffb492'},
  PENALTY:{label:'페널티',symbol:'!',accent:'#ffb492'},
  QUALIFYING:{label:'주행 실수',symbol:'!',accent:'#ffd890'},
} as const;
type BadgeKind=keyof typeof eventBadges;
export function createScene(host:HTMLElement,m:Meeting,invalidate?:()=>void){
 let disposed=false;
 const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const ultimateIndex=new Map(m.ultimates?.map(a=>[a.id,a])??[]);
 const motionProbe=new URLSearchParams(location.search).has('motion');
 const racerIndex=new Map(m.race.racers.map((r,i)=>[r.id,i]));
 const positionBuffer=new T.Vector3(),tangentBuffer=new T.Vector3(),targetBuffer=new T.Vector3(),sideBuffer=new T.Vector3(),aimBuffer=new T.Vector3(),projectBuffer=new T.Vector3();
 const podiumAim=new T.Vector3(0,9,-10),wideAim=new T.Vector3(0,4,0);
 let renderer:T.WebGLRenderer|SVGRenderer;
 try{renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.dataset.renderer='WebGL 2';}
 catch{renderer=new SVGRenderer();renderer.setPrecision(1);host.dataset.renderer='SVG 3D · GPU 미사용';}
 const gl=renderer instanceof T.WebGLRenderer?renderer.getContext():null;
 const gpuInfo=gl?.getExtension('WEBGL_debug_renderer_info');
 const gpu=gl?String(gl.getParameter(gpuInfo?gpuInfo.UNMASKED_RENDERER_WEBGL:gl.RENDERER)):'SVG / no GPU';
 host.dataset.gpu=gpu;
 renderer.setClearColor(new T.Color(0x0c1521),1);host.appendChild(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','서버 타임라인 기반 3D 레이스');renderer.domElement.setAttribute('role','img');
 const scene=new T.Scene(),fog=new T.Fog(0x0c1521,700,1500);scene.fog=fog;
 const wormholeFx=m.wormholes?wormholeEffects(scene,m):null;
 const camera=new T.PerspectiveCamera(48,1,.5,2000);
 scene.add(new T.HemisphereLight(0xbdeaff,0x24303a,2.6));const sun=new T.DirectionalLight(0xffedcd,3);sun.position.set(100,250,100);scene.add(sun);
 // Race scenery must never obscure the ceremony podium or its racers.
 const trackWorld=new T.Group();scene.add(trackWorld);buildTrack(trackWorld,renderer instanceof SVGRenderer,!m.race.config.noPitStops,m.race.config.track.id.startsWith('vesper-branch-'),m.race.config.routeOffset??0);
 const eventByRacer=new Map<string,{ms:number;kind:BadgeKind}[]>();
 for(const evt of m.race.events){
  const kind:BadgeKind|null=evt.kind==='EXTERNAL'?'EXTERNAL':
   evt.kind==='MAJOR'?'MAJOR':evt.kind==='MEDIUM'?'MEDIUM':null;
  if(!kind)continue;
  const list=eventByRacer.get(evt.racerId)??[];
  list.push({ms:evt.tick*m.race.config.tickMs,kind});eventByRacer.set(evt.racerId,list);
 }
 function recentImpact(id:string,elapsedMs:number){
  const entries=eventByRacer.get(id);
  if(!entries||elapsedMs<0)return null;
  let lo=0,hi=entries.length;
  while(lo<hi){const mid=(lo+hi)>>1;if(entries[mid].ms<=elapsedMs)lo=mid+1;else hi=mid;}
  const item=entries[lo-1];
  return item&&elapsedMs-item.ms<2600?item:null;
 }
 const lanePoints=new Float64Array(16),laneHeadings=new Float64Array(16),laneActive=new Uint8Array(8),lanes=new Float64Array(8);
 const laneOrder=m.race.racers.map(r=>m.race.grid.indexOf(r.id));
 const finish=finishIndex(m.race);
 const spatial=!!m.shortcutPassages;
 const origin=(m.race.config.routeOffset??0)*m.qualifying.lapLength;
 const locatePoint=(progress:number,lap:number,offset:number,id:string,inRace:boolean)=>spatial?spatialPointInto(progress+origin,lap,offset,inRace&&usesBranch(m.shortcutPassages??[],id,progress),positionBuffer,tangentBuffer):pointInto(progress,lap,offset,positionBuffer,tangentBuffer);
 const gridMarks=new T.Group();scene.add(gridMarks);
 if(m.race.config.gridLanes)for(let i=0;i<8;i++){
  const {p,t}=locatePoint(-(m.race.config.gridLeadIn??0)-i*m.race.config.gridGap,m.qualifying.lapLength,m.race.config.gridLanes[i],m.race.grid[i],false);
  const mark=new T.Group();mark.position.copy(p);mark.rotation.y=Math.atan2(t.x,t.z);
  for(const x of [-3.2,3.2]){const line=box(.15,.08,8,0xcde2ed);line.position.set(x,.1,0);mark.add(line);}
  const bar=box(6.5,.08,.18,0xffdb49);bar.position.set(0,.1,4);mark.add(bar);gridMarks.add(mark);
 }
 const cars=m.race.racers.map((r,i)=>{
  const group=new T.Group(),body=box(3,1.4,5.5,Number(r.color.replace('#','0x')));body.position.y=1.3;group.add(body);
  const cockpit=box(1.9,.9,2.5,0x17212b);cockpit.position.set(0,2,0);group.add(cockpit);
  for(const x of [-1.8,1.8])for(const z of [-1.6,1.6]){const wheel=box(.8,1.2,1.4,0x080c12);wheel.position.set(x,.8,z);group.add(wheel);}
  const wing=box(5,.3,1,0xc1d7e3);wing.position.set(0,1.9,-2.5);group.add(wing);
  // Presentation-only glowing edge when a car has officially crossed the line.
  const finishGlow=new T.LineSegments(new T.EdgesGeometry(body.geometry),
    new T.LineBasicMaterial({color:0x80f5ff,transparent:true,opacity:1}));
  finishGlow.position.copy(body.position);finishGlow.scale.set(1.14,1.24,1.13);
  finishGlow.visible=false;group.add(finishGlow);
  const finishRing=new T.Mesh(new T.TorusGeometry(3.8,.15,6,36),
    new T.MeshBasicMaterial({color:0x80f5ff,transparent:true,opacity:.82}));
  finishRing.rotation.x=Math.PI/2;finishRing.position.y=.18;finishRing.visible=false;group.add(finishRing);

  let sprite:T.Object3D;
  if(renderer instanceof T.WebGLRenderer){const image=new T.Sprite(new T.SpriteMaterial({map:portrait(r.name,r.color,i),depthTest:true}));image.scale.set(5,6.25,1);sprite=image;}
  else {const node=document.createElementNS('http://www.w3.org/2000/svg','g');
   const add=(tag:string,attrs:Record<string,string>)=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));node.appendChild(el);return el;};
   add('rect',{x:'-10',y:'-3',width:'20',height:'17',rx:'5',fill:r.color});add('circle',{cx:'0',cy:'-8',r:'9',fill:'#dce5ec'});add('rect',{x:'-7',y:'-11',width:'14',height:'5',rx:'2',fill:'#172a3a'});const text=add('text',{x:'0',y:'10','text-anchor':'middle','font-size':'10',fill:'#172a3a'});text.textContent=String(i+1);sprite=new SVGObject(node);sprite.renderOrder=100000;}
  sprite.position.y=6;group.add(sprite);
  const trail=box(1.6,.4,7,0xffd745);trail.position.set(0,.6,-5);group.add(trail);
  const ring=new T.Mesh(new T.TorusGeometry(4,.18,6,24),new T.MeshBasicMaterial({color:0xffdd33}));ring.rotation.x=Math.PI/2;ring.position.y=.3;group.add(ring);
  const impact=new T.Mesh(new T.TorusGeometry(4.8,.3,6,20),new T.MeshBasicMaterial({color:0xff7662}));impact.rotation.x=Math.PI/2;impact.position.y=1;group.add(impact);
  // Screen-space badges keep a bounded readable size at every camera distance.
  const badge=document.createElement('span');badge.className='racer-event';badge.hidden=true;host.appendChild(badge);
  const anchor=new T.Object3D();anchor.position.set(0,renderer instanceof SVGRenderer?6:9.2,0);group.add(anchor);
  // SVG has no depth buffer; keep car faces above the long road triangles.
  if(renderer instanceof SVGRenderer)group.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.LineSegments)o.renderOrder=1000;});
  const ultimateFx=m.ultimates?ultimateEffects(group):null;
  scene.add(group);return {group,ultimateFx,trail,ring,impact,finishGlow,finishRing,sprite,badge,anchor,lastBadge:null as BadgeKind|null,impactAt:0};
 });
 const modernPodium=m.ultimates?createPodium(scene,m,cars.map(c=>c.sprite)):null;
 const podium=new T.Group();podium.position.set(0,0,-10);
 const podiumFloor=box(82,1,34,0x1b293b);podiumFloor.position.y=-.5;podium.add(podiumFloor);
 [1,0,2].forEach((rank,i)=>{const h=[11,7,4][rank],block=box(17,h,18,rank===0?0xdbb644:0x536b82);block.position.set((i-1)*21,h/2,0);podium.add(block);});scene.add(podium);podium.visible=false;
 // Initialize the projection before the first frame; ResizeObserver may fire later.
 let width=1,height=1;
 const fitViewport=()=>{if(disposed)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  if(w===width&&h===height)return;
  width=w;height=h;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();invalidate?.();};
 fitViewport();
 const observer=new ResizeObserver(fitViewport);observer.observe(host);
 // Frame a circuit or podium to a fixed screen occupancy, not a hardcoded distance.
 // The same geometry is projected for WebGL and the no-GPU SVG fallback.
 const circuitPoints:T.Vector3[]=[];
 for(let i=0;i<64;i++)for(const offset of [-19,19]){const {p}=point(i/64,1,offset);p.y=10;circuitPoints.push(p);}
 const podiumPoints:T.Vector3[]=[];
 for(const x of [-30,30])for(const y of [0,19])for(const z of [-20,0])
  podiumPoints.push(new T.Vector3(x,y,z));
 const gridPoints:T.Vector3[]=[],gridAim=new T.Vector3(),gridDirection=new T.Vector3();
 if(m.race.config.gridLanes){
  for(let i=0;i<8;i++)for(const side of [-4,4])for(const y of [0,10]){
   locatePoint(-(m.race.config.gridLeadIn??0)-i*m.race.config.gridGap, m.qualifying.lapLength,m.race.config.gridLanes[i]+side,m.race.grid[i],false);
   gridPoints.push(positionBuffer.clone().setY(y));
  }
  locatePoint(-(m.race.config.gridLeadIn??0)-m.race.config.gridGap*3.5,m.qualifying.lapLength,0,m.race.grid[0],false);
  gridAim.copy(positionBuffer).setY(3);gridDirection.copy(tangentBuffer).multiplyScalar(-.65).setY(.76).normalize();
 }
 const frameCache=new Map<'wide'|'podium'|'grid'|'gridFront',{aspect:number;distance:number}>();
 function frameCamera(key:'wide'|'podium'|'grid'|'gridFront',aim:T.Vector3,direction:T.Vector3,points:T.Vector3[],initial:number,min:number,max:number){
  const cached=frameCache.get(key);
  let distance=cached&&Math.abs(cached.aspect-camera.aspect)<.001?cached.distance:initial;
  if(!cached||Math.abs(cached.aspect-camera.aspect)>=.001){
   for(let pass=0;pass<6;pass++){
    camera.position.copy(aim).addScaledVector(direction,distance);camera.lookAt(aim);camera.updateMatrixWorld();
    let x=0,y=0;
    for(const world of points){const screen=projectBuffer.copy(world).project(camera);x=Math.max(x,Math.abs(screen.x));y=Math.max(y,Math.abs(screen.y));}
    const ratio=Math.max(x/.80,y/.76);
    if(!Number.isFinite(ratio)||Math.abs(ratio-1)<.02)break;
    const next=Math.max(min,Math.min(max,distance*ratio));
    if(Math.abs(next-distance)<.5)break;
    distance=next;
   }
   frameCache.set(key,{aspect:camera.aspect,distance});
  }
  camera.position.copy(aim).addScaledVector(direction,distance);camera.lookAt(aim);
 }
 const wideDirection=new T.Vector3(.42,.62,.66).normalize();
 const podiumDirection=new T.Vector3(0,.24,1).normalize();
 const gridFrontDirection=gridDirection.clone();gridFrontDirection.x*=-1;gridFrontDirection.z*=-1;
 let lost=false;const onLost=(e:Event)=>{e.preventDefault();lost=true;host.dataset.error='WebGL context lost — 새로고침해 주세요.';};renderer.domElement.addEventListener('webglcontextlost',onLost);
 const lapLength=m.qualifying.lapLength;
 const badgeOrder=cars.map((_,i)=>i),occupiedX=new Float64Array(3),occupiedY=new Float64Array(3);
 let badgeOrderDirty=true,lastFocus='';
 const priority=(kind:BadgeKind|null)=>kind==='ULTIMATE'?5:kind==='EXTERNAL'||kind==='MAJOR'?6:kind==='MEDIUM'?4:1;
 function updateBadge(index:number,kind:BadgeKind|null){
  const car=cars[index];if(car.lastBadge===kind)return;
  car.lastBadge=kind;car.badge.hidden=!kind;badgeOrderDirty=true;
  if(kind){car.badge.textContent=eventBadges[kind].symbol;car.badge.title=eventBadges[kind].label;car.badge.dataset.kind=kind;const activation=kind==='ULTIMATE'?ultimateIndex.get(m.race.racers[index].id):undefined;car.badge.style.setProperty('--event-color',activation?(activation.type==='hyper'?'#9beeff':'#ffdc52'):eventBadges[kind].accent);if(activation)car.badge.title=(activation.type==='hyper'?'HYPER':'GOLD')+' ULTIMATE';
   car.badge.style.width=car.badge.style.height=(priority(kind)>=4?20:14)+'px';}
 }
 function placeBadges(ms:number,focus:string){
  camera.updateMatrixWorld();
  // Only eight dynamic groups need world matrices. Static track/podium were baked once.
  for(const car of cars)if(car.group.visible)car.group.updateMatrixWorld(true);
  if(badgeOrderDirty||focus!==lastFocus){badgeOrder.sort((a,b)=>priority(cars[b].lastBadge)-priority(cars[a].lastBadge)||Number(m.race.racers[b].id===focus)-Number(m.race.racers[a].id===focus));badgeOrderDirty=false;lastFocus=focus;}
  let occupied=0;
  for(const i of badgeOrder){
   const car=cars[i];if(!car.group.visible||!car.lastBadge||occupied>=3){car.badge.hidden=true;continue;}
   // Anchor world matrix is current; getWorldPosition would update ancestor matrices again.
   const pos=projectBuffer.setFromMatrixPosition(car.anchor.matrixWorld).project(camera);
   if(pos.z>1||pos.z< -1||Math.abs(pos.x)>.93||Math.abs(pos.y)>.85){car.badge.hidden=true;continue;}
   const x=(pos.x+1)*width/2,y=(1-pos.y)*height/2-(renderer instanceof SVGRenderer?22:10);
   let overlap=false;for(let n=0;n<occupied;n++)if((occupiedX[n]-x)**2+(occupiedY[n]-y)**2<784)overlap=true;
   if(overlap){car.badge.hidden=true;continue;}
   occupiedX[occupied]=x;occupiedY[occupied++]=y;car.badge.hidden=false;
   car.badge.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
   const age=ms-m.raceStartMs-car.impactAt;
   car.badge.style.opacity=String(car.impactAt&&age>2000&&age<2600?Math.max(0,1-(age-2000)/600):.95);
  }
 }
 function locate(r:RacerFrame,index:number,ms:number,visualLane=false){
  const grid=m.race.grid.indexOf(r.id);
  const base=m.race.config.gridLanes?.[grid]??(index%4-1.5)*3.2;
  const blend=ms<m.raceStartMs?0:gridBlend(ms-m.raceStartMs);
  const offset=(visualLane?base*blend+lanes[index]*(1-blend):base)+(r.status==='DNF'||r.status==='DSQ'?17:0);
  const inRace=ms>=m.raceStartMs&&ms<m.ceremonyStartMs;
  const raceMs=ms-m.raceStartMs;
  const visualProgress=inRace?displayedProgress(m.race,r,raceMs,finish):r.progress;
  const {p,t}=locatePoint(visualProgress,lapLength,offset,r.id,inRace);
  const car=cars[index];car.group.position.copy(p);car.group.rotation.set(0,Math.atan2(t.x,t.z),0);
  const wormhole=wormholePhase(m,ms,r.id);
  car.group.scale.setScalar(wormhole?.phase==='transit'?.15:1);
  if(wormhole?.phase==='transit')car.group.visible=false;
  if(r.motion==='DAMAGED'||r.motion==='STOPPED'&&r.status==='RACING')car.group.rotation.y+=Math.sin(ms/110)*.25;
  car.group.position.y=r.ultimate?.6+Math.sin(ms/90)*.12:0;
  car.trail.visible=r.motion==='BOOST'||r.motion==='SLIPSTREAM'||r.motion==='ULTIMATE';car.trail.scale.z=r.ultimate?1.5:r.motion==='SLIPSTREAM'?.6:1;
  car.ring.visible=r.ultimate&&!car.ultimateFx;
  car.ultimateFx?.update(inRace&&r.status==='RACING'?ultimateIndex.get(r.id):undefined,raceMs,reducedMotion);
  if(wormhole&&wormhole.phase!=='afterburn'&&car.ultimateFx)car.ultimateFx.root.visible=false;
  if(car.ultimateFx&&r.ultimate)car.trail.visible=false;
  const justFinished=inRace&&r.status==='FINISHED';
  car.finishGlow.visible=justFinished;car.finishRing.visible=justFinished;
  if(justFinished){car.trail.visible=false;car.ring.visible=false;}

  const recent=inRace?recentImpact(r.id,ms-m.raceStartMs):null;
  car.impact.visible=recent!==null&&r.status==='RACING';
  let badgeKind:BadgeKind|null=null;
  if(r.status==='RACING'){
   if(!inRace)badgeKind=r.motion==='DAMAGED'?'QUALIFYING':null;
   else if(recent)badgeKind=recent.kind;
   else if(r.ultimate||r.motion==='ULTIMATE')badgeKind='ULTIMATE';
   else if(r.motion==='BOOST')badgeKind='BOOST';
   else if(r.motion==='SLIPSTREAM')badgeKind='SLIPSTREAM';
   else if(r.motion==='PENALTY')badgeKind='PENALTY';
   else if(r.motion==='DAMAGED')badgeKind='DAMAGED';
  }
  car.impactAt=recent?.ms??0;updateBadge(index,badgeKind);
 }
 const render=(ms:number,manual:string|null,manualShot:'auto'|'chase'|'front'|'side'|'trackside'='chase')=>{
  if(lost||disposed)return false;
  const state=meetingAt(m,ms),cue=cameraAt(m,ms,manual,manualShot);podium.visible=state.phase==='ceremony'&&!modernPodium;if(modernPodium)modernPodium.root.visible=state.phase==='ceremony';trackWorld.visible=state.phase!=='ceremony';gridMarks.visible=state.phase!=='ceremony'&&ms<m.raceStartMs+5000;
  if(cue.shot!=='trackside'&&camera.fov!==48){camera.fov=48;camera.updateProjectionMatrix();}
  cars.forEach(c=>{c.group.visible=false;if(c.ultimateFx)c.ultimateFx.root.visible=false;});
  if(state.phase==='ceremony'&&modernPodium){
   const podiumPose=modernPodium.update(ms,camera,reducedMotion);if(motionProbe)host.dataset.podium=JSON.stringify(podiumPose);
  }else if(state.phase==='ceremony'){
   const decided=!m.specialDsq||state.ceremonyMs>=20000;
   const top=(decided?m.official:m.race.results).filter(r=>r.status==='FINISHED').slice(0,3);
   top.forEach((r,rank)=>{const i=racerIndex.get(r.id)!,car=cars[i];car.group.visible=true;car.group.position.set(rank===0?0:rank===1?-21:21,[11,7,4][rank],-10);car.group.rotation.set(0,.3,0);car.trail.visible=false;car.ring.visible=false;car.finishGlow.visible=false;car.finishRing.visible=false;updateBadge(i,null);});
   frameCamera('podium',podiumAim,podiumDirection,podiumPoints,52,34,500);
  }else{
   const frames=state.phase==='grid'?m.race.frames[0].racers:state.racers;
   if(m.raceBroadcast?.presentation&&(state.phase==='race'||state.phase==='qualifying')){
    laneActive.fill(0);
    for(const r of frames){const i=racerIndex.get(r.id)!;const progress=state.phase==='race'?displayedProgress(m.race,r,ms-m.raceStartMs,finish):r.progress;
     const {p,t}=locatePoint(progress,lapLength,0,r.id,state.phase==='race');lanePoints[i*2]=p.x;lanePoints[i*2+1]=p.z;laneHeadings[i*2]=t.x;laneHeadings[i*2+1]=t.z;laneActive[i]=r.status==='RACING'||r.status==='FINISHED'?1:0;}
    passingLanes(lanePoints,laneHeadings,laneActive,laneOrder,lanes);
   }
   frames.forEach(r=>{const i=racerIndex.get(r.id)!;cars[i].group.visible=true;locate(r,i,ms,!!m.raceBroadcast?.presentation&&(state.phase==='race'||state.phase==='qualifying'));});
   const index=racerIndex.get(cue.racerId)!,target=targetBuffer.copy(cars[index].group.position);
   const frame=frames.find(r=>r.id===cue.racerId);
   if(cue.shot==='wide'||!frame){
    if(m.raceBroadcast&&ms>=m.raceBroadcast.preshowStartMs&&ms<m.raceStartMs){
     const local=ms-m.raceBroadcast.preshowStartMs;
     if(cue.reason==='START LIGHTS'||cue.reason.startsWith('COUNTDOWN')){
      const finalShot=cue.reason==='COUNTDOWN 1';frameCamera(finalShot?'gridFront':'grid',gridAim,finalShot?gridFrontDirection:gridDirection,gridPoints,120,90,800);
     }else if(cue.reason==='CORNER TOUR'||cue.reason==='SHORTCUT TOUR'){
      const branch=cue.reason==='SHORTCUT TOUR';
      spatialPointInto((branch?.30:.42)*lapLength,lapLength,0,branch,positionBuffer,tangentBuffer);
      aimBuffer.copy(positionBuffer);aimBuffer.y=2;
      camera.position.copy(aimBuffer);camera.position.x+=Math.cos(local/9000)*90;camera.position.z+=Math.sin(local/9000)*90;camera.position.y=85;camera.lookAt(aimBuffer);
     }else{camera.position.set(Math.cos(local/25000)*460,340,Math.sin(local/25000)*460);camera.lookAt(wideAim);}
    }else frameCamera('wide',wideAim,wideDirection,circuitPoints,430,260,1600);
   }
   else {
    const currentProgress=state.phase==='race'?displayedProgress(m.race,frame,ms-m.raceStartMs,finish):frame.progress;
    const {t}=locatePoint(currentProgress,lapLength,0,frame.id,state.phase==='race');const side=sideBuffer.set(-t.z,0,t.x);
    const aim=aimBuffer.copy(target);aim.y+=2;
    const shot:CameraCue['shot']=m.raceBroadcast?.presentation==='d1'?cue.shot:manual&&manualShot!=='auto'?manualShot:cue.shot;
    const station=shot==='trackside'?TV_STATIONS.find(s=>s.id===cue.stationId):null;
    if(station){
     camera.position.set(...station.position);
     // Two-car battles share the fixed lens. Bounded, continuous spatial weighting.
     let weight=1;for(const other of cars)if(other.group.visible&&other!==cars[index]){
      const w=Math.max(0,1-other.group.position.distanceTo(target)/14)*.3;
      aim.addScaledVector(other.group.position,w);weight+=w;
     }
     aim.divideScalar(weight);camera.lookAt(aim);
     // A TV lens stays physically fixed; bounded, time-derived zoom keeps racers
     // readable in a 360px player rather than shrinking them to a few pixels.
     const span=60/Math.min(1,camera.aspect),distance=camera.position.distanceTo(aim);
     const fov=Math.max(12,Math.min(48,2*Math.atan(span/(2*distance))*180/Math.PI));
     if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
    }else if(shot==='front'){
     // Camera rides ahead of the racer, looking back toward its nose.
     camera.position.copy(target).addScaledVector(t,26).addScaledVector(side,7);
     camera.position.y+=11;
     camera.lookAt(aim);
    }else if(shot==='side'){
     camera.position.copy(target).addScaledVector(t,2).addScaledVector(side,24);
     camera.position.y+=20;
     camera.lookAt(aim);
    }else{
     camera.position.copy(target).addScaledVector(t,-27).addScaledVector(side,10);
     camera.position.y+=13;
     camera.lookAt(aim.addScaledVector(t,12));
    }
    if(!station&&m.raceBroadcast?.presentation&&(state.phase==='race'||state.phase==='qualifying')){
     let density=0;for(const other of cars)if(other.group.visible&&other!==cars[index]){const d=other.group.position.distanceTo(target);density+=Math.max(0,1-d/18);}
     const widen=Math.min(1,density/3);camera.position.sub(target).multiplyScalar(1+widen*.25).add(target);camera.position.y+=widen*8;camera.lookAt(aim);
    }
   }
  }
  const wormhole=wormholeFx?.update(ms,reducedMotion);
  if(cue.reason.startsWith('WORMHOLE ')){const car=cars[racerIndex.get(cue.racerId)!];wormholeFx?.camera(ms,camera,cue.racerId,car.group.position,car.group.rotation.y);}
  host.dataset.wormhole=wormhole?.phase??'';
  // Portrait full-screen needs a distant wide camera. Keep the framed track
  // visible instead of fading it out at the desktop-only fog distance.
  const viewDistance=camera.position.length();fog.near=Math.max(700,viewDistance-500);fog.far=Math.max(1500,viewDistance+700);
  camera.updateMatrixWorld();
  placeBadges(ms,cue.racerId);
  host.dataset.camera=m.raceBroadcast?.presentation==='d1'?cue.shot:manual&&manualShot!=='auto'?manualShot:cue.shot;host.dataset.station=cue.stationId??'';host.dataset.target=cue.racerId;
  let finishers=0;for(const car of cars)if(car.finishGlow.visible)finishers++;host.dataset.finishers=String(finishers);
  if(motionProbe)host.dataset.lanes=JSON.stringify(Array.from(lanes));
  // Read-only motion probe for actual browser continuity/seek QA; no simulation writes.
  if(motionProbe)host.dataset.pose=JSON.stringify({ms,reducedMotion,ultimateEffects:cars.map(c=>!!c.ultimateFx?.root.visible),fov:camera.fov,camera:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fog:[fog.near,fog.far],cars:cars.map(c=>({visible:c.group.visible,projectedHeight:Math.abs(projectBuffer.set(c.group.position.x,c.group.position.y+10,c.group.position.z).project(camera).y-projectBuffer.copy(c.group.position).project(camera).y)*height/2,position:c.group.position.toArray(),screen:projectBuffer.copy(c.group.position).project(camera).toArray(),yaw:c.group.rotation.y}))});
  renderer.render(scene,camera);
  return true;
 };
 scene.updateMatrixWorld(true);scene.matrixWorldAutoUpdate=false;
 return {render,stats(){return {type:host.dataset.renderer,gpu,disposed,width,height,canvasWidth:renderer.domElement.getAttribute('width'),canvasHeight:renderer.domElement.getAttribute('height'),geometries:renderer instanceof T.WebGLRenderer?renderer.info.memory.geometries:null,textures:renderer instanceof T.WebGLRenderer?renderer.info.memory.textures:null,calls:renderer instanceof T.WebGLRenderer?renderer.info.render.calls:null,triangles:renderer instanceof T.WebGLRenderer?renderer.info.render.triangles:null};},dispose(){if(disposed)return;disposed=true;observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',onLost);scene.traverse(obj=>{if(obj instanceof T.Mesh||obj instanceof T.LineSegments)obj.geometry.dispose();if(obj instanceof T.Mesh||obj instanceof T.Sprite||obj instanceof T.LineSegments){const mats=Array.isArray(obj.material)?obj.material:[obj.material];for(const mat of mats){if('map' in mat&&(mat as T.MeshStandardMaterial).map)(mat as T.MeshStandardMaterial).map!.dispose();mat.dispose();}}});for(const car of cars)car.badge.remove();if(renderer instanceof T.WebGLRenderer){renderer.dispose();renderer.forceContextLoss();}renderer.domElement.remove();}};
}
