// Real loopback HTTP and production projection. Only storage rows, clock and shell are fixtures.
// The separate runner suite tests the D1 / encrypted R2 / signed entropy path.
import {createServer,request} from 'node:http';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {loadTestModules} from './test-module-loader.mjs';
const browserMode=process.argv.includes('--browser'),require=createRequire(import.meta.url);
const files=['racing-broadcast/http','racing-broadcast/private','racing/phase3a/crypto','racing/v14/simulator','racing-broadcast/gateway'].map(p=>'lib/'+p+'.ts');
const mod=await loadTestModules(files),[api,priv,c,sim,front]=files.map(p=>mod.modules[p]),start=Date.parse('2026-12-07T12:00Z'),race='regular:2026-12-07:R1';
let now=start,ready=true,final=false,current,server,browser;
const vault=new Map(),generations={};
const names=Array.from({length:8},(_,i)=>({id:'r'+(i+1),name:'봉인선수'+(i+1),color:'#66bbcc'}));
const manifest=JSON.stringify({roster:names,entrants:names.map(r=>({participantId:'signed-'+r.id,slotId:r.id,name:r.name}))}),hash=await c.digest(manifest);
const env={RACING_SEAL_KEY:'42'.repeat(32),RACING_PRIVATE_OBJECTS:{get:async k=>({text:async()=>vault.get(k)})},RACING_ISOLATED_DB:{prepare(sql){return {bind(...v){return {async first(){
 if(sql.includes('FROM racing_races'))return {id:race,season_id:'regular:2026-12-07',state:final?'FINAL':'RUNNING',qualifying_at:start-3600000,starts_at:start,final_at:start+current.durationMs-current.raceStartMs};
 if(sql.includes('FROM racing_seasons'))return {manifest,input_hash:hash};
 if(sql.includes('FROM racing_generations'))return ready?generations[v[1]]:null;
 throw Error('private-error-do-not-release');}};}};}}};
const key=await priv.keyFor(env);
async function install(m){
 current=m;vault.clear();for(const [stage,value] of [['qualifying',m.qualifying],['main',m]]){
 const inputHash='private-manifest-'+stage,text=c.canonical({contract:'phase3a-separated-entropy-v1',inputHash,stage,value}),h=await c.digest(text);
 generations[stage]={state:'READY',stage,input_hash:inputHash,output_hash:h,output_ref:h};vault.set(h,await c.encrypt(key,text,h));
 }}
