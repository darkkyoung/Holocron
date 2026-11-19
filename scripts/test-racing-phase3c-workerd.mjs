// Fresh workerd runtime pair vs a subsequent sealed race in the same runtime.
// Clock control and bootstrap below exist only in generated test entry modules.
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),wr=require('wrangler'),dep=createRequire(require.resolve('wrangler')),{Miniflare}=dep('miniflare');
async function bundle(contents){return (await dep('esbuild').build({bundle:true,format:'esm',target:'es2022',write:false,stdin:{contents,resolveDir:process.cwd(),loader:'ts'}})).outputFiles[0].text;}
const runner=await bundle(`import {wake} from './lib/racing-broadcast/runner';import {racingOperations} from './lib/racing/phase3a/operations';import {keyFor} from './lib/racing-broadcast/private';
export default {async fetch(r,e){const t=Number(r.headers.get('qa-time'));if(new URL(r.url).pathname==='/seal'){await racingOperations({db:e.RACING_ISOLATED_DB,key:await keyFor(e),now:()=>t,role:()=>'scheduler'}).createRegular('2026-12-07');}else{await wake(e,()=>t);}return new Response('ok');}}`);
const reader=await bundle(`import {watch} from './lib/racing-broadcast/http';export default {fetch(r,e){return watch(r,e,()=>Number(r.headers.get('qa-time')));}}`);
const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const setup={modules:true,compatibilityDate:'2026-05-15',d1Databases:{RACING_ISOLATED_DB:'qa'},r2Buckets:{RACING_PRIVATE_OBJECTS:'qa'},kvNamespaces:{RACING_BEACON:'qa'},bindings:{RACING_SEAL_KEY:'bd'.repeat(32),RACING_BEACON_PUBLIC_JWK:JSON.stringify(await crypto.subtle.exportKey('jwk',kp.publicKey))}};
const ddl=[];for(const n of ['0001_foundation','0002_admin_grants','0003_custom_seasons'])ddl.push(...wr.unstable_splitSqlQuery(await readFile('db/racing-phase3a/migrations/'+n+'.sql','utf8')));
const times={cold:[],warm:[]},samples=Number(process.env.RACING_QA_PAIRS??12);
for(let i=0;i<samples;i++){
 const mf=new Miniflare({workers:[{...setup,name:'generate',script:runner},{...setup,name:'reader',script:reader}]});
 try{
 const db=await mf.getD1Database('RACING_ISOLATED_DB','generate'),kv=await mf.getKVNamespace('RACING_BEACON','generate');
 await db.batch(ddl.map(s=>db.prepare(s)));
 const gen=await mf.getWorker('generate'),read=await mf.getWorker('reader');
 const send=(worker,path,t)=>worker.fetch('http://qa'+path,{headers:{'qa-time':String(t)}});
 const base=Date.parse('2026-12-07T12:00Z');assert.equal((await send(gen,'/seal',base-86400000)).status,200);
 for(let day=0;day<2;day++){
 const race='regular:2026-12-07:R'+(day+1),start=base+day*86400000,path='/watch?race='+race;
 for(const stage of ['qualifying','main']){
 const ref='isolated-external-v1:'+race+':'+stage,value=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
 const signature=Buffer.from(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},kp.privateKey,new TextEncoder().encode(JSON.stringify({ref,value})))).toString('hex');
 await kv.put(ref,JSON.stringify({ref,value,signature}));
 }
 assert.equal((await send(gen,'/wake',start-3600000)).status,200);
 assert.equal((await(await send(read,path,start-120000)).json()).phase,'PRESHOW');
 const t0=performance.now();const generated=await send(gen,'/wake',start);assert.equal(generated.status,200,(await generated.text()).slice(0,120));
 const frame=await(await send(read,path,start+Math.floor(performance.now()-t0))).json();assert.equal(frame.phase,'RACE');
 times[day?'warm':'cold'].push(performance.now()-t0);
 const row=await db.prepare('SELECT final_at FROM racing_races WHERE id=?').bind(race).first();
 assert.equal((await send(read,path+'&offset=0',start+10000)).status,409);
 await send(gen,'/wake',row.final_at);
 const result=await(await send(read,path,row.final_at)).json(),stored=await db.prepare('SELECT official FROM racing_results WHERE race_id=?').bind(race).first();
 assert.equal(result.phase,'FINAL');assert.deepEqual(result.riders.map(r=>[r.slot,r.rank,r.points]),JSON.parse(stored.official).map(r=>[r.id,r.position,r.points]));
 assert.equal((await(await send(read,path+'&offset=0',row.final_at)).json()).phase,'RACE');
 assert((await(await send(read,'/watch?archive=1',row.final_at)).json()).races.some(r=>r.race===race));
 }
 }finally{await mf.dispose();}
}
const summary=Object.fromEntries(Object.entries(times).map(([k,v])=>{const sorted=v.slice().sort((a,b)=>a-b);return [k,Object.fromEntries([50,95,99].map(p=>['p'+p,Math.round(sorted[Math.ceil(sorted.length*p/100)-1])]))];}));
console.log('PASS workerd scheduled generation -> separate workerd reader -> official classification / replay; ms',summary);
await mkdir('out',{recursive:true});await writeFile('out/3c-workerd.json',JSON.stringify({samples,summary,times,note:'cold = first main race in fresh process after qualifying, warm = second main race in same process. Each artifact is a cache miss.'},null,2));
