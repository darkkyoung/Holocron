/** Viewer clock only: no simulation ticks, events or results are modified. */
export const FRAME_MS=1000/30;
export const HUD_MS=200;
export interface LoopPlatform {now:()=>number;request:(fn:(time:number)=>void)=>number;cancel:(id:number)=>void}
export function createRenderLoop(options:{
 position:number;end:number;render:(position:number)=>void;hud:(position:number)=>void;
 ended:()=>void;platform?:LoopPlatform;
}){
 const platform=options.platform??{now:()=>performance.now(),request:requestAnimationFrame,cancel:cancelAnimationFrame};
 let anchor=options.position,started=platform.now(),end=options.end,rate=1,playing=false;
 let visible=true,disposed=false,pending=true,raf:number|null=null,lastDraw=-Infinity,lastHud=-Infinity;
 // Fixed-size telemetry; no history grows with the number of laps or replay loops.
 const intervals=new Float64Array(900),costs=new Float64Array(900);
 let count=0,cursor=0,total=0,previous:number|null=null,hudUpdates=0;
 const position=()=>Math.min(end,anchor+(playing?Math.max(0,platform.now()-started)*rate:0));
 const schedule=()=>{if(!disposed&&visible&&raf===null&&(playing||pending))raf=platform.request(frame);};
 function frame(time:number){
  raf=null;if(disposed||!visible)return;
  // No catch-up render burst. A tiny clock tolerance accommodates 60Hz timestamps.
  if(time-lastDraw<FRAME_MS-.1){schedule();return;}
  const at=position(),before=platform.now();options.render(at);
  const cost=platform.now()-before;
  if(playing){if(previous!==null){intervals[cursor]=time-previous;costs[cursor]=cost;cursor=(cursor+1)%intervals.length;count=Math.min(count+1,intervals.length);}previous=time;total++;}
  else previous=null;
  lastDraw=time;pending=false;
  if(time-lastHud>=HUD_MS||!playing||at>=end){options.hud(at);hudUpdates++;lastHud=time;}
  if(playing&&at>=end){anchor=end;playing=false;options.ended();}
  schedule();
 }
 return {
  position,
  configure(next:{playing:boolean;rate:number;end:number}){
   const now=platform.now();anchor=position();started=now;end=next.end;rate=next.rate;
   if(playing!==next.playing)previous=null;
   playing=next.playing;pending=true;schedule();
  },
  seek(ms:number,nextEnd=end){end=nextEnd;anchor=Math.max(0,Math.min(end,ms));started=platform.now();previous=null;pending=true;lastHud=-Infinity;options.hud(anchor);schedule();},
  invalidate(){pending=true;schedule();},
  visibility(value:boolean){visible=value;previous=null;if(!visible&&raf!==null){platform.cancel(raf);raf=null;}schedule();},
  snapshot(){
   const samples=Array.from(intervals.slice(0,count)).sort((a,b)=>a-b),work=Array.from(costs.slice(0,count)).sort((a,b)=>a-b);
   const p=(a:number[],q:number)=>a.length?a[Math.min(a.length-1,Math.floor((a.length-1)*q))]:0;
   const mean=count?samples.reduce((a,b)=>a+b,0)/count:0;
   return {capFps:30,frames:total,samples:count,capacity:900,averageFps:mean?1000/mean:0,
    medianFps:p(samples,.5)?1000/p(samples,.5):0,p05Fps:p(samples,.95)?1000/p(samples,.95):0,
    frameMs:{p50:p(samples,.5),p95:p(samples,.95),p99:p(samples,.99)},
    over33_3:count?samples.filter(x=>x>33.3).length/count:0,
    over50:count?samples.filter(x=>x>50).length/count:0,
    renderCpuMs:{p50:p(work,.5),p95:p(work,.95),p99:p(work,.99)},hudUpdates,playing,position:position(),pendingRaf:raf!==null};
  },
  dispose(){disposed=true;if(raf!==null)platform.cancel(raf);raf=null;},
 };
}
