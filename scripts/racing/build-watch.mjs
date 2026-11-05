import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,readdir,writeFile,rename} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {build} from 'vite';
import {fileURLToPath} from 'node:url';
import {replayHandler} from './http.mjs';
export async function buildWatch({load,simulate,defaultSeed,label,outName,version,specialSeed,cases=[]}){
const root=fileURLToPath(new URL('../../',import.meta.url));process.chdir(root);
let seed=defaultSeed,port=4173,host='127.0.0.1',buildOnly=false;
const args=process.argv.slice(2);
for(let i=0;i<args.length;i++){
 if(args[i]==='--seed')seed=args[++i];else if(args[i]==='--port')port=Number(args[++i]);
 else if(args[i]==='--host'&&['127.0.0.1','0.0.0.0'].includes(args[i+1]))host=args[++i];
 else if(args[i]==='--build-only')buildOnly=true;else if(args[i]!=='--strictPort')throw Error('UNKNOWN_ARGUMENT');
}
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('INVALID_PORT');
const sim=await load();let record,special;
try{record=sim[simulate](seed);if(specialSeed)special=sim[simulate](specialSeed);for(let i=0;!special&&i<1500;i++){const candidate=sim[simulate](`9rd-${i}`,false);if(candidate.specialDsq){special=sim[simulate](candidate.race.seed);break;}}if(!special)throw Error('NO_DEMO_SEED');}finally{await sim.dispose();}
const outDir=resolve(root,'out/'+outName);
await build({configFile:false,root:resolve(root,'prototypes/galactic-racing-v2'),
 build:{outDir,emptyOutDir:true,rollupOptions:{input:resolve(root,'prototypes/galactic-racing-v2/watch.html')}},logLevel:'warn'});
await rename(join(outDir,'watch.html'),join(outDir,'index.html'));
await writeFile(join(outDir,'race.json'),JSON.stringify(record));await writeFile(join(outDir,'special.json'),JSON.stringify(special));
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const dirty=execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim().length>0;
const info={label,sha,dirty,simulator:record.version,seed,raceMs:record.race.durationTicks*record.race.config.tickMs,builtAt:new Date().toISOString()};
await writeFile(join(outDir,'build-info.json'),JSON.stringify(info,null,2));
for(const name of ['START-RACING.bat','serve-demo.ps1','README-WINDOWS.txt']){let text=await readFile(join(root,'prototypes/galactic-racing-v2/windows',name),'utf8');text=text.replaceAll('Phase 2-A',label).replaceAll('PHASE 2-A',label).replaceAll('simulator v0.4','simulator '+version);if(name==='README-WINDOWS.txt')text+='\nD.1.1 viewer: 1-8 select roster number with automatic camera angles; comma/period cycle current ranks; / or AUTO returns to full automatic broadcast. Select a fixed angle in settings when needed.\n';if(name==='README-WINDOWS.txt')text+='\nPhase 2-D.1: default 10 laps, actual double speed at 1x playback, configurable local records.\n120 second preshow includes final 5 second start lights. 10 second coast then provisional top three receive 5 seconds each.\nPhase 2-B.1: visual-only continuous corner heading and camera; same v0.5 results.\nPhase 2-B: select the qualifying replay for preshow, three rounds and grid.\nAutomatic / manual presentation and continuous playback are LOCAL demo controls.\nManual results hold AFTER the 15s coast and advance once when confirmed or after five minutes.\nD.1: fast measured qualifying, TV cameras, playback-state-preserving seek. C.1: qualifying 3s coast +12s results; P8-to-P1 preshow; cleared timing line; passing lanes.\nUse Major scenes to inspect recorded events; unavailable events are disabled.\nFinish: 10s free coast then provisional P1/P2/P3 front/front/chase spotlight.\nGreen branch: an actual shorter path, not the historical v0.4 distance jump.\n';await writeFile(join(outDir,name),text);}

if(version==='v0.12'){
 const readme=join(outDir,'README-WINDOWS.txt');await writeFile(readme,(await readFile(readme,'utf8'))+'\nV0.12 HYPER PHANTOM WARP: Gold policy unchanged. Own progress70-95% late launches; no forced activation. Hyper: 250ms visible burst,125ms fade,375ms invisible route streak,250ms return,5s afterburn. Official jump occurs only at its recorded tick. Car and billboard fade together. GAP uses confirmed crossing times. Select Hyper Phantom Warp in LOCAL race settings, then Major scenes ULTIMATE; use0.5x to inspect the short effect. 1-8 manual, / AUTO. This is an offline local replay, NOT Production broadcast.\n');
}
if(version==='v0.11'){
 const readme=join(outDir,'README-WINDOWS.txt');await writeFile(readme,(await readFile(readme,'utf8'))+'\nV0.11 FINAL CORRECTION: own progress 70-80% low,80-90% high,90-95% reduced launch probability; no new launch at/after95%. No forced Ultimate. Gold and bounded Hyper motion unchanged. GAP uses confirmed same-distance crossing timestamps, not distance/speed. LEADER, +seconds, +LAP, DNF/DSQ; qualifying keeps lap times. Default11lu-0 Gold in laps9/10;11lu-31 Hyper in lap10;11lu-81 DNF and specialDSQ. LOCAL replay only.\n');
}
if(version==='v0.10'){
 const readme=join(outDir,'README-WINDOWS.txt');await writeFile(readme,(await readFile(readme,'utf8'))+'\nV0.10 ACCEPTANCE: bounded Hyper wormhole, Gold unchanged, automatic target locked until actual Ultimate end. Use 1-8 for manual override and / for automatic return. R1/R2/R3 highlight best valid times directly, including ties. Default 10rw-8 contains Gold + Hyper. Local settings examples: 10rw-1 Gold, 10rw-8 Hyper; Special DSQ button uses 10rw-14. This is a LOCAL replay with future data in JSON, NOT a secure live service.\n');
}
if(version==='v0.9'){
 const readme=join(outDir,'README-WINDOWS.txt');
 await writeFile(readme,(await readFile(readme,'utf8'))+'\nPHASE 2-D FINAL QUICK TOUR\nSimulator galactic-racing-0.9.0; this ZIP is separate from the previous v0.8 demo.\nDefault seed 9ru-2: use Major scenes > ULTIMATE, then press K to watch a recorded P8-to-P1 comeback.\nLocal race settings has fixed Gold, Hyper and non-winning comeback examples.\nPress the small information icon beside a racer to view its profile. LOCAL DEMO ADMIN edits browser-local profiles only; JSON export/import is available. Unknown biography stays empty.\nThe ceremony replay introduces P3, P2, P1, then celebrates. Local demo settings selects the sealed special-DSQ example and re-award.\nEnable full continuous playback to connect qualifying, race and ceremony. All footage is computed locally from deterministic records; no live service or money is connected.\n');
}
await writeFile(join(outDir,'cases.json'),JSON.stringify(cases));
const files=new Map();async function collect(dir,prefix=''){for(const item of await readdir(dir,{withFileTypes:true})){const p=join(dir,item.name),u=`${prefix}/${item.name}`;if(item.isDirectory())await collect(p,u);else files.set(u,await readFile(p));}}await collect(outDir);files.set('/',files.get('/index.html'));
const digest=createHash('sha256').update(files.get('/race.json')).digest('hex');
console.log(JSON.stringify({version:record.version,seed,specialDemoSeed:special.race.seed,raceSeconds:record.race.durationTicks*.25,outDir,digest}));
if(!buildOnly){const handler=replayHandler(files,digest);const server=createServer((req,res)=>{if(req.url==='/special.json')res.setHeader('X-Race-SHA256',createHash('sha256').update(files.get('/special.json')).digest('hex'));handler(req,res);});server.listen(port,host,()=>console.log(`Local 3D replay http://127.0.0.1:${port}/`));for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close());}

}
