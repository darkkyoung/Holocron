import assert from 'node:assert/strict';
import {readFile,readdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler')),{Miniflare}=wr('miniflare'),{build}=wr('esbuild'),split=require('wrangler').unstable_splitSqlQuery;
const temp=await mkdtemp(join(tmpdir(),'holocron-edge-'));let outbound=0,mf;const realFetch=globalThis.fetch;
const loaded=await loadTestModules(['lib/identity/repository.ts','lib/identity/account-session.ts','lib/credit/service.ts']);
const baseline=process.argv.includes('--baseline'),nodeMode=process.argv.includes('--node');
const now=Date.parse('2026-10-21T08:00:00Z');
try{
 const framework=await readFile('node_modules/vinext/dist/server/app-rsc-handler.js','utf8');
 assert(framework.includes('request: cloneRequestWithUrl(routeHandlerRequest, routeHandlerUrl),'));
 assert(!framework.includes('request: new Request(routeHandlerUrl, routeHandlerRequest),'));
 const pkg=JSON.parse(await readFile('node_modules/vinext/package.json'));assert.equal(pkg.version,'1.0.0-beta.5');
 const entry=join(temp,'worker.mjs');
 await build({entryPoints:[resolve('scripts/fixtures/assistant-edge-worker.ts')],outfile:entry,bundle:true,format:'esm',platform:'neutral',conditions:['react-server','workerd','worker','import'],external:['node:*'],define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent',plugins:baseline?[{name:'original-vinext-regression',setup(b){b.onLoad({filter:/app-rsc-handler\.js$/},async args=>({contents:(await readFile(args.path,'utf8')).replace('request: cloneRequestWithUrl(routeHandlerRequest, routeHandlerUrl),','request: new Request(routeHandlerUrl, routeHandlerRequest),'),loader:'js'}));}}]:[]});
 mf=new Miniflare({modules:true,modulesRoot:temp,scriptPath:entry,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],cf:{colo:'TEST'},outboundService:()=>{outbound++;throw Error('OUTBOUND_FORBIDDEN');}});
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch(split(await readFile('drizzle/'+f,'utf8')).map(s=>db.prepare(s)));
 await db.prepare("INSERT INTO articles(id,topic,title,summary,image,url,source,published,category,status) VALUES('edge-article','edge-story','스타파이터 제작 보도','매체는 스타파이터 제작 소식을 전했다.','','https://example.invalid/edge','Deadline','2026-10-20','영화','published')").run();
 const headers={'Origin':'https://edge.invalid','Content-Type':'application/json','Sec-Fetch-Site':'same-origin','CF-Connecting-IP':'192.0.2.1'};
 if(nodeMode)globalThis.fetch=()=>{outbound++;throw Error('NODE_OUTBOUND_FORBIDDEN');};
 const nodeWorker=nodeMode?(await import('file://'+entry)).default:null;
 const call=(path,body,h={})=>{const init={method:'POST',headers:{...headers,...h},body:JSON.stringify(body)};if(!nodeMode)return mf.dispatchFetch('https://edge.invalid'+path,{...init,cf:{colo:'TEST'}});const req=new Request('https://edge.invalid'+path,init);Object.defineProperty(req,'cf',{value:{colo:'TEST'}});return nodeWorker.fetch(req,{DB:db},{waitUntil(){},passThroughOnException(){}});};
 verification:{
 let r=await call('/probe',{});
 if(baseline&&nodeMode){assert.deepEqual(await r.json(),{trusted:false,colo:false});r=await call('/retrieve',{mode:'qa',query:'스타파이터',filters:{}});assert.equal(r.status,503);assert.equal((await r.json()).error.code,'NETWORK_UNAVAILABLE');assert.equal(outbound,0);console.log('BASELINE REPRODUCED: unpatched Vinext loses CF metadata and free retrieval returns NETWORK_UNAVAILABLE in Node Vinext + isolated D1 (workerd itself preserves cf).');break verification;}
 assert.deepEqual(await r.json(),{trusted:true,colo:true});
 for(const h of [{'test-no-cf':'1'},{'test-no-cf':'1','X-Forwarded-For':'192.0.2.1','X-CF-Colo':'TEST','cf':'{"colo":"TEST"}'},{'test-ip':'garbage'},{'test-ip':'missing','X-Forwarded-For':'192.0.2.1'}]){r=await call('/retrieve',{mode:'qa',query:'스타파이터',filters:{}},h);assert.equal(r.status,503,JSON.stringify(h));assert.equal((await r.json()).error.code,'NETWORK_UNAVAILABLE');}
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM assistant_admissions').first()).n,0);
 r=await call('/retrieve',{mode:'qa',query:'스타파이터',filters:{}});assert.equal(r.status,200);const result=await r.json();assert(result.candidates.length);assert(result.receipt);const cookie=r.headers.get('set-cookie').split(';')[0];
 const input={requestId:crypto.randomUUID(),mode:'qa',receipt:result.receipt,selectedStoryIds:[result.candidates[0].storyId],instructions:'',includeDraft:false};
 r=await call('/generate',input,{Cookie:cookie});assert.equal(r.status,401);assert.equal((await r.json()).error.code,'LOGIN_REQUIRED');
 const accountRecord=await loaded.modules['lib/identity/repository.ts'].createAccount(db,new Date(now)),owner=accountRecord.owner;
 const credit=loaded.modules['lib/credit/service.ts'].creditService(db);await credit.credit({owner,amount:20,kind:'reward',idempotencyKey:'synthetic-fixture'});
 const account=await loaded.modules['lib/identity/account-session.ts'].issueAccountSession(accountRecord.userId,'synthetic-edge-account-secret-32-bytes',now);
 const cookies=cookie+'; '+account.split(';')[0];
 r=await call('/generate',input,{Cookie:cookies,'test-no-cf':'1'});assert.equal(r.status,503);assert.equal((await r.json()).error.code,'NETWORK_UNAVAILABLE');assert.equal((await credit.getBalance(owner)).balance,20);
 r=await call('/generate',input,{Cookie:cookies});const generated=await r.json();assert.equal(r.status,200,JSON.stringify(generated));assert.equal(generated.credit.charged,5);assert.equal((await credit.getBalance(owner)).balance,15);assert.equal(r.headers.get('test-mock-calls'),'1');
 r=await call('/generate',input,{Cookie:cookies});assert.equal(r.status,409);assert.equal(r.headers.get('test-mock-calls'),'1');assert.equal((await credit.getBalance(owner)).balance,15);
 for(const path of ['/generate','/retrieve']){r=await call(path,{}, {'test-off':'1'});assert.equal(r.status,503);assert.equal((await r.json()).error.code,'ASSISTANT_UNAVAILABLE');}
 let limited=false;for(let i=0;i<15;i++){r=await call('/retrieve',{mode:'qa',query:'스타파이터',filters:{}},{Cookie:cookie});if(r.status===429){assert.equal((await r.json()).error.code,'ADMISSION_LIMIT');limited=true;break;}assert.equal(r.status,200);}assert(limited);
 assert.equal(outbound,0);console.log((nodeMode?'NODE ':'WORKERD ')+'PASS: pinned real Vinext dispatch → Request.cf → retrieval/receipt → Account generation mock/D1 debit/replay; forged headers/OFF/rate-limit rejected; external outbound 0. Hosted Cloudflare acceptance remains pending.');
}
}finally{globalThis.fetch=realFetch;await mf?.dispose();await loaded.dispose();await rm(temp,{recursive:true,force:true});}
