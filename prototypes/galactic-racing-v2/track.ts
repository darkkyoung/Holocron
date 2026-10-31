import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// One closed, arc-length sampled greybox circuit. Units are render-space metres;
// progress maps to the authoritative 3.6 km lap, never back into the simulator.
export const route=new T.CatmullRomCurve3([
 new T.Vector3(-180,0,120),new T.Vector3(20,0,120),new T.Vector3(200,0,120),
 new T.Vector3(235,0,65),new T.Vector3(220,0,-45),new T.Vector3(145,0,-55),
 new T.Vector3(95,0,35),new T.Vector3(20,0,30),new T.Vector3(-20,0,-60),
 new T.Vector3(40,0,-120),new T.Vector3(-90,0,-150),new T.Vector3(-220,0,-120),
 new T.Vector3(-245,0,-20),new T.Vector3(-230,0,75),
],true,'centripetal');
route.arcLengthDivisions=3000;route.updateArcLengths();
export function point(progress:number,lapLength:number,offset=0){
 return pointInto(progress,lapLength,offset,new T.Vector3(),new T.Vector3());
}
/** Reusable outputs for the hot render path; same arc-length curve and progress. */
export function pointInto(progress:number,lapLength:number,offset:number,p:T.Vector3,t:T.Vector3){
 const u=((progress/lapLength)%1+1)%1;route.getPointAt(u,p);route.getTangentAt(u,t);
 p.x-=t.z*offset;p.z+=t.x*offset;return {p,t};
}
function ribbon(offset:number,width:number,color:number){
 const positions:number[]=[],indices:number[]=[];
 for(let i=0;i<=600;i++){const u=i/600,p=route.getPointAt(u),t=route.getTangentAt(u),n=new T.Vector3(-t.z,0,t.x);
 for(const side of [-1,1]){const v=p.clone().addScaledVector(n,offset+side*width/2);positions.push(v.x,.02,v.z);}
 if(i<600){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
 return new T.Mesh(g,new T.MeshStandardMaterial({color,side:T.DoubleSide,roughness:.9}));
}
export function box(w:number,h:number,d:number,color:number){return new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,roughness:.7}));}
export function buildTrack(scene:T.Object3D,software=false,showPit=true){
 scene.add(ribbon(0,23,0x293340),ribbon(-12,1.5,0xffdc56),ribbon(12,1.5,0xffdc56));
 // Small floor polygons avoid painter-order occlusion in the GPU-free SVG renderer.
 const floor=new T.Mesh(new T.PlaneGeometry(1400,1400),new T.MeshStandardMaterial({color:0x121e2a,side:T.DoubleSide}));floor.rotation.x=-Math.PI/2;floor.position.y=-.6;if(!software)scene.add(floor);else {floor.geometry.dispose();floor.material.dispose();}
 // Repeated route barriers and outside canyon blocks are scenery, never fake physics.
 for(let i=0;i<120;i++)for(const side of [-1,1]){const {p,t}=point(i/120,1,side*14);const barrier=box(1.2,2,6,i%2?0x617588:0x303f50);barrier.position.copy(p).y=1;barrier.rotation.y=Math.atan2(t.x,t.z);scene.add(barrier);}
 for(let i=0;i<38;i++){const {p}=point(i/38,1,35+(i%4)*8);const rock=box(13+i%7,7+i%5*5,15,0x26384a);rock.position.copy(p).y=rock.geometry.parameters.height/2;rock.rotation.y=i*1.7;scene.add(rock);}
 // A marked pit apron beside the start straight; stop events move sideways only.
 if(showPit){const pit=box(130,.15,14,0x405568);pit.position.set(-110,.1,144);scene.add(pit);
  for(let i=0;i<8;i++){const bay=box(11,5,8,0x536674);bay.position.set(-160+i*15,2.5,158);scene.add(bay);}}
 const {p,t}=point(0,1);const gate=new T.Group();gate.position.copy(p);gate.rotation.y=Math.atan2(t.x,t.z);
 for(const side of [-1,1]){const pole=box(1.8,18,1.8,0xffd84a);pole.position.set(side*15,9,0);gate.add(pole);}
 const cross=box(32,3,2,0xffd84a);cross.position.y=18;gate.add(cross);
 for(let i=0;i<12;i++){const tile=box(2,0.1,4,i%2?0xffffff:0x090e15);tile.position.set(-11+i*2,.15,0);gate.add(tile);}scene.add(gate);
 // Decorative hazard gates identify the canyon section; collision outcomes come from timeline events.
 for(const u of [.46,.52,.58]){const {p,t}=point(u,1);const group=new T.Group();group.position.copy(p);group.rotation.y=Math.atan2(t.x,t.z);
 const b=box(30,1,1,0xff865b);b.position.y=9;group.add(b);for(const side of [-1,1]){const a=box(1,9,1,0xff865b);a.position.set(side*15,4.5,0);group.add(a);}scene.add(group);}
 if(!software)batchScenery(scene);
 scene.updateMatrixWorld(true);
 scene.traverse(object=>{object.matrixAutoUpdate=false;});
}

/** Static scenery only. Keep SVG's individual painter-order polygons intact. */
function batchScenery(root:T.Object3D){
 root.updateMatrixWorld(true);
 const batches=new Map<string,{material:T.MeshStandardMaterial;geometries:T.BufferGeometry[]}>();
 root.traverse(object=>{
  if(!(object instanceof T.Mesh)||!(object.material instanceof T.MeshStandardMaterial))return;
  const material=object.material,key=[material.color.getHex(),material.roughness,material.side].join(':');
  let batch=batches.get(key);if(!batch){batch={material:material.clone(),geometries:[]};batches.set(key,batch);}
  // Ribbon has no UVs. No scenery material uses a texture, so omit unused UV data.
  const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);geometry.deleteAttribute('uv');
  batch.geometries.push(geometry);object.geometry.dispose();material.dispose();
 });
 root.clear();
 for(const batch of batches.values()){
  const geometry=mergeGeometries(batch.geometries,false);
  for(const source of batch.geometries)source.dispose();
  if(!geometry)throw Error('STATIC_SCENERY_BATCH_FAILED');
  geometry.computeBoundingSphere();root.add(new T.Mesh(geometry,batch.material));
 }
}
