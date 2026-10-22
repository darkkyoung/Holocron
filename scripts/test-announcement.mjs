import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler')),{Miniflare}=wr('miniflare'),sharp=createRequire(wr.resolve('miniflare'))('sharp'),split=require('wrangler').unstable_splitSqlQuery;
const loaded=await loadTestModules(['lib/announcement/http.ts','lib/announcement/domain.ts','lib/announcement/image.ts','lib/announcement/repository.ts','lib/announcement/snooze.ts','lib/backup/export.ts','lib/backup/validator.ts','lib/backup/restore-plan.ts']);
const m=p=>loaded.modules['lib/'+p+'.ts'],http=m('announcement/http'),domain=m('announcement/domain'),repo=m('announcement/repository');
let outbound=0;const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("isolated announcement")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],outboundService:()=>{outbound++;throw Error('FORBIDDEN');}});
try{
 const db=await mf.getD1Database('DB');for(const f of (await readdir('drizzle')).filter(x=>x.endsWith('.sql')).sort())await db.batch(split(await readFile('drizzle/'+f,'utf8')).map(s=>db.prepare(s)));
 const body=await sharp({create:{width:800,height:400,channels:3,background:'#283348'}}).webp().toBuffer();
 const image={mime:'image/webp',data:body.toString('base64'),width:800,height:400};assert.deepEqual(m('announcement/image').validateImage(image),image);
 const profiled=await sharp({create:{width:800,height:400,channels:3,background:'#283348'}}).withIccProfile('srgb').webp().toBuffer();
 assert.throws(()=>m('announcement/image').validateImage({...image,data:profiled.toString('base64')}));
 const stripped=m('announcement/image').stripEncodedWebPMetadata(profiled);
 assert(m('announcement/image').validateImage({...image,data:Buffer.from(stripped).toString('base64')}));
 assert.deepEqual(await sharp(stripped).raw().toBuffer(),await sharp(profiled).raw().toBuffer());
 const initial=domain.emptyAnnouncement(),fields={enabled:false,title:'새 소식 안내',body:'첫 줄\n두 번째 줄',alt:'',decorative:true,crop:{x:25,y:75,zoom:150},image};
 const deps={database:()=>db,authorized:async()=>true};
 const req=(value,headers={})=>new Request('https://local.invalid/api/admin/announcement',{method:'POST',headers:{Origin:'https://local.invalid','Sec-Fetch-Site':'same-origin','Content-Type':'application/json',...headers},body:JSON.stringify(value)});
 const publicReq=path=>new Request('https://local.invalid'+path);
 let response=await http.handlePublicAnnouncement(publicReq('/api/announcement'),()=>db);assert.deepEqual(await response.json(),{announcement:null});assert.deepEqual(await repo.readAnnouncement(db),initial);
 let touched=0;response=await http.handleAdminAnnouncement(req({}),{authorized:async()=>false,database:()=>{touched++;throw Error();}});assert.equal(response.status,401);assert.equal(touched,0);
 for(const headers of [{Origin:'https://evil.invalid'},{'Sec-Fetch-Site':'same-site'},{'Content-Type':'text/html'}]){response=await http.handleAdminAnnouncement(req({},headers),deps);assert([403,415].includes(response.status));}
 response=await http.handleAdminAnnouncement(req({payload:'x'.repeat(domain.MAX_ANNOUNCEMENT_BODY)}),deps);assert.equal(response.status,413);
 response=await http.handleAdminAnnouncement(req({action:'save',expectedRevision:0,fields}),deps);assert.equal(response.status,200);let saved=await response.json();assert.equal(saved.enabled,false);assert.equal(saved.revision,1);assert.equal(saved.id,null);
 response=await http.handlePublicAnnouncement(publicReq('/api/announcement'),()=>db);assert.equal((await response.json()).announcement,null);
 response=await http.handleAdminAnnouncement(req({action:'publish',expectedRevision:1,fields}),deps);assert.equal(response.status,200);saved=await response.json();assert(saved.enabled);assert(domain.validAnnouncementId(saved.id));const firstId=saved.id;
 response=await http.handlePublicAnnouncement(publicReq('/api/announcement'),()=>db);const publicData=(await response.json()).announcement;assert.equal(publicData.body,fields.body);assert(!JSON.stringify(publicData).includes(image.data));assert(!('image' in publicData));assert(!('updatedAt' in publicData));
 response=await http.handlePublicAnnouncement(publicReq(publicData.imageUrl),()=>db,true);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/webp');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.deepEqual(Buffer.from(await response.arrayBuffer()),body);
 const update={...fields,enabled:true,crop:{x:80,y:10,zoom:225}};
 const competing=await Promise.all([http.handleAdminAnnouncement(req({action:'save',expectedRevision:2,fields:update}),deps),http.handleAdminAnnouncement(req({action:'save',expectedRevision:2,fields:{...update,title:'competing'}}),deps)]);
 assert.deepEqual(competing.map(x=>x.status).sort(),[200,409]);saved=await repo.readAnnouncement(db);assert.equal(saved.id,firstId);assert.equal(saved.revision,3);assert.deepEqual(saved.crop,update.crop);
 response=await http.handlePublicAnnouncement(publicReq(publicData.imageUrl),()=>db,true);assert.equal(response.status,404,'stale image revision');
 response=await http.handleAdminAnnouncement(req({action:'publish',expectedRevision:saved.revision,fields}),deps);assert.equal(response.status,200);saved=await response.json();assert.notEqual(saved.id,firstId);
 const wrong=[{...fields,title:'<script>alert(1)</script>'},{...fields,body:'x'.repeat(4001)},{...fields,crop:{x:101,y:50,zoom:100}},{...fields,crop:{x:0,y:0,zoom:99}},{...fields,image:{...image,mime:'image/svg+xml'}},{...fields,image:{...image,data:btoa('<svg onload="alert(1)"></svg>')}},{...fields,image:{...image,data:image.data+'AAAA'}},{...fields,image:{...image,width:9999}},{...fields,image:{...image,data:'AAAA'.repeat(60_000)}},{...fields,enabled:true,decorative:false,alt:''}];
 for(const bad of wrong){response=await http.handleAdminAnnouncement(req({action:'save',expectedRevision:saved.revision,fields:bad}),deps);assert.equal(response.status,400);assert.equal((await repo.readAnnouncement(db)).revision,saved.revision);}
 const mutate=b=>{const x=Buffer.from(body);b(x);return {...image,data:x.toString('base64')};};
 for(const bad of [mutate(b=>b.write('HTML',0)),mutate(b=>b.writeUInt32LE(1,4)),mutate(b=>b.write('ANIM',12)),{...image,data:body.subarray(0,-1).toString('base64')}])assert.throws(()=>m('announcement/image').validateImage(bad));
 // Export/plan retains exactly one image-bearing setting; old versions reject its key.
 const backup=await m('backup/export').exportBackup(db);assert.equal(backup.version,9);assert.equal(Object.keys(backup.tables).length,16);assert.equal(backup.schema.latestMigration,'0020_account_assistant_access.sql');
 const row=backup.tables.settings.find(x=>x.key===domain.ANNOUNCEMENT_KEY);assert.deepEqual(JSON.parse(row.value),saved);assert.equal(m('backup/restore-plan').buildRestorePlan(backup).executable,false);
 const malformed=structuredClone(backup);malformed.tables.settings.find(x=>x.key===domain.ANNOUNCEMENT_KEY).value='{}';assert.throws(()=>m('backup/validator').validateBackup(malformed),/announcement/);
 const old=structuredClone(backup);old.version=7;old.schema.latestMigration='0019_credit_policy_budget.sql';assert.throws(()=>m('backup/validator').validateBackup(old),/Forbidden/);old.tables.settings=[];old.counts.settings=0;assert.equal(m('backup/validator').validateBackup(old).version,7);
 response=await http.handleAdminAnnouncement(req({action:'save',expectedRevision:saved.revision,fields:{...fields,enabled:false}}),deps);assert.equal(response.status,200);response=await http.handlePublicAnnouncement(publicReq(`/api/announcement/image?id=${saved.id}&revision=${saved.revision}`),()=>db,true);assert.equal(response.status,404);
 const snooze=m('announcement/snooze'),memory=new Map(),store={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},time=100000;
 assert.equal(snooze.isSnoozed(store,firstId,time),false);assert(snooze.snooze(store,firstId,time));assert.deepEqual(Object.keys(JSON.parse(memory.get(snooze.SNOOZE_KEY))).sort(),['expiresAt','id']);assert(snooze.isSnoozed(store,firstId,time+1));assert(!snooze.isSnoozed(store,saved.id,time+1));assert(!snooze.isSnoozed(store,firstId,time+snooze.SNOOZE_MS));assert.equal(memory.size,0);
 memory.set(snooze.SNOOZE_KEY,'invalid');assert(!snooze.isSnoozed(store,firstId,time));const blocked={getItem(){throw Error();},setItem(){throw Error();},removeItem(){throw Error();}};assert(!snooze.isSnoozed(blocked,firstId));assert(!snooze.snooze(blocked,firstId));
 assert.equal(outbound,0);console.log('PASS announcement: isolated D1 atomic save/publish/conflict, auth/origin/bounds/WebP validation, active-only metadata/image routes, crop persistence, v8/old-backup boundary, 168h/new-ID/storage failure. Provider outbound 0.');
}finally{await mf.dispose();await loaded.dispose();}