try{
 const seeds={};for(let i=0;i<3000&&!['hyper','gold','special'].every(k=>seeds[k]);i++){const seed='broadcast-qa-'+i,m=sim.simulateMeetingV14(seed,false);
 for(const u of m.ultimates)seeds[u.type]??=seed;if(m.specialDsq)seeds.special??=seed;}
 assert(seeds.hyper&&seeds.gold&&seeds.special);
 const esbuild=createRequire(require.resolve('wrangler'))('esbuild'),bundle=await esbuild.build({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import Viewer from './app/racing/viewer';createRoot(document.getElementById('root')).render(<Viewer/>);",resolveDir:process.cwd(),loader:'tsx'},jsx:'automatic',bundle:true,outdir:'virtual',write:false,metafile:true,define:{'process.env.NODE_ENV':'"production"'}});
 assert(!Object.keys(bundle.metafile.inputs).some(p=>/racing-broadcast\/(projection|private|http|runner)|phase3a|racing\/v14/.test(p)));
 const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text,css=bundle.outputFiles.find(f=>f.path.endsWith('.css')).text;
 const html='<!doctype html><html lang="ko"><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href=/watch.css><main id=root></main><script src=/watch.js></script></html>';
 server=createServer(async(req,res)=>{try{
 const path=new URL(req.url,'http://localhost').pathname;
 if(path==='/api/racing/watch'){const answer=await front.gateway(new Request('http://localhost'+req.url,{method:req.method,headers:req.headers}),{fetch:r=>api.watch(r,env,()=>now)});res.writeHead(answer.status,Object.fromEntries(answer.headers));res.end(await answer.text());}
 else if(path==='/'||path==='/watch.js'||path==='/watch.css'){res.writeHead(200,{'content-type':path==='/'?'text/html':path.endsWith('js')?'application/javascript':'text/css'});res.end(path==='/'?html:path.endsWith('js')?js:css);}
 else{res.writeHead(404);res.end();}
 }catch{res.writeHead(500);res.end();}});
 server.listen(0,'127.0.0.1');await once(server,'listening');const url='http://127.0.0.1:'+server.address().port,endpoint=url+'/api/racing/watch?race='+race;
 async function get(t,suffix='',options={}){now=start+t;const response=await fetch(endpoint+suffix,options);assert.match(response.headers.get('cache-control'),/no-store/);
 const v=await response.json(),raw=JSON.stringify(v);assert(!/broadcast-qa-|private-manifest|secret_cipher|final_at|startTick|endTick|specialDsq|output_hash/.test(raw));return {v,status:response.status};}
 for(const k of ['hyper','gold','special']){
 const m=sim.simulateMeetingV14(seeds[k]);await install(m);final=false;
 if(k!=='special'){const u=m.ultimates.find(x=>x.type===k),t=u.startTick*250;
 if(k==='hyper'){assert.notEqual((await get(t-3001)).v.cue?.kind,'CHARGE');assert.deepEqual((await get(t-3000)).v.cue,{kind:'CHARGE',slot:u.id});}
 assert.equal((await get(t)).v.cue.kind,k.toUpperCase());
 if(browserMode){browser??=await require('@playwright/test').chromium.launch({channel:'chrome'});const page=await browser.newPage();now=start+(k==='hyper'?t-3000:t);await page.goto(url);if(k==='hyper'){await page.getByText('CHARGE',{exact:true}).waitFor();now=start+t;}await page.getByText(k.toUpperCase(),{exact:true}).waitFor();await page.close();}continue;}
 const ceremony=m.ceremonyStartMs-m.raceStartMs,end=m.durationMs-m.raceStartMs;
 assert.equal((await get(-120001)).v.phase,'GRID');assert.equal((await get(-120000)).v.phase,'PRESHOW');
 ready=false;assert.equal((await get(1000)).v.phase,'WAITING');ready=true;
 assert.equal((await get(2000,'&offset='+end)).status,409);
 assert.equal((await get(2000,'&extra=1')).status,400);assert.equal((await get(2000,'',{method:'POST'})).status,405);
 assert.equal(await new Promise((resolve,reject)=>{const r=request(endpoint,{headers:{upgrade:'websocket'}},s=>{s.resume();resolve(s.statusCode);});r.on('error',reject);r.end();}),405);
 const before=(await get(ceremony+29999)).v;assert(!before.notice&&!before.cue&&!before.phase.includes('alert')&&before.replayEnd===undefined);
 assert.equal((await get(ceremony+30000)).v.phase,'PODIUM alert');
 assert.equal((await get(ceremony+33999)).v.notice,undefined);
 assert((await get(ceremony+34000)).v.notice.includes(m.specialDsq.reason));
 assert.equal((await get(ceremony+40000)).v.cue.slot,m.specialDsq.id);
 assert.equal((await get(ceremony+44000)).v.phase,'PODIUM overview');
 final=true;assert.equal((await get(end)).v.phase,'FINAL');assert.deepEqual((await get(end)).v.riders.map(x=>[x.slot,x.rank,x.points]),m.official.map(x=>[x.id,x.position,x.points]));
 assert.equal((await get(end,'&offset=1000')).v.phase,'RACE');assert.equal((await get(end,'&offset='+(end+1))).status,400);
 final=false;const v=(await get(12000,'',{headers:{purpose:'prefetch',accept:'text/event-stream',cookie:'role=admin'}})).v;
 assert.equal(v.phase,'RACE');assert.equal(v.entries[0].name,names[0].name);assert.equal(v.replayEnd,undefined);
 for(const path of ['/', '/watch.css','/watch.js']){const body=await(await fetch(url+path)).text();assert(!body.includes(seeds.special)&&!body.includes(m.specialDsq.evidence)&&!body.includes(hash));}
 assert.equal((await fetch(url+'/private/'+generations.main.output_ref)).status,404);
 if(browserMode){
 browser??=await require('@playwright/test').chromium.launch({channel:'chrome'});await mkdir('out',{recursive:true});
 for(const width of [1440,390,360]){
 const ctx=await browser.newContext({viewport:{width,height:width===1440?900:844}}),a=await ctx.newPage(),b=await ctx.newPage();
 await b.addInitScript(()=>{Date.now=()=>0;});now=start+12000;
 await Promise.all([a.goto(url),b.goto(url)]);await Promise.all([a.getByText('본경기',{exact:true}).waitFor(),b.getByText('본경기',{exact:true}).waitFor()]);
 assert.equal(await a.locator('time').innerText(),await b.locator('time').innerText());
 const pos=await a.locator('circle').first().getAttribute('cx');now+=2000;
 await a.waitForFunction(x=>document.querySelector('circle')?.getAttribute('cx')!==x,pos);
 await ctx.setOffline(true);await a.getByRole('status').waitFor();now=start+ceremony+30000;await ctx.setOffline(false);await a.getByText('포디엄 조사 중').waitFor();
 now=start+ceremony+34000;await b.reload();await b.getByText(m.specialDsq.reason,{exact:false}).waitFor();await a.screenshot({path:'out/broadcast-'+width+'.png'});
 final=true;now=start+end;await a.getByText('공식 최종 순위').waitFor();await a.getByText('본경기 다시보기').click();await a.getByText('본경기',{exact:true}).waitFor();
 await a.getByText('일시정지').click();await ctx.close();final=false;
 }
 }}
 console.log('PASS HTTP release boundaries, common clock, private markers, error/cache/preload policy, reclassification & replay',seeds,browserMode?'and two-client Chrome QA':'');
}finally{await browser?.close();server?.closeAllConnections();server?.close();await mod.dispose();}
