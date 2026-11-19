// Execute the built Vinext application in local workerd; no production config is loaded.
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
const root=resolve('dist/server'),marker='PRIVATE-FUTURE-WINNER-QA';
let calls=0;
const files=(await readdir(root,{recursive:true})).filter(p=>p.endsWith('.js')&&p!=='index.js');
const mf=new Miniflare({modules:['index.js',...files].map(p=>({type:'ESModule',path:resolve(root,p)})),modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB','RACING_ISOLATED_DB'],bindings:{RACING_ADMIN_ORIGIN:'http://local'},serviceBindings:{RACING_BROADCAST_READER:async r=>{
 calls++;assert.equal(r.headers.get('cookie'),null);assert.equal(r.headers.get('authorization'),null);return Response.json({phase:'WAITING'});}},outboundService:()=>new Response('disabled',{status:503})});
try{
 const db=await mf.getD1Database("DB");assert.equal((await mf.dispatchFetch("http://local/racing")).status,503);await db.prepare("CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)").run();
 for(const headers of [{},{rsc:'1','next-router-prefetch':'1'}]){
 const response=await mf.dispatchFetch('http://local/racing',{headers}),s=await response.text();
 assert.equal(response.status,200,s.slice(0,300));assert(!s.includes(marker)&&!s.includes('secret_cipher')&&!s.includes('RACING_SEAL_KEY'));
 if(!headers.rsc)assert(s.includes('갤럭틱 레이싱'));assert.equal(calls,0);
 }
 const denied=await mf.dispatchFetch('http://local/api/admin/racing');
 assert.equal(denied.status,401);
 const forbidden=await mf.dispatchFetch('http://local/api/admin/racing',{method:'POST',headers:{origin:'http://invalid.example','content-type':'application/json','x-racing-command':'1'},body:'{}'});
 assert.equal(forbidden.status,403);assert.equal(calls,0);
 const snap=await mf.dispatchFetch('http://local/api/racing/watch',{headers:{cookie:'private-cookie',authorization:'private-header'}});
 assert.equal(snap.status,200);assert.match(snap.headers.get('cache-control'),/no-store/);assert.deepEqual(await snap.json(),{phase:'WAITING'});assert.equal(calls,1);
 console.log('PASS built /racing HTML & RSC prefetch: no private lookup; real API only delegates sanitized snapshot request');
}finally{await mf.dispose();}
