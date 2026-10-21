import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler'));
const {build}=wr('esbuild'),{Miniflare,Log,LogLevel}=wr('miniflare');
const temp=await mkdtemp(join(tmpdir(),'holocron-network-observation-'));
const modules=['lib/observability/assistant-network.ts','build/network-observation-plugin.ts','lib/assistant/abuse-identity.ts'];
let outbound=0;
const activeWindow=()=>`${new Date(Date.now()-1000).toISOString()}/${new Date(Date.now()+120000).toISOString()}`;
const env=()=>({HOLOCRON_ASSISTANT_ENABLED:'false',HOLOCRON_ASSISTANT_NETWORK_DIAGNOSTICS_WINDOW:activeWindow()});
let count=0;
try{
 for(const [i,path] of modules.entries())await build({entryPoints:[path],outfile:join(temp,`${i}.mjs`),bundle:true,format:'esm',platform:'node',logLevel:'silent'});
 const {instrumentNetworkBoundary}=await import('file://'+join(temp,'1.mjs'));
 const {trustedEdgeNetwork}=await import('file://'+join(temp,'2.mjs'));
 for(const name of ['app-router-entry.js','app-rsc-handler.js','app-route-handler-runtime.js']){
  const path=resolve('node_modules/vinext/dist/server',name),code=await readFile(path,'utf8');
  assert(instrumentNetworkBoundary(code,path,resolve('.')).includes('__observeNetwork'));
  assert.throws(()=>instrumentNetworkBoundary(code+'\n',path,resolve('.')),/INTEGRITY_FAILED/);
 }
 assert.equal(instrumentNetworkBoundary('unrelated','/app/user.js',resolve('.')),null);
 const make=(cf,ip='192.0.2.44',path='/api/assistant/retrieve',method='POST')=>{
  const r=new Request('https://example.invalid'+path,{method,headers:{...(ip===null?{}:{'CF-Connecting-IP':ip}),cookie:'private-cookie-canary',authorization:'private-auth-canary','x-forwarded-for':'203.0.113.5','cf':'{"colo":"forged"}'},...(method==='POST'?{body:'private-query-canary'}:{})});
  if(cf!==undefined)Object.defineProperty(r,'cf',{value:cf});return r;
 };
 const samples=[
  [undefined,'192.0.2.44','MISSING','MISSING','PRESENT','VALID','VALID'],
  [{},'192.0.2.44','PRESENT','MISSING','PRESENT','VALID','VALID'],
  [{colo:1},'192.0.2.44','PRESENT','INVALID','PRESENT','VALID','VALID'],
  [{colo:'TEST'},null,'PRESENT','VALID','MISSING','INVALID','INVALID'],
  [{colo:'TEST'},'not-an-ip','PRESENT','VALID','PRESENT','INVALID','INVALID'],
  [{colo:'TEST'},'....','PRESENT','VALID','PRESENT','VALID','INVALID'],
  [{colo:'TEST'},'2001:db8::1','PRESENT','VALID','PRESENT','VALID','VALID'],
 ];
 for(const [cf,ip,...expected] of samples){
  const m=await import(`file://${join(temp,'0.mjs')}?sample=${count++}`),lines=[],old=console.info;
  console.info=s=>lines.push(JSON.parse(s));
  try{
   const r=make(cf,ip);const response=await m.withNetworkObservation(r,env(),async()=>{
    await Promise.resolve();m.observeNetwork('C_ROUTE',r);m.observeNetwork('D_CHECK',r,trustedEdgeNetwork(r)!==null);return new Response('OFF',{status:503});
   });assert.equal(response.status,503);assert.equal(await response.text(),'OFF');assert.equal(r.bodyUsed,false);
   assert.equal(lines.length,1);const trace=lines[0];assert.match(trace.id,/^[a-f0-9-]{36}$/);
   assert.deepEqual(Object.keys(trace).sort(),['event','id','observations']);
   const a=trace.observations[0];assert.deepEqual([a.cf,a.colo,a.ipHeader,a.ipPredicate,a.ipSyntax],expected);
   assert.equal(trace.observations[1].object,trace.observations[2].object);
   const text=JSON.stringify(trace);for(const secret of ['private-cookie-canary','private-auth-canary','private-query-canary','203.0.113.5',ip].filter(Boolean))assert(!text.includes(secret));
   await m.withNetworkObservation(make(cf,ip),env(),async()=>{});assert.equal(lines.length,1,'one per isolate');
  }finally{console.info=old;}
 }
 for(const override of [{HOLOCRON_ASSISTANT_ENABLED:'true'},{HOLOCRON_ASSISTANT_ENABLED:undefined},{HOLOCRON_ASSISTANT_NETWORK_DIAGNOSTICS_WINDOW:undefined},{HOLOCRON_ASSISTANT_NETWORK_DIAGNOSTICS_WINDOW:'garbage'},{HOLOCRON_ASSISTANT_NETWORK_DIAGNOSTICS_WINDOW:activeWindow()+'/extra'},{HOLOCRON_ASSISTANT_NETWORK_DIAGNOSTICS_WINDOW:`${new Date(Date.now()-200000).toISOString()}/${new Date(Date.now()-1000).toISOString()}`},{HOLOCRON_ASSISTANT_NETWORK_DIAGNOSTICS_WINDOW:`${new Date(Date.now()-1000).toISOString()}/${new Date(Date.now()+3600000).toISOString()}`}]){
  const m=await import(`file://${join(temp,'0.mjs')}?gate=${count++}`);let called=0;
  await m.withNetworkObservation(make({colo:'TEST'}),{...env(),...override},async()=>{called++;assert(!m.networkObservationActive());});assert.equal(called,1);
 }
 for(const [path,method] of [['/api/assistant/retrieve','GET'],['/api/assistant/generate','POST'],['/','GET']]){
  const m=await import(`file://${join(temp,'0.mjs')}?path=${count++}`);
  await m.withNetworkObservation(make({colo:'TEST'},null,path,method),env(),async()=>assert(!m.networkObservationActive()));
 }
 // Concurrent calls: only one can consume the local observation allowance;
 // the other request must never acquire its async context or diagnostic ID.
 const m=await import(`file://${join(temp,'0.mjs')}?concurrent`),lines=[],old=console.info;console.info=s=>lines.push(JSON.parse(s));
 try{await Promise.all([
  m.withNetworkObservation(make({colo:'TEST'}),env(),async()=>{await new Promise(r=>setTimeout(r,5));assert(m.networkObservationActive());}),
  m.withNetworkObservation(make({colo:'TEST'}),env(),async()=>assert(!m.networkObservationActive())),
 ]);assert.equal(lines.length,1);}finally{console.info=old;}
 const lost=await import(`file://${join(temp,'0.mjs')}?loss`),lossLines=[],previousInfo=console.info;console.info=s=>lossLines.push(JSON.parse(s));
 try{const a=make({colo:'TEST'});await lost.withNetworkObservation(a,env(),async()=>{
  const c=new Request(a.url,a);assert.equal(trustedEdgeNetwork(c),null);
  lost.observeNetwork('B_URL_BEFORE',a);lost.observeNetwork('B_URL_AFTER',c);
  lost.observeNetwork('C_ROUTE',c);lost.observeNetwork('D_CHECK',c,trustedEdgeNetwork(c)!==null);
 });assert.equal(lossLines[0].observations[0].colo,'VALID');assert.equal(lossLines[0].observations[2].cf,'MISSING');assert.equal(lossLines[0].observations.at(-1).decision,'NETWORK_UNAVAILABLE');}finally{console.info=previousInfo;}
 console.log('PASS: fixed classifications, private-data absence, OFF/window/path gating, one-per-isolate, async isolation, exact clone-loss localization, fail-closed Vinext transform hashes.');

 if(process.argv.includes('--built-worker')){
  // Execute the actual built production entry, not a hand-made route fixture.
  const root=resolve('dist/server'),config=JSON.parse(await readFile(join(root,'wrangler.json')));
  const packagedModules=(await readdir(root,{recursive:true})).filter(f=>f.endsWith('.js')).sort((a,b)=>a===config.main?-1:b===config.main?1:a.localeCompare(b)).map(f=>({type:'ESModule',path:join(root,f)}));
  const files=await readdir(join(root,'_next/static'));
  const code=(await readFile(join(root,'index.js'),'utf8'))+(await Promise.all(files.filter(f=>f.endsWith('.js')).map(f=>readFile(join(root,'_next/static',f),'utf8')))).join('');
  for(const stage of ['A_WORKER','B_ENTRY','B_HEADERS','B_RSC','B_URL_BEFORE','B_URL_AFTER','B_NEXT_BEFORE','B_NEXT_AFTER','C_ROUTE','D_CHECK'])assert(code.includes(stage),`packaged ${stage}`);
  for(const [label,cf,ip] of [['valid',{colo:'TEST'},'192.0.2.44'],['no-colo',{},'192.0.2.44'],['no-ip',{colo:'TEST'},null],['bad-ip',{colo:'TEST'},'invalid']]){
   const captured=[];class Capture extends Log{constructor(){super(LogLevel.DEBUG);}log(s){captured.push(String(s));}}
   // A test-only upstream service models omission BEFORE the actual packaged
   // application. Miniflare's HTTP ingress itself fills default CF/IP values.
   const upstream=`export default {fetch(request,env){const forwarded=new Request(request,{cf:${label==='no-colo'?'{}':'request.cf'}});${ip===null?"forwarded.headers.delete('CF-Connecting-IP');":''}return env.APP.fetch(forwarded);}}`;
   const mf=new Miniflare({log:new Capture(),handleStructuredLogs:entry=>{captured.push(entry.message);},workers:[
    {name:'synthetic-upstream',modules:true,script:upstream,serviceBindings:{APP:'actual-packaged-app'},cf,compatibilityDate:config.compatibility_date},
    {name:'actual-packaged-app',modules:packagedModules,modulesRoot:root,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,d1Databases:['DB'],bindings:env(),outboundService:()=>{outbound++;throw Error('OUTBOUND_FORBIDDEN');}},
   ]});
   try{
    const db=await mf.getD1Database('DB','actual-packaged-app');await db.prepare('CREATE TABLE observation_canary (n INTEGER)').run();await db.prepare('INSERT INTO observation_canary VALUES(1)').run();
    const before=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const r=await mf.dispatchFetch('https://example.invalid/api/assistant/retrieve',{method:'POST',headers:{'Content-Type':'application/json',...(ip===null?{}:{'CF-Connecting-IP':ip}),cookie:'private-cookie-canary'},body:'private-query-canary',cf});
    assert.equal(r.status,503);const payload=await r.json();assert.equal(payload.error.code,'ASSISTANT_UNAVAILABLE');assert(!JSON.stringify(payload).includes('OBSERVATION'));
    // Console messages are emitted asynchronously by the local runtime.
    for(let i=0;i<20&&!captured.some(s=>s.includes('ASSISTANT_NETWORK_OBSERVATION_V1'));i++)await new Promise(r=>setTimeout(r,20));
    const log=captured.find(s=>s.includes('ASSISTANT_NETWORK_OBSERVATION_V1'));assert(log,`console capture ${label}`);
    const event=JSON.parse(log.slice(log.indexOf('{'),log.lastIndexOf('}')+1));
    assert.deepEqual(event.observations.map(o=>o.stage),['A_WORKER','B_ENTRY','B_HEADERS','B_RSC','B_URL_BEFORE','B_URL_AFTER','B_NEXT_BEFORE','B_NEXT_AFTER','C_ROUTE','D_CHECK']);
    assert.equal(event.observations.at(-1).decision,label==='valid'?'TRUSTED_NETWORK_OK':'NETWORK_UNAVAILABLE');
    assert.equal(event.observations.at(-1).object,event.observations.at(-2).object);
    const after=await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();assert.deepEqual(after.results,before.results);assert.equal((await db.prepare('SELECT n FROM observation_canary').first()).n,1);
    for(const secret of ['private-cookie-canary','private-query-canary',ip].filter(Boolean))assert(!log.includes(secret));
    console.log(`PASS actual packaged Worker ${label}: all A/B/C/D observations; unchanged OFF response; no application tables/admission/session/Credit/Provider.`);
   }finally{await mf.dispose();}
  }
 }
 assert.equal(outbound,0);console.log('External Provider outbound ZERO. Local workerd evidence only, not Production metadata evidence.');
}finally{await rm(temp,{recursive:true,force:true});}
