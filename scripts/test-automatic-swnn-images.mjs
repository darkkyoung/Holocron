import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
let outbound=0,requests=[],respond;
const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',script:'export default {fetch(){return new Response("isolated")}}',d1Databases:['DB'],outboundService:()=>{outbound++;throw Error('OUTBOUND_FORBIDDEN');}});
const db=await mf.getD1Database('DB');
for(const name of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort())await db.batch(require('wrangler').unstable_splitSqlQuery(await readFile('drizzle/'+name,'utf8')).map(s=>db.prepare(s)));
globalThis.__swnnDb=db;
const newsStub=`export const db=()=>globalThis.__swnnDb;export const list=async()=>(await db().prepare('SELECT * FROM articles').all()).results;export const setting=(key,value)=>db().prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,value).run();`;
const loaded=await loadTestModules(['lib/collection/image-recovery.ts','lib/collection/repository.ts','lib/collection/metadata.ts','lib/collection/sources/swnn.ts','lib/collection/run.ts'],{stubs:{'../news':newsStub,'@/lib/news':newsStub,'@/lib/collect':'export const collect=()=>globalThis.__swnnCollect();','./health-repository':'export async function updateCollectionHealth(){}'}});
const recovery=loaded.modules['lib/collection/image-recovery.ts'],repo=loaded.modules['lib/collection/repository.ts'],metadata=loaded.modules['lib/collection/metadata.ts'],adapter=loaded.modules['lib/collection/sources/swnn.ts'].swnnAdapter;
const original=globalThis.fetch;
globalThis.fetch=async(url,options)=>{
 assert(!String(url).includes('openai'),'no AI request');requests.push(String(url));
 assert(options.signal instanceof AbortSignal);assert.equal(options.redirect,'manual','automatic fetch refuses hidden redirects');
 return respond(String(url),options);
};
const today=new Date().toISOString().slice(0,10),image='https://images.example/recovered.jpg';
async function insert(id,extra={}){
 const a={id,topic:'manual-story',topic_override:'manual-story',title:'수동 제목',title_override:'수동 제목',summary:'보존할 기사 요약',image:'',url:`https://starwarsnewsnet.com/2026/10/${id}.html`,source:'Star Wars News Net',published:today,category:'영화',status:'published',status_override:null,reason:'수동 결정 유지',franchise:'star-wars',...extra};
 await db.prepare(`INSERT INTO articles(${Object.keys(a).join(',')}) VALUES(${Object.keys(a).map(()=>'?').join(',')})`).bind(...Object.values(a)).run();return a;
}
const row=id=>db.prepare('SELECT * FROM articles WHERE id=?').bind(id).first();
const reset=async()=>{await db.batch([db.prepare('DELETE FROM articles'),db.prepare("DELETE FROM settings WHERE key='collection_swnn_image_cursor_v1'")]);requests=[];};
const run=()=>recovery.recoverAutomaticSwnnImages(Date.now()+30000);
const feed=()=>new Response('<rss><channel></channel></rss>');
const restImage=()=>new Response(JSON.stringify([{yoast_head_json:{og_image:[{url:image}]}}]));
const noImage=url=>url.endsWith('/feed')?feed():url.includes('/wp-json/')?new Response('[]'):new Response('<html/>');
let checks=0;
try{
 // Initial discovery failure -> missing DB image -> subsequent shared recovery.
 await reset();const a=await insert('first');respond=noImage;
 const enrich=metadata.createCandidateEnricher(adapter,undefined,url=>metadata.fetchSourceText(url,15000,(input,init)=>fetch(input,{...init,redirect:'manual'})));
 const candidate={url:a.url,title:a.title,description:a.summary,published:a.published,image:''};
 assert.equal((await enrich(candidate)).candidate.image,'');
 let result=await run();assert.equal(result.missing,1);assert.deepEqual(await row(a.id),a);
 respond=url=>url.endsWith('/feed')?feed():restImage();requests=[];
 result=await run();assert.equal(result.recovered,1);assert.deepEqual(await row(a.id),{...a,image});
 assert.equal((await run()).candidates,0,'repeat recovery is idempotent');assert.equal((await db.prepare('SELECT COUNT(*) n FROM articles').first()).n,1,'no duplicate insertion');checks++;
 // New missing articles take priority once; blocked new IDs are deferred to future runs.
 await reset();for(const id of ['old-a','old-b','new-z','denied-z'])await insert(id);
 respond=url=>url.endsWith('/feed')?feed():restImage();
 result=await recovery.recoverAutomaticSwnnImages(Date.now()+30000,Date.now,['new-z'],['denied-z']);
 assert.equal(result.attempted,3);assert.equal((await row('new-z')).image,image);
 assert.equal((await row('denied-z')).image,'');assert(!requests.some(url=>url.includes('denied-z')));
 assert(requests.findIndex(url=>url.includes('new-z'))<requests.findIndex(url=>url.includes('old-a')));
 requests=[];result=await run();assert.equal((await row('denied-z')).image,image,'blocked article remains eligible next collection');checks++;
 // RSS supplies image, no REST/HTML. Normal initial enrichment preserves it.
 await reset();await insert('rss');
 respond=()=>new Response(`<rss><channel><item><title>x</title><link>https://starwarsnewsnet.com/2026/10/rss.html</link><media:thumbnail url="${image}"/></item></channel></rss>`);
 result=await run();assert.equal(result.recovered,1);assert.equal(requests.length,1);
 requests=[];assert.equal((await enrich({...candidate,image})).candidate.image,image);assert.equal(requests.length,0);checks++;
 // Public-only SWNN; protected editorial rows, old dates and existing images untouched.
 await reset();const protectedRows=[];
 for(const [id,extra] of [['normal',{image}],['manual',{image:'https://images.example/admin.jpg'}],['review',{status:'review'}],['excluded',{status:'excluded'}],['override',{status_override:'excluded'}],['old',{published:'2000-01-01'}],['other',{source:'Variety',url:'https://variety.com/article'}]])protectedRows.push(await insert(id,extra));
 await insert('eligible');respond=url=>url.endsWith('/feed')?feed():restImage();result=await run();assert.equal(result.candidates,1);
 for(const a of protectedRows)assert.deepEqual(await row(a.id),a);checks++;
 // Concurrent administrator image/status update wins at conditional UPDATE.
 for(const field of ['image','status']){
  await reset();await insert('race');respond=async url=>{if(url.endsWith('/feed'))return feed();await db.prepare(`UPDATE articles SET ${field}=? WHERE id='race'`).bind(field==='image'?'https://images.example/admin.jpg':'excluded').run();return restImage();};
  result=await run();assert.equal(result.recovered,0);assert.equal(result.unchanged,1);assert.equal(result.failed,0);assert.match(result.report.join('\n'),/저장 조건 불일치/);assert.equal((await row('race'))[field],field==='image'?'https://images.example/admin.jpg':'excluded');checks++;
 }
 // Existing media-ID and HTML fallback are reused, no added retries.
 for(const mode of ['media','html','403','429','timeout','request-error','post-json','post-shape','media-json','media-shape','none']){
  await reset();const before=await insert(mode);
  respond=(url)=>{
   if(url.endsWith('/feed'))return feed();
   if(mode==='403'||mode==='429')return new Response('',{status:Number(mode)});
   if(mode==='timeout')throw new DOMException('PRIVATE_ERROR','TimeoutError');
   if(mode==='request-error')throw new Error('PRIVATE_ERROR Cookie=SECRET https://private.example/');
   if(mode==='post-json'&&url.includes('/posts?'))return new Response('PRIVATE_ERROR: not JSON');
   if(mode==='post-shape'&&url.includes('/posts?'))return new Response('{"message":"PRIVATE_ERROR"}');
   if(mode.startsWith('media-')){
    if(url.includes('/posts?'))return new Response('[{"id":1,"featured_media":2}]');
    if(url.includes('/media/'))return new Response(mode==='media-json'?'PRIVATE_ERROR: not JSON':'null');
   }
   if(mode==='media')return url.includes('/posts?')?new Response('[{"id":1,"featured_media":2}]'):new Response(JSON.stringify({source_url:image}));
   if(url.includes('/posts?'))return new Response('[]');
   return new Response(mode==='html'?`<meta property="og:image" content="${image}">`:'<html/>');
  };
  result=await run();assert.equal(result.recovered,['media','html'].includes(mode)?1:0);assert.equal(requests.length,mode.startsWith('media-')?4:3);
  assert.equal(result.missing,mode==='none'?1:0,'only successful lookups without image metadata are missing');
  assert.equal(result.failed,['media','html','none'].includes(mode)?0:1,'HTTP, timeout, request and parse failures are failures, not missing');
  assert.equal(result.deferred,0,'a per-request timeout before the total deadline is a failure');
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE_ERROR|Cookie|SECRET|private\.example|보존할 기사/);
  if(mode==='403'||mode==='429')assert.match(result.report.join('\n'),new RegExp(`HTTP ${mode}`));
  if(mode==='timeout')assert.match(result.report.join('\n'),/시간 초과/);
  if(mode.includes('json')||mode.includes('shape'))assert.match(result.report.join('\n'),/JSON 파싱 실패/);
  if(!result.recovered)assert.deepEqual(await row(mode),before);checks++;
 }
 // A failure in one lookup is recoverable; existing fallbacks are not disabled.
 for(const failure of ['feed','rest','media']){
  await reset();await insert('fallback');
  respond=url=>{
   if(url.endsWith('/feed'))return failure==='feed'?new Response('',{status:403}):feed();
   if(url.includes('/posts?'))return failure==='rest'?new Response('',{status:403}):failure==='media'?new Response('[{"id":1,"featured_media":2}]'):restImage();
   if(url.includes('/media/'))return new Response('',{status:403});
   return new Response(`<meta property="og:image" content="${image}">`);
  };
  result=await run();assert.equal(result.recovered,1);assert.equal(result.failed,0);assert.equal(result.missing,0);assert.match(result.report.join('\n'),/HTTP 403/);checks++;
 }
 // The shared feed's error stays aggregate, not an invented per-article 403.
 for(const failure of ['403','parse','timeout']){
  await reset();for(const id of ['shared-a','shared-b','shared-c'])await insert(id);
  respond=url=>{
   if(!url.endsWith('/feed'))return noImage(url);
   if(failure==='timeout')throw new DOMException('PRIVATE_ERROR','TimeoutError');
   return failure==='403'?new Response('',{status:403}):new Response('<html>PRIVATE_ERROR</html>');
  };
  result=await run();assert.equal(result.failed,3);assert.equal(result.missing,0,'incomplete shared feed coverage cannot establish no image');
  assert.equal(result.requests,7);assert.equal(result.report.filter(s=>s.includes('공유 RSS')).length,1);
  assert.match(result.report[1],/진단 \(집계\): 공유 RSS/);assert.doesNotMatch(result.report.join('\n'),/PRIVATE_ERROR|shared-[abc]/);checks++;
 }
 // Failure state cannot leak to the next article in the same collection.
 await reset();for(const id of ['mixed-a','mixed-b','mixed-c'])await insert(id);
 respond=url=>{
  if(url.endsWith('/feed'))return feed();
  if(url.includes('mixed-a'))return new Response('',{status:403});
  if(url.includes('mixed-c'))return restImage();
  return noImage(url);
 };
 result=await run();assert.equal(result.failed,1);assert.equal(result.missing,1);assert.equal(result.recovered,1);assert.equal(result.deferred,0);assert.equal((await row('mixed-c')).image,image);checks++;
 // Many distinct errors remain a bounded aggregate report, without source bodies.
 await reset();for(const id of ['errors-a','errors-b','errors-c'])await insert(id);
 const statuses=[403,401,402,429,500,502,503];let statusIndex=0;
 respond=()=>new Response('PRIVATE_ERROR',{status:statuses[statusIndex++]});
 result=await run();assert.equal(result.failed,3);assert.equal(result.missing,0);assert.equal(result.requests,7);assert.equal(result.report.length,7,'one summary plus at most six diagnostic lines');assert.doesNotMatch(result.report.join('\n'),/PRIVATE_ERROR|errors-[abc]/);checks++;
 // Three candidates, ten requests total, circular progress past permanent failures.
 await reset();for(let n=0;n<7;n++)await insert(`bound-${n}`);
 respond=url=>url.endsWith('/feed')?feed():url.includes('/posts?')?new Response('[{"id":1,"featured_media":2}]'):url.includes('/media/')?new Response('{}'):new Response('<html/>');
 for(let round=0;round<3;round++){
  requests=[];result=await run();assert.equal(result.attempted,3);assert.equal(requests.length,10);assert.equal(result.requests,10);
  assert.equal(result.missing,3,'a completed final HTML lookup on request 10 is not deferred');assert.equal(result.deferred,0);
  if(round===0)assert.equal((await db.prepare("SELECT value FROM settings WHERE key='collection_swnn_image_cursor_v1'").first()).value,'bound-2');
  if(round===1)assert(requests.some(url=>url.includes('bound-5')),'older failures cannot starve later candidates');
 }checks++;
 // A genuine interrupted fallback at the request ceiling is deferred, with no retry.
 await reset();for(const id of ['budget-a','budget-b','budget-c'])await insert(id);
 respond=url=>url.endsWith('/feed')?feed():new Response('',{status:302,headers:{location:url+(url.includes('?')?'&':'?')+'hop=1'}});
 result=await run();assert.equal(result.requests,10);assert.equal(result.attempted,2);assert.equal(result.failed,1);assert.equal(result.missing,0);assert.equal(result.deferred,2);
 assert.match(result.report.join('\n'),/예산 소진/);assert.equal((await db.prepare("SELECT value FROM settings WHERE key='collection_swnn_image_cursor_v1'").first()).value,'budget-b');checks++;
 // Redirects count against the same ceiling and cannot escape SWNN.
 await reset();await insert('redirect');
 respond=url=>url.endsWith('/feed')?new Response('',{status:301,headers:{location:'/feed/'}}):url.endsWith('/feed/')?feed():restImage();
 result=await run();assert.equal(result.recovered,1);assert.equal(requests.length,3);
 await reset();await insert('redirect-loop');respond=url=>new Response('',{status:302,headers:{location:url+'/'}});
 result=await run();assert.equal(result.recovered,0);assert.equal(requests.length,9);assert(requests.length<=10);
 await reset();await insert('redirect-host');respond=()=>new Response('',{status:302,headers:{location:'https://other.example/secret'}});
 result=await run();assert.equal(result.recovered,0);assert(requests.every(u=>!u.includes('other.example')));checks++;
 // Exhausted phase budget: no new request or image write after deadline.
 await reset();await insert('deadline');let clock=Date.now();
 respond=()=>{clock+=30001;return feed();};result=await recovery.recoverAutomaticSwnnImages(clock+30000,()=>clock);
 assert.equal(result.requests,1);assert.equal(result.attempted,0);assert.equal(result.deferred,1);assert.equal((await row('deadline')).image,'');checks++;
 await reset();await insert('late-image');clock=Date.now();
 respond=url=>{if(url.endsWith('/feed'))return feed();clock+=30001;return restImage();};
 result=await recovery.recoverAutomaticSwnnImages(clock+30000,()=>clock);assert.equal(result.recovered,0);assert.equal(result.deferred,1);assert.equal((await row('late-image')).image,'');checks++;
 // Real abort signal ends an in-flight network request; all work is awaited.
 requests=[];let settled=false;
 respond=(_url,{signal})=>new Promise((_,reject)=>{signal.addEventListener('abort',()=>{settled=true;reject(signal.reason);},{once:true});});
 const began=Date.now();result=await recovery.recoverAutomaticSwnnImages(Date.now()+100);
 assert(settled);assert(Date.now()-began<1500);assert.equal(requests.length,1);assert.equal(result.recovered,0);checks++;
 // DB rejection isolated by runner; statement itself cannot overwrite a nonempty image.
 await reset();await insert('guard',{image});assert.equal(await repo.updateAutomaticSwnnImage('guard','https://images.example/other.jpg',today),false);assert.equal((await row('guard')).image,image);
 const manualService=await readFile('lib/admin/service.ts','utf8'),scheduledRoute=await readFile('app/api/scheduled/collect/route.ts','utf8');
 assert.match(manualService,/retry-missing-images/);assert.match(manualService,/runCollection\('manual'\);invalidatePublicNewsCache/);assert.match(scheduledRoute,/await runCollection\('scheduled'\);\s*invalidatePublicNewsCache/);checks++;
 // Real runner + real D1 collection lease, manual then scheduled: duplicate article
 // remains eligible for images without re-entering AI/insert processing.
 await reset();let collections=0;
 globalThis.__swnnCollect=async()=>{
  collections++;if(collections===1)await insert('runner-new');
  return {ok:true,count:collections===1?1:0,activeSources:1,sources:[{sourceId:'swnn',disabled:false,duplicate:collections===1?0:1}],localization:{failed:0},report:[]};
 };
 const runner=loaded.modules['lib/collection/run.ts'];respond=noImage;
 const initial=await runner.runCollection('manual');assert.equal(initial.count,1);assert.equal((await row('runner-new')).image,'');
 let begin,finish;const started=new Promise(r=>begin=r),waiting=new Promise(r=>finish=r);
 respond=async url=>{assert(await db.prepare('SELECT * FROM collection_locks').first(),'real D1 lock held during recovery');if(url.endsWith('/feed')){begin();await waiting;return feed();}return restImage();};
 const pending=runner.runCollection('scheduled');await started;
 assert.equal((await runner.runCollection('manual')).reason,'collection_in_progress');finish();const repaired=await pending;
 assert.equal(repaired.count,0);assert.equal(repaired.duplicateCount,1);assert.equal((await row('runner-new')).image,image);
 assert.equal((await db.prepare('SELECT COUNT(*) n FROM articles').first()).n,1);assert.equal(await db.prepare('SELECT * FROM collection_locks').first(),null);
 assert(JSON.parse((await db.prepare("SELECT value FROM settings WHERE key='last_collection'").first()).value).report.some(s=>s.includes('1건 성공')));checks++;
 // The natural/manual shared runner persists the corrected report, and unlocks.
 const blocked=await insert('runner-blocked');respond=url=>url.endsWith('/feed')?feed():new Response('PRIVATE_ERROR',{status:403});
 await runner.runCollection('scheduled');
 const saved=JSON.parse((await db.prepare("SELECT value FROM settings WHERE key='last_collection'").first()).value);
 assert(saved.report.some(s=>s.includes('0건 미발견 / 1건 실패')));assert(saved.report.some(s=>s.includes('HTTP 403')));
 assert.deepEqual(await row('runner-blocked'),blocked);assert.equal(await db.prepare('SELECT * FROM collection_locks').first(),null);checks++;
 assert.equal(outbound,0);console.log(`Automatic SWNN images: ${checks} scenario groups PASS, real isolated Miniflare D1, Provider/outbound ZERO`);
}finally{globalThis.fetch=original;delete globalThis.__swnnDb;delete globalThis.__swnnCollect;await loaded.dispose();await mf.dispose();}
