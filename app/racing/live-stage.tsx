'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import type {Angle,liveScene,Snapshot} from '../../prototypes/galactic-racing-v2/live-scene';
export default function LiveStage({view,map}:{view:Snapshot;map:ReactNode}){
 const host=useRef<HTMLDivElement>(null),scene=useRef<ReturnType<typeof liveScene>|null>(null);
 const [mode,setMode]=useState<'loading'|'3D'|'2D'>('loading'),[slot,setSlot]=useState(''),[angle,setAngle]=useState<Angle>('auto');
 useEffect(()=>{let active=true;
 import('../../prototypes/galactic-racing-v2/live-scene').then(({liveScene})=>{
 if(!active||!host.current)return;scene.current=liveScene(host.current,()=>{if(active)setMode('2D');});setMode('3D');
 }).catch(()=>{if(active)setMode('2D');});return ()=>{active=false;scene.current?.dispose();scene.current=null;};
 },[]);
 useEffect(()=>{if(mode==='3D')scene.current?.update(view);},[mode,view]);
 useEffect(()=>{if(mode==='3D')scene.current?.camera(slot,angle);},[mode,slot,angle]);
 return <><div className={'live-stage mode-'+mode} data-mode={mode}><div className="live-gl" ref={host}/><div className="live-map">{map}</div><span className="live-mode">{mode==='3D'?'3D · WebGL':mode==='2D'?'2D · 트랙 지도':'중계 연결 중'}</span></div>
 {mode==='3D'&&<div className="camera-bar"><label>중계 대상 <select value={slot} onChange={e=>setSlot(e.target.value)}><option value="">자동 중계</option>{view.entries?.map(e=><option key={e.slot} value={e.slot}>{e.name}</option>)}</select></label><label>시점 <select value={angle} onChange={e=>setAngle(e.target.value as Angle)}><option value="auto">자동</option><option value="chase">후방</option><option value="front">정면</option><option value="trackside">트랙사이드</option><option value="wide">전체</option></select></label></div>}</>;
}
