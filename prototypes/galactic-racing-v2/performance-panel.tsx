import {useEffect,useState,type RefObject} from 'react';
import type {createRenderLoop} from './render-loop';
import type {createScene} from './scene';

export default function PerformancePanel({clock,engine}:{
 clock:RefObject<ReturnType<typeof createRenderLoop>|null>;
 engine:RefObject<ReturnType<typeof createScene>|null>;
}){
 const [open,setOpen]=useState(()=>new URLSearchParams(location.search).has('perf'));
 const [report,setReport]=useState<object|null>(null);
 useEffect(()=>{
  if(!open)return;
  const update=()=>setReport({at:new Date().toISOString(),source:document.querySelector('.build-strip')?.textContent,
   userAgent:navigator.userAgent,viewport:[innerWidth,innerHeight],devicePixelRatio,
   playback:clock.current?.snapshot(),renderer:engine.current?.stats(),
   // Chromium-only estimate, not GPU memory or a portable leak proof.
   heap:(performance as Performance&{memory?:{usedJSHeapSize:number;totalJSHeapSize:number}}).memory?.usedJSHeapSize??null});
  update();const timer=setInterval(update,1000);return()=>clearInterval(timer);
 },[open,clock,engine]);
 const download=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='racing-performance.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <details className="performance-panel" open={open} onToggle={e=>{setOpen(e.currentTarget.open);if(e.currentTarget.open)document.querySelector('.player-screen')?.scrollIntoView({block:'start'});}}>
  <summary>개발자 성능 진단 · 30FPS 상한</summary>
  {open&&<><p>재생 후 최근 최대 900프레임을 측정합니다. 상한과 실제 FPS는 다릅니다. 물리 GPU 성능은 이 장치에서 확인하세요.</p>
   <button onClick={()=>clock.current?.resetTelemetry()}>측정 초기화</button> <button onClick={download}>측정 JSON 다운로드</button><pre>{JSON.stringify(report,null,2)}</pre></>}
 </details>;
}
