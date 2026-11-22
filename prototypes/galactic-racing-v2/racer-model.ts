import * as T from 'three';
import {box} from './track';
export function portrait(name:string,color:string,index:number){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=160;const c=canvas.getContext('2d')!;
 c.fillStyle=color;c.beginPath();c.roundRect(20,72,88,75,22);c.fill();
 c.fillStyle='#dae8ec';c.beginPath();c.arc(64,53,35,0,Math.PI*2);c.fill();
 c.fillStyle=color;c.beginPath();c.arc(64,49,31,Math.PI,Math.PI*2);c.fill();
 c.fillStyle='#142131';c.fillRect(33,43,62,20);c.fillStyle='#84efff';c.fillRect(38,48,47,7);
 c.fillStyle='#142131';c.font='bold 28px sans-serif';c.textAlign='center';c.fillText(String(index+1),64,113);
 c.fillStyle='#ffffff';c.font='15px sans-serif';c.fillText(name,64,156);
 return new T.CanvasTexture(canvas);
}

export function racerModel(color:string){
  const group=new T.Group(),body=box(3,1.4,5.5,Number(color.replace('#','0x')));body.position.y=1.3;group.add(body);
  const cockpit=box(1.9,.9,2.5,0x17212b);cockpit.position.set(0,2,0);group.add(cockpit);
  for(const x of [-1.8,1.8])for(const z of [-1.6,1.6]){const wheel=box(.8,1.2,1.4,0x080c12);wheel.position.set(x,.8,z);group.add(wheel);}
  const wing=box(5,.3,1,0xc1d7e3);wing.position.set(0,1.9,-2.5);group.add(wing);
return {group,body};
}
