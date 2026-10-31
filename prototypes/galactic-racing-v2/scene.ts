import * as T from 'three';
import {SVGRenderer,SVGObject} from 'three/addons/renderers/SVGRenderer.js';
import {point,buildTrack,box} from './track';
import {meetingAt,cameraAt} from '../../lib/racing/v2/playback';
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
// Routine draft/boost badges repeat throughout a pack; keep them icon-only.
// Unusual incidents retain readable text, avoiding overlapping banners.
const compactBadge=(kind:BadgeKind)=>['SLIPSTREAM','BOOST','DAMAGED','PENALTY','QUALIFYING'].includes(kind);
function badgeTexture(kind:BadgeKind){
 const detail=eventBadges[kind],compact=compactBadge(kind);
 const canvas=document.createElement('canvas');canvas.width=compact?128:384;canvas.height=compact?128:104;
 const ctx=canvas.getContext('2d')!;
 ctx.fillStyle='#0b1420e8';ctx.strokeStyle=detail.accent;ctx.lineWidth=4;
 ctx.beginPath();
 if(compact)ctx.arc(64,64,54,0,Math.PI*2);
 else ctx.roundRect(7,8,370,88,27);
 ctx.fill();ctx.stroke();
 if(compact){
  ctx.font='bold 76px Arial, sans-serif';ctx.textAlign='center';ctx.fillStyle=detail.accent;
  ctx.fillText(detail.symbol,64,91);
 }else{
  ctx.font='bold 40px Arial, sans-serif';ctx.textAlign='center';ctx.fillStyle=detail.accent;
  ctx.fillText(detail.symbol,57,65);
  ctx.font='bold 31px "Noto Sans KR", Arial, sans-serif';ctx.textAlign='left';ctx.fillStyle='#f6f7f9';
  ctx.fillText(detail.label,102,65);
 }
 const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;
 return map;
}

