// Exercise the route itself. Only the platform binding and cookie lookup are fixtures.
import assert from 'node:assert/strict';
import {loadTestModules} from './test-module-loader.mjs';
const path='app/api/admin/racing/route.ts';
try{
 const binding={};
 globalThis.platformFixture=binding;
 const app=await loadTestModules([path],{stubs:{
  'cloudflare:workers':'export const env=globalThis.platformFixture;',
  '@/lib/admin/session':'export const getAdminSession=()=>globalThis.sessionFixture;',
 }});
 try{
 const route=app.modules[path],url='https://isolated.example/api/admin/racing',origin=new URL(url).origin;
 assert.equal((await route.GET(new Request(url))).status,503);
 let reads=0;
 Object.assign(binding,{RACING_ADMIN_ORIGIN:origin,RACING_ISOLATED_DB:{prepare(){reads++;return {bind(){return {first:async()=>null};}};}}});
 const post=(headers)=>route.POST(new Request(url,{method:'POST',headers,body:'{}'}));
 assert.equal((await post({'content-type':'application/json',origin})).status,403);
 assert.equal((await post({'content-type':'application/json',origin:'https://other.example','x-racing-command':'1'})).status,403);
 assert.equal((await route.GET(new Request(url))).status,401);
 globalThis.sessionFixture={sub:'admin',exp:Date.now()/1000+100,nonce:'ungranted'};
 const res=await post({'content-type':'application/json',origin,'x-racing-command':'1'});
 assert.equal(res.status,403);assert.equal(reads,1);assert.equal(res.headers.get('cache-control'),'private, no-store');
 console.log('PASS HTTP disabled context, missing login, Origin/CSRF rejection, ungranted signed-session boundary, private response');
 }finally{await app.dispose();}
}finally{delete globalThis.platformFixture;delete globalThis.sessionFixture;}
