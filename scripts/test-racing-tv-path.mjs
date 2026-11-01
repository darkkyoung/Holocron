import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {loadV8} from './racing/load-v8.mjs';
const s=await loadV8();let frames=0,maxAngularSpeed=0,editMs=0;
try{
 for(let seed=0;seed<20;seed++){
  const raw=s.simulateMeetingV8('9rf-'+seed),start=performance.now(),m=s.forBroadcast(raw);editMs+=performance.now()-start;
  for(let i=0;i<m.cameras.length;i++){
   const cue=m.cameras[i];if(cue.shot!=='trackside')continue;
   const station=s.TV_STATIONS.find(x=>x.id===cue.stationId),until=m.cameras[i+1]?.atMs??m.race.durationTicks*250;let previous=null;
   for(let ms=cue.atMs;ms<until;ms+=1000/30){
    const r=s.meetingAt(m,m.raceStartMs+ms).racers.find(r=>r.id===cue.racerId);
    const p=s.routePoint(r.progress+(m.race.config.routeOffset??0)*360000,360000,s.usesBranch(m.shortcutPassages,r.id,r.progress),{x:0,z:0},{x:0,z:0});
    const v=[p.x-station.position[0],-30,p.z-station.position[2]],length=Math.hypot(...v),direction=v.map(x=>x/length);
    if(previous){const rate=Math.acos(Math.min(1,previous.reduce((n,x,j)=>n+x*direction[j],0)))*30*180/Math.PI;maxAngularSpeed=Math.max(maxAngularSpeed,rate);assert.ok(rate<100,'no path-driven lens flip within a TV shot');}
    previous=direction;frames++;
   }
  }
 }
 const report={status:'PASS',meetings:20,sampledFrames:frames,maxAimDegreesPerSecond:maxAngularSpeed,meanEditPreparationMs:editMs/20,note:'Pure recorded centerline aim sampled at30Hz within fixed shots, excluding explicit cuts and visual passing offsets. Actual rendered poses are separate browser evidence.'};
 await mkdir('out',{recursive:true});await writeFile('out/racing-tv-path.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await s.dispose();}
