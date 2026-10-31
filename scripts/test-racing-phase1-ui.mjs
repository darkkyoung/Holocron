import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadV3} from './racing/load-v3.mjs';
import {loadTestModules} from './test-module-loader.mjs';

const sim=await loadV3();
const hud=await loadTestModules(['prototypes/galactic-racing-v2/watch-hud.ts']);
const {lapIndicator}=hud.modules['prototypes/galactic-racing-v2/watch-hud.ts'];
try {
  const m=sim.simulateMeetingV3('9rc-0');
  const before=JSON.stringify(m);
  const q=sim.meetingAt(m,0),qHud=lapIndicator(m,q.phase,0,q.racers,null);
  assert.equal(qHud.value,'R1 / 3');
  const third=m.qualifying.runs.find(x=>x.round===3);
  assert.ok(third);
  const q3=sim.meetingAt(m,third.startMs+100);
  assert.equal(lapIndicator(m,q3.phase,third.startMs+100,q3.racers,null).value,'R3 / 3');
  for(const t of [0,250,10000,60000,120000,195000,m.ceremonyStartMs-m.raceStartMs-250]){
    const ms=m.raceStartMs+t,phase=sim.meetingAt(m,Math.min(ms,m.ceremonyStartMs-250));
    const leader=[...phase.racers].sort((a,b)=>a.rank-b.rank)[0];
    const view=lapIndicator(m,phase.phase,Math.min(ms,m.ceremonyStartMs-250),phase.racers,null);
    const expected=Math.min(3,Math.max(1,Math.floor(Math.max(0,leader.progress)/(m.race.config.track.length/3))+1));
    assert.equal(view.value,expected+' / 3');
    const tracked=lapIndicator(m,phase.phase,ms,phase.racers,m.race.racers[7].id);
    assert.match(tracked.label,/TRACKED LAP/);
    assert.match(tracked.value,/^[1-3] \/ 3$/);
  }
  const ceremony=sim.meetingAt(m,m.ceremonyStartMs);
  assert.equal(lapIndicator(m,ceremony.phase,m.ceremonyStartMs,ceremony.racers,null).value,'3 / 3');
  const css=await readFile('prototypes/galactic-racing-v2/watch.css','utf8');
  const watch=await readFile('prototypes/galactic-racing-v2/watch.tsx','utf8');
  const playlist=await readFile('prototypes/galactic-racing-v2/season-playlist.tsx','utf8');
  const scene=await readFile('prototypes/galactic-racing-v2/scene.ts','utf8');
  assert.match(css,/\.lap-hud/);
  assert.match(watch,/className="lap-hud"/);
  assert.match(css,/\.stage-tabs/);
  assert.match(watch,/SeasonPlaylist/);
  assert.match(playlist,/시즌별 경기/);
  assert.match(playlist,/season-round/);
  assert.match(playlist,/recorded=seasonId===1&&i===0/);
  assert.match(scene,/updateBadge/);
  assert.match(scene,/SLIPSTREAM/);
  assert.match(scene,/EXTERNAL/);
  assert.equal(m.race.events.filter(e=>e.kind==='PIT').length,0);
  assert.equal(JSON.stringify(m),before,'UI calculations must not mutate source record');
  console.log('PASS Phase1 UI: pure lap HUD, qualifying round-robin labels, season playlist fixtures, head effects, v0.3 no-pit / immutable meeting');
}finally{await sim.dispose();await hud.dispose();}
