import {createServer} from 'node:http';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,readdir,writeFile,rename} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {build} from 'vite';
import {fileURLToPath} from 'node:url';
import {loadV4} from './load-v4.mjs';
import {replayHandler} from './http.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));process.chdir(root);
let seed='9rd-0',port=4173,host='127.0.0.1',buildOnly=false;
const args=process.argv.slice(2);
for(let i=0;i<args.length;i++){
 if(args[i]==='--seed')seed=args[++i];else if(args[i]==='--port')port=Number(args[++i]);
 else if(args[i]==='--host'&&['127.0.0.1','0.0.0.0'].includes(args[i+1]))host=args[++i];
 else if(args[i]==='--build-only')buildOnly=true;else if(args[i]!=='--strictPort')throw Error('UNKNOWN_ARGUMENT');
}
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('INVALID_PORT');
const sim=await loadV4();let record,special;
try{record=sim.simulateMeetingV4(seed);for(let i=0;i<1500;i++){const candidate=sim.simulateMeetingV4(`9rd-${i}`,false);if(candidate.specialDsq){special=sim.simulateMeetingV4(candidate.race.seed);break;}}if(!special)throw Error('NO_DEMO_SEED');}finally{await sim.dispose();}
const outDir=resolve(root,'out/galactic-racing-phase1-v4');
await build({configFile:false,root:resolve(root,'prototypes/galactic-racing-v2'),
 build:{outDir,emptyOutDir:true,rollupOptions:{input:resolve(root,'prototypes/galactic-racing-v2/watch.html')}},logLevel:'warn'});
await rename(join(outDir,'watch.html'),join(outDir,'index.html'));
await writeFile(join(outDir,'race.json'),JSON.stringify(record));await writeFile(join(outDir,'special.json'),JSON.stringify(special));
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const dirty=execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim().length>0;
const info={label:'FINAL POLISH · player 1.0',sha,dirty,simulator:record.version,seed,raceMs:record.race.durationTicks*record.race.config.tickMs,builtAt:new Date().toISOString()};
await writeFile(join(outDir,'build-info.json'),JSON.stringify(info,null,2));
for(const name of ['START-RACING.bat','serve-demo.ps1','README-WINDOWS.txt'])await writeFile(join(outDir,name),await readFile(join(root,'prototypes/galactic-racing-v2/windows',name)));

const files=new Map();async function collect(dir,prefix=''){for(const item of await readdir(dir,{withFileTypes:true})){const p=join(dir,item.name),u=`${prefix}/${item.name}`;if(item.isDirectory())await collect(p,u);else files.set(u,await readFile(p));}}await collect(outDir);files.set('/',files.get('/index.html'));
const digest=createHash('sha256').update(files.get('/race.json')).digest('hex');
console.log(JSON.stringify({version:record.version,seed,specialDemoSeed:special.race.seed,raceSeconds:record.race.durationTicks*.25,outDir,digest}));
if(!buildOnly){const handler=replayHandler(files,digest);const server=createServer((req,res)=>{if(req.url==='/special.json')res.setHeader('X-Race-SHA256',createHash('sha256').update(files.get('/special.json')).digest('hex'));handler(req,res);});server.listen(port,host,()=>console.log(`Local 3D replay http://127.0.0.1:${port}/`));for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close());}
