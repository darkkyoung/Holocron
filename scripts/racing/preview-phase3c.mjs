// Loopback-only integrated rehearsal. No Cloudflare account, remote bindings or production keys.
import {checkReaderRecovery} from './operational-qa.mjs';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {loadTestModules} from '../test-module-loader.mjs';
const require=createRequire(import.meta.url),wr=require('wrangler'),privateRequire=createRequire(require.resolve('wrangler')),{Miniflare}=privateRequire('miniflare');
const files=['racing-broadcast/http','racing-broadcast/gateway','racing-broadcast/runner','racing-broadcast/private','racing/phase3a/operations','racing/phase3a/crypto'].map(p=>'lib/'+p+'.ts');
const modules=await loadTestModules(files),[api,front,runner,priv,ops,c]=files.map(p=>modules.modules[p]);
const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',script:'export default {fetch(){return new Response()}}',d1Databases:['DB'],r2Buckets:['VAULT'],kvNamespaces:['BEACON']});
let server,timer,job,browser;const smoke=process.argv.includes('--smoke');
try{
 const db=await mf.getD1Database('DB'),bucket=await mf.getR2Bucket('VAULT'),kv=await mf.getKVNamespace('BEACON');
 for(const name of ['0001_foundation','0002_admin_grants','0003_custom_seasons']){
 const sql=await readFile('db/racing-phase3a/migrations/'+name+'.sql','utf8');await db.batch(wr.unstable_splitSqlQuery(sql).map(s=>db.prepare(s)));}
 const signer=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const env={RACING_ISOLATED_DB:db,RACING_PRIVATE_OBJECTS:bucket,RACING_BEACON:kv,RACING_SEAL_KEY:c.secret(),RACING_BEACON_PUBLIC_JWK:JSON.stringify(await crypto.subtle.exportKey('jwk',signer.publicKey))};
 const start=Date.parse('2026-12-07T12:00:00Z'),season=await ops.racingOperations({db,key:await priv.keyFor(env),now:()=>start-86400000,role:()=>'scheduler'}).createRegular('2026-12-07');
 const race=season+':R1';
 for(const stage of ['qualifying','main']){
  const ref='isolated-external-v1:'+race+':'+stage,value=c.secret();
  const signature=c.hex(new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},signer.privateKey,new TextEncoder().encode(c.canonical({ref,value})))));
  await kv.put(ref,JSON.stringify({ref,value,signature}));
 }
 const qOnly=process.argv.includes('--qualifying');
 if(!qOnly)await runner.wake(env,()=>start-3600000);
 const built=await privateRequire('esbuild').build({stdin:{contents:"import React from 'react';import {createRoot} from 'react-dom/client';import Viewer from './app/racing/viewer';createRoot(document.getElementById('root')).render(<Viewer/>);",resolveDir:process.cwd(),loader:'tsx'},jsx:'automatic',bundle:true,outdir:'virtual',write:false,define:{'process.env.NODE_ENV':'"production"'}});
 const renderTiming=process.argv.includes('--render-timing');
 if(renderTiming) browser=await require('@playwright/test').chromium.launch({channel:'chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser?.newPage();
 const base=performance.now(),anchor=start-(qOnly?3600000:smoke?(page?5000:1000):125000),now=()=>anchor+Math.floor(performance.now()-base);
 const binding={fetch:r=>api.watch(r,env,now)};
 server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/racing/watch'){
   const v=await front.gateway(new Request(url,{method:req.method,headers:req.headers}),binding);
   res.writeHead(v.status,Object.fromEntries(v.headers));res.end(await v.text());
  }else if(url.pathname==='/racing'||url.pathname==='/'){
   res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end('<!doctype html><html lang="ko"><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><link rel=stylesheet href=/watch.css><h1>갤럭틱 레이싱 · 격리 방송</h1><main id=root></main><script src=/watch.js></script></html>');
  }else if(['/watch.js','/watch.css'].includes(url.pathname)){const ext=url.pathname.slice(6);res.writeHead(200,{'content-type':ext==='.js'?'application/javascript':'text/css'});res.end(built.outputFiles.find(f=>f.path.endsWith(ext)).text);}
  else{res.writeHead(404);res.end();}
 }catch{res.writeHead(503);res.end();}});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const url='http://127.0.0.1:'+server.address().port;console.log('Isolated local broadcast:',url+'/racing');
 const marks={};
 const elapsed=()=>performance.now()-base+(anchor-start);
 const tick=()=>{if(!job){
 const received=elapsed();
 job=runner.wake(env,now,(stage,name)=>{if(stage==='main'){marks.timerWake=received;marks[name]=elapsed();}}).catch(()=>console.error('scheduled delivery incomplete; next wake will retry')).finally(()=>{job=null;});}};
 timer=setInterval(tick,500);
 if(page) await page.goto(url+'/racing');
 if(smoke){let phase='';for(let i=0;i<120&&phase!=='RACE';i++){const r=await fetch(url+'/api/racing/watch');phase=(await r.json()).phase;if(phase==='RACE'){marks.httpObserved=elapsed();break;}await new Promise(ok=>setTimeout(ok,250));}assert.equal(phase,'RACE');
 if(page){
   await page.getByText('본경기',{exact:true}).waitFor();
   // Require a new rendered frame after the React main-race label appears.
   const count=await page.locator('.live-gl').getAttribute('data-frames');
   await page.waitForFunction(n=>Number(document.querySelector('.live-gl')?.dataset.frames)>n,Number(count));
   marks.mainFrameObserved=elapsed();
 }
 assert(marks['job-started']>=0 && marks['job-started']>=marks.timerWake && marks.httpObserved>=marks.committed);
 await mkdir('out',{recursive:true});await writeFile('out/3e-timeline.json',JSON.stringify(marks));
 await checkReaderRecovery({watch:api.watch,env,race,now});console.log('PASS real HTTP -> private reader -> sealed 10-lap D1/R2 meeting from scheduled wake');}
 else await Promise.race([once(process,'SIGINT'),once(process,'SIGTERM')]);
}finally{clearInterval(timer);await browser?.close();await job;server?.closeAllConnections();server?.close();await mf.dispose();await modules.dispose();}