export function createScene(host:HTMLElement,m:Meeting){
 let renderer:T.WebGLRenderer|SVGRenderer;
 try{renderer=new T.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));host.dataset.renderer='WebGL 2';}
 catch{renderer=new SVGRenderer();renderer.setPrecision(1);host.dataset.renderer='SVG 3D · GPU 미사용';}
 renderer.setClearColor(new T.Color(0x0c1521),1);host.appendChild(renderer.domElement);
 renderer.domElement.setAttribute('aria-label','서버 타임라인 기반 3D 레이스');renderer.domElement.setAttribute('role','img');
 const scene=new T.Scene();scene.fog=new T.Fog(0x0c1521,700,1500);
 const camera=new T.PerspectiveCamera(48,1,.5,2000);
 scene.add(new T.HemisphereLight(0xbdeaff,0x24303a,2.6));const sun=new T.DirectionalLight(0xffedcd,3);sun.position.set(100,250,100);scene.add(sun);
 // Race scenery must never obscure the ceremony podium or its racers.
 const trackWorld=new T.Group();scene.add(trackWorld);buildTrack(trackWorld,renderer instanceof SVGRenderer,!m.race.config.noPitStops);
 const textures=new Map<BadgeKind,T.CanvasTexture>();
 function textureFor(kind:BadgeKind){
  let map=textures.get(kind);if(!map){map=badgeTexture(kind);textures.set(kind,map);}return map;
 }
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
  return item&&elapsedMs-item.ms<2600?item.kind:null;
 }
 const cars=m.race.racers.map((r,i)=>{
  const group=new T.Group(),body=box(3,1.4,5.5,Number(r.color.replace('#','0x')));body.position.y=1.3;group.add(body);
  const cockpit=box(1.9,.9,2.5,0x17212b);cockpit.position.set(0,2,0);group.add(cockpit);
  for(const x of [-1.8,1.8])for(const z of [-1.6,1.6]){const wheel=box(.8,1.2,1.4,0x080c12);wheel.position.set(x,.8,z);group.add(wheel);}
  const wing=box(5,.3,1,0xc1d7e3);wing.position.set(0,1.9,-2.5);group.add(wing);
  let sprite:T.Object3D;
  if(renderer instanceof T.WebGLRenderer){const image=new T.Sprite(new T.SpriteMaterial({map:portrait(r.name,r.color,i),depthTest:true}));image.scale.set(5,6.25,1);sprite=image;}
  else {const node=document.createElementNS('http://www.w3.org/2000/svg','g');
   const add=(tag:string,attrs:Record<string,string>)=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));node.appendChild(el);return el;};
   add('rect',{x:'-10',y:'-3',width:'20',height:'17',rx:'5',fill:r.color});add('circle',{cx:'0',cy:'-8',r:'9',fill:'#dce5ec'});add('rect',{x:'-7',y:'-11',width:'14',height:'5',rx:'2',fill:'#172a3a'});const text=add('text',{x:'0',y:'10','text-anchor':'middle','font-size':'10',fill:'#172a3a'});text.textContent=String(i+1);sprite=new SVGObject(node);sprite.renderOrder=100000;}
  sprite.position.y=6;group.add(sprite);
  const trail=box(1.6,.4,7,0xffd745);trail.position.set(0,.6,-5);group.add(trail);
  const ring=new T.Mesh(new T.TorusGeometry(4,.18,6,24),new T.MeshBasicMaterial({color:0xffdd33}));ring.rotation.x=Math.PI/2;ring.position.y=.3;group.add(ring);
  const impact=new T.Mesh(new T.TorusGeometry(4.8,.3,6,20),new T.MeshBasicMaterial({color:0xff7662}));impact.rotation.x=Math.PI/2;impact.position.y=1;group.add(impact);
  // Each racer receives one lightweight camera-facing badge above the 2D helmet.
  // Textures are shared and created lazily; no external asset, model or per-frame canvas draw.
  let badge:T.Sprite|SVGObject,badgeLabel:SVGTextElement|null=null,badgeRect:SVGRectElement|null=null;
  if(renderer instanceof T.WebGLRenderer){
   const item=new T.Sprite(new T.SpriteMaterial({map:textureFor('BOOST'),transparent:true,depthTest:false}));
   item.scale.set(13.5,3.65,1);badge=item;
  }else{
   const node=document.createElementNS('http://www.w3.org/2000/svg','g');
   const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');
   for(const [key,value] of Object.entries({x:'-40',y:'-13',width:'80',height:'25',rx:'6',fill:'#0b1420',stroke:'#f5d276'}))
    rect.setAttribute(key,value);
   badgeLabel=document.createElementNS('http://www.w3.org/2000/svg','text');
   for(const [key,value] of Object.entries({x:'0',y:'4','text-anchor':'middle','font-size':'11',fill:'#ffffff'}))
    badgeLabel.setAttribute(key,value);
   node.appendChild(rect);node.appendChild(badgeLabel);badgeRect=rect;badge=new SVGObject(node);
  }
  badge.position.set(0,11.7,0);badge.visible=false;group.add(badge);
  scene.add(group);return {group,trail,ring,impact,sprite,badge,badgeLabel,badgeRect,lastBadge:null as BadgeKind|null};
 });
 const podium=new T.Group();podium.position.set(0,0,-10);
 const podiumFloor=box(82,1,34,0x1b293b);podiumFloor.position.y=-.5;podium.add(podiumFloor);
 [1,0,2].forEach((rank,i)=>{const h=[11,7,4][rank],block=box(17,h,18,rank===0?0xdbb644:0x536b82);block.position.set((i-1)*21,h/2,0);podium.add(block);});scene.add(podium);podium.visible=false;
 // Initialize the projection before the first frame; ResizeObserver may fire later.
 const fitViewport=()=>{const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
  renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};
 fitViewport();
 const observer=new ResizeObserver(fitViewport);observer.observe(host);
 // Frame a circuit or podium to a fixed screen occupancy, not a hardcoded distance.
 // The same geometry is projected for WebGL and the no-GPU SVG fallback.
 const circuitPoints:T.Vector3[]=[];
 for(let i=0;i<64;i++)for(const offset of [-19,19]){const {p}=point(i/64,1,offset);p.y=10;circuitPoints.push(p);}
 const podiumPoints:T.Vector3[]=[];
 for(const x of [-30,30])for(const y of [0,19])for(const z of [-20,0])
  podiumPoints.push(new T.Vector3(x,y,z));
 const frameCache=new Map<'wide'|'podium',{aspect:number;distance:number}>();
 function frameCamera(key:'wide'|'podium',aim:T.Vector3,direction:T.Vector3,points:T.Vector3[],initial:number,min:number,max:number){
  const cached=frameCache.get(key);
  let distance=cached&&Math.abs(cached.aspect-camera.aspect)<.001?cached.distance:initial;
  if(!cached||Math.abs(cached.aspect-camera.aspect)>=.001){
   for(let pass=0;pass<6;pass++){
    camera.position.copy(aim).addScaledVector(direction,distance);camera.lookAt(aim);camera.updateMatrixWorld();
    let x=0,y=0;
    for(const world of points){const screen=world.clone().project(camera);x=Math.max(x,Math.abs(screen.x));y=Math.max(y,Math.abs(screen.y));}
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
 let lost=false;const onLost=(e:Event)=>{e.preventDefault();lost=true;host.dataset.error='WebGL context lost — 새로고침해 주세요.';};renderer.domElement.addEventListener('webglcontextlost',onLost);
 const lapLength=m.qualifying.lapLength;
 function updateBadge(index:number,kind:BadgeKind|null){
  const car=cars[index];
  car.badge.visible=kind!==null;
  if(!kind||car.lastBadge===kind)return;
  car.lastBadge=kind;
  if(car.badge instanceof T.Sprite){
   const mat=car.badge.material as T.SpriteMaterial;
   mat.map=textureFor(kind);mat.needsUpdate=true;
   const simple=compactBadge(kind);car.badge.scale.set(simple?3.8:11.2,simple?3.8:3.15,1);
  }else if(car.badgeLabel){
   const simple=compactBadge(kind);
   car.badgeLabel.textContent=simple?eventBadges[kind].symbol:eventBadges[kind].symbol+' '+eventBadges[kind].label;
   car.badge.scale.setScalar(simple?.58:1);
   car.badgeRect?.setAttribute('stroke',eventBadges[kind].accent);
  }
 }
 function locate(r:RacerFrame,index:number,ms:number){
  const offset=(index%4-1.5)*3.2+(r.status==='DNF'||r.status==='DSQ'?17:0);
  const {p,t}=point(r.progress,lapLength,offset);
  const car=cars[index];car.group.position.copy(p);car.group.rotation.set(0,Math.atan2(t.x,t.z),0);
  if(r.motion==='DAMAGED'||r.motion==='STOPPED'&&r.status==='RACING')car.group.rotation.y+=Math.sin(ms/110)*.25;
  car.group.position.y=r.ultimate?.6+Math.sin(ms/90)*.12:0;
  car.trail.visible=['BOOST','SLIPSTREAM','ULTIMATE'].includes(r.motion);car.trail.scale.z=r.ultimate?1.5:r.motion==='SLIPSTREAM'?.6:1;
  car.ring.visible=r.ultimate;
  const inRace=ms>=m.raceStartMs&&ms<m.ceremonyStartMs;
  const recent=inRace?recentImpact(r.id,ms-m.raceStartMs):null;
  car.impact.visible=recent!==null&&r.status==='RACING';
  let badgeKind:BadgeKind|null=null;
  if(r.status==='RACING'){
   if(!inRace)badgeKind=r.motion==='DAMAGED'?'QUALIFYING':null;
   else if(recent)badgeKind=recent;
   else if(r.ultimate||r.motion==='ULTIMATE')badgeKind='ULTIMATE';
   else if(r.motion==='BOOST')badgeKind='BOOST';
   else if(r.motion==='SLIPSTREAM')badgeKind='SLIPSTREAM';
   else if(r.motion==='PENALTY')badgeKind='PENALTY';
   else if(r.motion==='DAMAGED')badgeKind='DAMAGED';
  }
  updateBadge(index,badgeKind);
 }
 return {render(ms:number,manual:string|null){
  if(lost)return;
  const state=meetingAt(m,ms),cue=cameraAt(m,ms,manual);podium.visible=state.phase==='ceremony';trackWorld.visible=!podium.visible;
  cars.forEach(c=>{c.group.visible=false;c.badge.visible=false;});
  if(state.phase==='ceremony'){
   const decided=!m.specialDsq||state.ceremonyMs>=20000;
   const top=(decided?m.official:m.race.results).filter(r=>r.status==='FINISHED').slice(0,3);
   top.forEach((r,rank)=>{const i=m.race.racers.findIndex(x=>x.id===r.id),car=cars[i];car.group.visible=true;car.group.position.set(rank===0?0:rank===1?-21:21,[11,7,4][rank],-10);car.group.rotation.set(0,.3,0);car.trail.visible=false;car.ring.visible=false;});
   frameCamera('podium',new T.Vector3(0,9,-10),podiumDirection,podiumPoints,52,34,500);
  }else{
   const frames=state.phase==='grid'?m.race.frames[0].racers:state.racers;
   frames.forEach(r=>{const i=m.race.racers.findIndex(x=>x.id===r.id);cars[i].group.visible=true;locate(r,i,ms);});
   const index=m.race.racers.findIndex(r=>r.id===cue.racerId),target=cars[index].group.position.clone();
   const frame=frames.find(r=>r.id===cue.racerId);
   if(cue.shot==='wide'||!frame){frameCamera('wide',new T.Vector3(0,4,0),wideDirection,circuitPoints,430,260,1600);}
   else {const {t}=point(frame.progress,lapLength);const side=new T.Vector3(-t.z,0,t.x);
    camera.position.copy(target).addScaledVector(t,cue.shot==='side'?5:-30).addScaledVector(side,cue.shot==='side'?33:13);camera.position.y+=cue.shot==='side'?17:16;
    camera.lookAt(target.addScaledVector(t,12).add(new T.Vector3(0,2,0)));}
  }
  renderer.render(scene,camera);
 },dispose(){observer.disconnect();renderer.domElement.removeEventListener('webglcontextlost',onLost);scene.traverse(obj=>{if(obj instanceof T.Mesh)obj.geometry.dispose();if(obj instanceof T.Mesh||obj instanceof T.Sprite){const mats=Array.isArray(obj.material)?obj.material:[obj.material];for(const mat of mats){if('map' in mat&&(mat as T.MeshStandardMaterial).map)(mat as T.MeshStandardMaterial).map!.dispose();mat.dispose();}}});for(const texture of textures.values())texture.dispose();if(renderer instanceof T.WebGLRenderer)renderer.dispose();renderer.domElement.remove();}};
}
