import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler')),{Miniflare}=wr('miniflare');
const root=resolve('dist/server'),config=JSON.parse(await readFile(join(root,'wrangler.json')));
assert.equal(config.assets.run_worker_first,true);
const modules=(await readdir(root,{recursive:true})).filter(f=>f.endsWith('.js')).sort((a,b)=>a===config.main?-1:b===config.main?1:a.localeCompare(b)).map(f=>({type:'ESModule',path:join(root,f)}));
const secret='synthetic-admin-secret-built-worker',loaded=await loadTestModules(['lib/admin/session-crypto.ts']);let outbound=0;
const mf=new Miniflare({modules,modulesRoot:root,compatibilityDate:config.compatibility_date,compatibilityFlags:config.compatibility_flags,d1Databases:['DB'],bindings:{HOLOCRON_ASSISTANT_ENABLED:'false',HOLOCRON_ADMIN_SESSION_SECRET:secret},outboundService:()=>{outbound++;throw Error('NO NETWORK');}});
try{
 const db=await mf.getD1Database('DB');await db.prepare('CREATE TABLE settings(key TEXT PRIMARY KEY,value TEXT NOT NULL)').run();
 await db.prepare('INSERT INTO settings VALUES(?,?)').bind('site_visibility_v1',JSON.stringify({schemaVersion:1,revision:1,mode:'MAINTENANCE',title:'점검 중',body:'테스트 안내'})).run();
 for(const path of ['/','/works','/quiz','/assistant','/api/announcement','/api/assistant/retrieve','/api/credit/visit','/?_rsc=1']){
  const r=await mf.dispatchFetch('https://local.test'+path,{method:path.startsWith('/api/')?'POST':'GET',headers:{Origin:'https://local.test','Content-Type':'application/json'},...(path.startsWith('/api/')?{body:'{}'}:{})});assert.equal(r.status,503,path);const text=await r.text();assert(text.includes(path.startsWith('/api/')||path.includes('_rsc')?'SITE_MAINTENANCE':'점검 중'));
 }
 const cookie='holocron_admin_session='+await loaded.modules['lib/admin/session-crypto.ts'].createAdminSessionToken(secret);
 let r=await mf.dispatchFetch('https://local.test/api/admin/site-visibility',{headers:{Cookie:cookie}});assert.equal(r.status,200);assert.equal((await r.json()).value.mode,'MAINTENANCE');
 r=await mf.dispatchFetch('https://local.test/api/admin/site-visibility',{method:'POST',headers:{Cookie:cookie,Origin:'https://local.test','Content-Type':'application/json'},body:JSON.stringify({expectedRevision:1,fields:{mode:'PUBLIC',title:'점검 중',body:'테스트 안내'}})});assert.equal(r.status,200);
 r=await mf.dispatchFetch('https://local.test/api/assistant/retrieve',{method:'POST',headers:{Origin:'https://local.test','Content-Type':'application/json'},body:'{}'});assert.equal(r.status,503);assert.equal((await r.json()).error.code,'ASSISTANT_UNAVAILABLE');
 assert.equal(outbound,0);console.log('PASS actual packaged Worker: assets worker-first, maintenance before real Vinext routes/RSC, real Admin Session GET/POST/CAS, PUBLIC transition and AI OFF; outbound ZERO');
}finally{await mf.dispose();await loaded.dispose();}
