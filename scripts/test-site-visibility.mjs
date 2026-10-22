import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler')),{Miniflare}=wr('miniflare'),{build}=wr('esbuild'),split=require('wrangler').unstable_splitSqlQuery;
const paths=['site-visibility/domain','site-visibility/repository','site-visibility/gate','site-visibility/http','site-visibility/maintenance','admin/session-crypto','backup/export','backup/validator','backup/restore-plan'];
const loaded=await loadTestModules(paths.map(p=>'lib/'+p+'.ts')),m=p=>loaded.modules['lib/'+p+'.ts'];
const temp=await mkdtemp(join(tmpdir(),'holocron-maintenance-'));let mf,outbound=0;
const secret='synthetic-admin-secret-for-isolated-tests',scheduler='synthetic-scheduler-secret';
try{
 const entry=join(temp,'worker.mjs');
 await build({stdin:{contents:`import {withSiteVisibility} from ${JSON.stringify(resolve('lib/site-visibility/gate.ts'))};export default {fetch(r,e){return withSiteVisibility(r,e,async()=>new Response('HANDLER',{headers:{'Cache-Control':'public,max-age=3600','Vary':'RSC'}}));}}`,resolveDir:process.cwd()},outfile:entry,bundle:true,format:'esm',platform:'neutral',logLevel:'silent'});
 const options={modules:true,scriptPath:entry,modulesRoot:temp,d1Persist:join(temp,'state'),compatibilityDate:'2026-05-15',d1Databases:['DB'],bindings:{HOLOCRON_ADMIN_SESSION_SECRET:secret,HOLOCRON_SCHEDULER_SECRET:scheduler},outboundService:()=>{outbound++;throw Error('NO_OUTBOUND');}};mf=new Miniflare(options);
 let db=await mf.getD1Database('DB');for(const f of(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch(split(await readFile('drizzle/'+f,'utf8')).map(s=>db.prepare(s)));
 const repo=m('site-visibility/repository'),domain=m('site-visibility/domain');const initial=await repo.readVisibility(db);assert.equal(initial.mode,'PUBLIC');
 let response=await mf.dispatchFetch('https://local.test/');assert.equal(await response.text(),'HANDLER');assert.match(response.headers.get('cache-control'),/no-store/);assert.match(response.headers.get('vary'),/RSC/);
 const request=(body,origin='https://local.test')=>new Request('https://local.test/api/admin/site-visibility',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const deps={database:()=>db,authorized:async()=>true};const fields={mode:'MAINTENANCE',title:'은하계 기록 보수 중',body:'새로운 항로를 준비하고 있습니다.\n더 나은 모습으로 다시 찾아뵙겠습니다.'};
 assert.equal((await m('site-visibility/http').handleVisibility(request({expectedRevision:0,fields}),{...deps,authorized:async()=>false})).status,401);
 assert.equal((await m('site-visibility/http').handleVisibility(request({expectedRevision:0,fields},'https://evil.invalid'),deps)).status,403);
 const saved=await repo.saveVisibility(db,{expectedRevision:0,fields});assert.equal(saved.mode,'MAINTENANCE');assert.equal((await repo.readVisibility(db)).mode,'MAINTENANCE');
 await assert.rejects(repo.saveVisibility(db,{expectedRevision:0,fields}),e=>e.code==='VISIBILITY_CONFLICT');
 await mf.dispose();mf=new Miniflare(options);db=await mf.getD1Database('DB');assert.equal((await repo.readVisibility(db)).mode,'MAINTENANCE','durable restart');
 const pathsToBlock=['/','/news','/works','/quiz','/roadmap','/assistant','/racing','/admin','/api/news','/api/quiz','/api/announcement','/api/assistant/retrieve','/api/credit/visit','/api/admin/site-visibility','/_next/data/build/index.json'];
 for(const path of pathsToBlock)for(const method of ['GET','POST','HEAD']){
  const r=await mf.dispatchFetch('https://local.test'+path,{method,headers:{'X-Admin':'true','CF-Connecting-IP':'1.1.1.1'},...(method==='POST'?{body:'{}'}:{})});assert.equal(r.status,503,path);assert.match(r.headers.get('cache-control'),/no-store/);assert.equal(r.headers.get('retry-after'),'300');assert.match(r.headers.get('x-robots-tag'),/noindex/);const body=await r.text();assert(!body.includes('HANDLER'));if(method!=='HEAD'&&!path.startsWith('/api/')&&!path.startsWith('/_next/data/'))assert(body.includes('HOLOCRON'));
 }
 for(const url of ['/?admin=true&preview=1','/?_rsc=abc']){response=await mf.dispatchFetch('https://local.test'+url,{headers:{Cookie:'holocron_admin_session=true; __Host-holocron_account=google'}});assert.equal(response.status,503);}
 response=await mf.dispatchFetch('https://local.test/news',{headers:{RSC:'1'}});assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'SITE_MAINTENANCE'});
 const admin=await m('admin/session-crypto').createAdminSessionToken(secret);
 for(const path of ['/news','/assistant','/api/quiz','/api/admin/site-visibility']){response=await mf.dispatchFetch('https://local.test'+path,{headers:{Cookie:'holocron_admin_session='+admin}});assert.equal(await response.text(),'HANDLER');assert.match(response.headers.get('cache-control'),/no-store/);}
 assert.equal((await mf.dispatchFetch('https://local.test/')).status,503,'logout/no cookie blocks again');
 assert.equal((await mf.dispatchFetch('https://local.test/',{headers:{Cookie:`holocron_admin_session=${admin}; holocron_admin_session=${admin}`}})).status,503);
 for(const path of ['/admin/login','/api/admin/login','/api/admin/logout','/assets/app.js','/_next/static/chunk.css'])assert.equal(await(await mf.dispatchFetch('https://local.test'+path)).text(),'HANDLER');
 assert.equal((await mf.dispatchFetch('https://local.test/api/scheduled/collect',{method:'POST',headers:{Authorization:'Bearer forged'}})).status,503);
 assert.equal(await(await mf.dispatchFetch('https://local.test/api/scheduled/collect',{method:'POST',headers:{Authorization:'Bearer '+scheduler}})).text(),'HANDLER');
 const backup=await m('backup/export').exportBackup(db);assert.equal(backup.version,10);assert.equal(Object.keys(backup.tables).length,16);assert.equal(m('backup/validator').validateBackup(backup).version,10);assert.equal(m('backup/restore-plan').buildRestorePlan(backup).executable,false);assert(backup.tables.settings.some(r=>r.key===domain.SITE_VISIBILITY_KEY));
 const old=structuredClone(backup);old.version=9;assert.throws(()=>m('backup/validator').validateBackup(old),/Forbidden settings/);old.tables.settings=[];old.counts.settings=0;assert.equal(m('backup/validator').validateBackup(old).version,9);
 const hostile=m('site-visibility/maintenance').maintenanceHtml({title:'<script>alert(1)</script>',body:'<img src=x onerror=alert(1)>\ntext'});assert(!hostile.includes('<script>'));assert(hostile.includes('&lt;script&gt;'));
 await db.prepare('UPDATE settings SET value=? WHERE key=?').bind('{}',domain.SITE_VISIBILITY_KEY).run();assert.equal((await mf.dispatchFetch('https://local.test/news')).status,503,'invalid setting fails closed');
 response=await m('site-visibility/gate').siteVisibilityGate(new Request('https://local.test/'),{});assert.equal(response.status,503,'missing DB fails closed');
 assert.equal(await m('site-visibility/gate').siteVisibilityGate(new Request('https://local.test/admin/login'),{}),null,'recovery login survives DB outage');
 const repaired=await repo.saveVisibility(db,{expectedRevision:0,fields:{...fields,mode:'PUBLIC'}});assert.equal(repaired.mode,'PUBLIC');assert.equal(await(await mf.dispatchFetch('https://local.test/news')).text(),'HANDLER');
 await assert.rejects(repo.saveVisibility(db,{expectedRevision:repaired.revision,fields:{...fields,title:'a'.repeat(81)}}));
 const results=await Promise.allSettled([repo.saveVisibility(db,{expectedRevision:repaired.revision,fields}),repo.saveVisibility(db,{expectedRevision:repaired.revision,fields})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(outbound,0);console.log('PASS visibility: real workerd entry gate + D1, default PUBLIC, page/API/RSC/POST/HEAD block, signed admin only, logout/forgery, scheduler auth, no-store, CAS/repair/fail-closed, v10/v9 backups; outbound ZERO');
}finally{await mf?.dispose();await loaded.dispose();await rm(temp,{recursive:true,force:true});}