// Actual component rendering, separate from the browser fixture and D1 tests.
const {loadUiModules}=await import('./assistant-ui-test-loader.mjs');
const {createElement}=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
const ui=await loadUiModules(['components/announcement/announcement-editor.tsx','components/announcement/banner.tsx','components/announcement/announcement-popup.tsx']);
try{
 const render=(path,props)=>renderToStaticMarkup(createElement(ui.modules['components/announcement/'+path+'.tsx'].default,props));
 const empty=domain.emptyAnnouncement();
 let markup=render('announcement-editor',{initial:empty});
 assert(markup.includes('type="file"')&&markup.includes('image/jpeg,image/png,image/webp'));
 assert(markup.includes('공지 팝업 관리')&&markup.includes('새 공지 게시')&&markup.includes('비공개'));
 markup=render('announcement-editor',{initial:{...empty,title:'<script>unsafe</script>',body:'<img src=x onerror=unsafe>'}});
 assert(!markup.includes('<script>')&&!markup.includes('<img src="x"'));assert(markup.includes('&lt;script&gt;'));
 markup=render('banner',{src:'/api/announcement/image?id=synthetic',alt:'공지 설명',decorative:false,crop:{x:20,y:70,zoom:150}});
 assert(markup.includes('alt="공지 설명"')&&markup.includes('object-position:20% 70%')&&markup.includes('scale(1.5)'));
 markup=render('banner',{src:'/image',alt:'unused',decorative:true,crop:{x:50,y:50,zoom:100}});assert(markup.includes('alt=""'));
 assert.equal(render('announcement-popup',{}),'','SSR has no notice or embedded image payload');
 console.log('PASS announcement React SSR: safe text, real file input, preview/crop/alt, default-OFF public markup. Browser interaction results are recorded separately.');
}finally{await ui.dispose();}
