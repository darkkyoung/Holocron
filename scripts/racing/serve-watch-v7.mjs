import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,readdir,writeFile,rename} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {build} from 'vite';
import {fileURLToPath} from 'node:url';
import {loadV7} from './load-v7.mjs';
import {replayHandler} from './http.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));process.chdir(root);
let seed='9rf-4',port=4173,host='127.0.0.1',buildOnly=false;
const args=process.argv.slice(2);
for(let i=0;i<args.length;i++){
 if(args[i]==='--seed')seed=args[++i];else if(args[i]==='--port')port=Number(args[++i]);
 else if(args[i]==='--host'&&['127.0.0.1','0.0.0.0'].includes(args[i+1]))host=args[++i];
 else if(args[i]==='--build-only')buildOnly=true;else if(args[i]!=='--strictPort')throw Error('UNKNOWN_ARGUMENT');
}
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('INVALID_PORT');
const sim=await loadV7();let record,special;
try{record=sim.simulateMeetingV7(seed);for(let i=0;i<1500;i++){const candidate=sim.simulateMeetingV7(`9rd-${i}`,false);if(candidate.specialDsq){special=sim.simulateMeetingV7(candidate.race.seed);break;}}if(!special)throw Error('NO_DEMO_SEED');}finally{await sim.dispose();}
const outDir=resolve(root,'out/galactic-racing-phase2-v7');
await build({configFile:false,root:resolve(root,'prototypes/galactic-racing-v2'),
 build:{outDir,emptyOutDir:true,rollupOptions:{input:resolve(root,'prototypes/galactic-racing-v2/watch.html')}},logLevel:'warn'});
await rename(join(outDir,'watch.html'),join(outDir,'index.html'));
await writeFile(join(outDir,'race.json'),JSON.stringify(record));await writeFile(join(outDir,'special.json'),JSON.stringify(special));
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const dirty=execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim().length>0;
const info={label:'PHASE 2-C.1 · v0.7 · BROADCAST POLISH',sha,dirty,simulator:record.version,seed,raceMs:record.race.durationTicks*record.race.config.tickMs,builtAt:new Date().toISOString()};
await writeFile(join(outDir,'build-info.json'),JSON.stringify(info,null,2));
for(const name of ['START-RACING.bat','serve-demo.ps1','README-WINDOWS.txt']){let text=await readFile(join(root,'prototypes/galactic-racing-v2/windows',name),'utf8');text=text.replaceAll('Phase 2-A','Phase 2-C.1').replaceAll('PHASE 2-A','PHASE 2-C.1').replaceAll('simulator v0.4','simulator v0.7');if(name==='README-WINDOWS.txt')text+='\nPhase 2-C.1: default 10 laps, actual double speed at 1x playback, configurable local records.\n120 second preshow includes final 5 second start lights. 10 second coast then provisional top three receive 5 seconds each.\nPhase 2-B.1: visual-only continuous corner heading and camera; same v0.5 results.\nPhase 2-B: select the qualifying replay for preshow, three rounds and grid.\nAutomatic / manual presentation and continuous playback are LOCAL demo controls.\nManual results hold AFTER the 15s coast and advance once when confirmed or after five minutes.\nC.1: qualifying 3s coast +12s results; P8-to-P1 preshow; cleared timing line; passing lanes.\nDefault seed 9rf-4 includes DNF: use the Retire highlight in Major scenes (54s race time).\nFinish: 10s free coast then provisional P1/P2/P3 front/side/chase spotlight.\nGreen branch: an actual shorter path, not the historical v0.4 distance jump.\n';await writeFile(join(outDir,name),text);}

const files=new Map();async function collect(dir,prefix=''){for(const item of await readdir(dir,{withFileTypes:true})){const p=join(dir,item.name),u=`${prefix}/${item.name}`;if(item.isDirectory())await collect(p,u);else files.set(u,await readFile(p));}}await collect(outDir);files.set('/',files.get('/index.html'));
const digest=createHash('sha256').update(files.get('/race.json')).digest('hex');
console.log(JSON.stringify({version:record.version,seed,specialDemoSeed:special.race.seed,raceSeconds:record.race.durationTicks*.25,outDir,digest}));
if(!buildOnly){const handler=replayHandler(files,digest);const server=createServer((req,res)=>{if(req.url==='/special.json')res.setHeader('X-Race-SHA256',createHash('sha256').update(files.get('/special.json')).digest('hex'));handler(req,res);});server.listen(port,host,()=>console.log(`Local 3D replay http://127.0.0.1:${port}/`));for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close());}
