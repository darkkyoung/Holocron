// Playwright's server owner: retain bounded startup diagnostics as an artifact.
import {spawn} from 'node:child_process';
import {appendFileSync, createWriteStream, mkdirSync} from 'node:fs';
import {connect} from 'node:net';
import {artifactPath} from './paths.mjs';

const host='127.0.0.1';
const port=5173;
const deadline=Date.now()+95_000;
mkdirSync(artifactPath('diagnostics'),{recursive:true});
const log=createWriteStream(artifactPath('diagnostics/server.log'),{flags:'a'});
const record=(message)=>{
  const line=`${new Date().toISOString()} ${message}\n`;
  appendFileSync(artifactPath('diagnostics/startup.log'),line);
  process.stdout.write(line);
};

// Vinext defaults to localhost, which may bind ::1 while Playwright probes 127.0.0.1.
// An explicit supported CLI hostname makes both the server and browser use IPv4.
const server=spawn('pnpm',['dev','--hostname',host],{stdio:['ignore','pipe','pipe']});
server.stdout.pipe(log,{end:false});
server.stderr.pipe(log,{end:false});
record(`Started pnpm dev --hostname ${host}; PID ${server.pid ?? 'unavailable'}`);
let exit=null;
let ready=false;
server.on('error',(error)=>{exit=`spawn ${error.code ?? 'error'}`;});
server.on('exit',(code,signal)=>{
  exit=`exit ${code ?? 'null'} / signal ${signal ?? 'none'}`;
  if(ready){record(`Server process ended after readiness: ${exit}; see server.log`);process.exit(1);}
});
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{
  server.kill(signal);
  process.exit(0);
});

function portProbe(){
  return new Promise((resolve)=>{
    const socket=connect({host,port});
    socket.setTimeout(1500);
    socket.once('connect',()=>{socket.destroy();resolve('open');});
    socket.once('timeout',()=>{socket.destroy();resolve('timeout');});
    socket.once('error',(error)=>{socket.destroy();resolve(error.code ?? 'error');});
  });
}

async function httpProbe(path){
  try{
    const response=await fetch(`http://${host}:${port}${path}`,{signal:AbortSignal.timeout(5000)});
    // Do not retain response bodies: even a synthetic app may include diagnostic data.
    await response.body?.cancel();
    return `HTTP ${response.status} (${response.headers.get('content-type') ?? 'no content type'})`;
  }catch(error){return error.name==='TimeoutError'?'timeout':`unavailable (${error.cause?.code ?? error.name})`;}
}

let previous='';
while(Date.now()<deadline){
  if(exit){record(`Server process ended: ${exit}; see server.log`);process.exit(1);}
  const portState=await portProbe();
  const asset=portState==='open'?await httpProbe('/favicon.svg'):'not probed';
  const assistant=portState==='open'?await httpProbe('/assistant'):'not probed';
  const status=`port=${portState}; /favicon.svg=${asset}; /assistant=${assistant}`;
  if(status!==previous){record(status);previous=status;}
  if(asset.startsWith('HTTP 200')&&assistant.startsWith('HTTP 200')){
    ready=true;
    record('Actual Assistant route and static asset ready for Playwright');
    break;
  }
  if(asset.startsWith('HTTP 200')&&/^HTTP 5\d\d/.test(assistant)){
    record('Assistant route failed while static serving works; see server.log');
    server.kill();
    process.exit(1);
  }
  await new Promise((resolve)=>setTimeout(resolve,2000));
}
if(Date.now()>=deadline){record(`Startup deadline: ${previous}; process=${exit ?? 'running'}; see server.log`);server.kill();process.exit(1);}
// Keep this owner alive until Playwright tears down its webServer process.
await new Promise(()=>{});
