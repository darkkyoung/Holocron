// Local-only Chromium fixture: actual Admin components, synthetic state, no D1/Provider.
// pnpm build && node scripts/prepare-admin-navigation-qa.mjs
// sites-preview start <checkout>/out/admin-navigation-qa
import {createRequire} from 'node:module';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve('.'),target=resolve('out/admin-navigation-qa');
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('wrangler'))('esbuild');
await mkdir(target,{recursive:true});
const entry=`import React from 'react';import {createRoot} from 'react-dom/client';import Admin from './app/admin/panel';
const state={articles:[],visibleArticles:[],sources:['StarWars.com','Star Wars News Net','Collider','THR','Deadline','Variety','Forbes'].map((name,i)=>({id:['starwars','swnn','collider','thr','deadline','variety','forbes'][i],name,enabled:i!==2,url:'https://example.invalid',category:'MEDIA',description:'합성 QA'})),collectionHealth:[],ai:false,now:Date.parse('2026-10-22T04:00:00Z'),lastCollection:{trigger:'scheduled',startedAt:'2026-10-21T23:17:00Z',finishedAt:'2026-10-21T23:23:46Z',status:'partial',count:0},collectionSchedule:{intervalHours:3,nextScheduledAt:'2026-10-22T02:23:46Z'}};
state.collectionHealth=state.sources.map((s,i)=>({sourceId:s.id,source:s.name,status:i===2?'disabled':i===1||i===6?'danger':'healthy',lastCheckedAt:state.lastCollection.finishedAt,lastHealthyAt:'2026-10-19T11:11:36Z',lastDiscovered:i===1?9:i===6?510:12,lastInserted:0,lastPrimaryDiscovered:i===1?9:12,lastBackfillDiscovered:0,consecutiveZeroDiscoveries:0,consecutiveFailures:i===1?13:i===6?7:0,lastError:i===1||i===6?'보완 탐색 2건 실패':'',metadataFailure:0,imageLookupFailures:0,imageLookupFailureReasons:[],headlineOnlyFallback:0,backfillFailures:i===1||i===6?2:0}));
state.collectionHealth[6].discovery={primary:'ok',backfill:'failed',lastPrimarySuccessAt:state.lastCollection.finishedAt,lastBackfillSuccessAt:null,primaryError:'',backfillRequests:2,backfillErrors:['https://feeds.forbes.com/sites/synthetic/feed/: HTTP 403']};
const calls=[];window.fetch=async(url,options={})=>{calls.push({path:String(url),method:options.method||'GET',body:options.body});document.getElementById('qa-events').textContent=JSON.stringify(calls);const path=String(url);if(path==='/api/manage'&&options.body){const data=JSON.parse(options.body);if(data.action==='set-collection-interval')state.collectionSchedule.intervalHours=data.intervalHours;}
return new Response(JSON.stringify(path==='/api/manage'?state:path==='/api/admin/news-work'?{inspected:0,added:0,ambiguous:0,unmatched:0,manualPreserved:0,nextCursor:null}:{authenticated:false,enabled:false,items:[],error:'QA ONLY: backup error fixture'}),{status:path==='/api/admin/backup'?503:200,headers:{'Content-Type':'application/json'}});};
createRoot(document.getElementById('root')).render(<Admin authorized initialState={state} name="로컬 QA"/>);`;
await build({stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,outfile:target+'/app.js',platform:'browser',jsx:'automatic',alias:{'@':root},logLevel:'silent'});
// Production global/viewport styles plus the fixture's CSS module class mappings.
const componentCss=await readFile(target+'/app.css','utf8');
const cssRoot=root+'/dist/client/_next/static/css',names=await readdir(cssRoot);
const styles=['index.','panel.','guest-credit-status.','public-geometry.'];
await writeFile(target+'/app.css',(await Promise.all(styles.flatMap(prefix=>names.filter(f=>f.startsWith(prefix))).map(f=>readFile(cssRoot+'/'+f,'utf8')))).join('\n')+'\n'+componentCss);
await writeFile(target+'/frame.html','<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HOLOCRON Admin Local QA</title><link rel="stylesheet" href="/app.css"></head><body><div id="root"></div><pre id="qa-events" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre><script type="module" src="/app.js"></script></body></html>');
const sizes=[[1366,768],[1440,900],[1920,1080],[943,905],[1366,600],[390,844],[375,812],[360,800]];
await writeFile(target+'/index.html',`<!doctype html><html><head><meta charset="utf-8"><title>Admin viewport QA</title><style>body{background:#090b0f;color:#eee;font-family:system-ui}iframe{border:1px solid #888;display:block}a{color:#ffe62d}section{margin-bottom:32px}</style></head><body><h1>100% CSS pixel viewport checks</h1><a href="/frame">단일 화면 / 동작 확인</a>${sizes.map(([w,h])=>`<section><h2>${w}×${h}</h2><iframe id="vp${w}-${h}" title="${w}×${h}" src="/frame" width="${w}" height="${h}"></iframe></section>`).join('')}</body></html>`);
await writeFile(target+'/package.json',JSON.stringify({type:'module',scripts:{dev:'node server.mjs'}}));
await writeFile(target+'/server.mjs',`import http from 'node:http';import{readFile}from'node:fs/promises';import{resolve}from'node:path';const root=process.cwd();http.createServer(async(req,res)=>{const path=new URL(req.url,'http://local').pathname;try{const file=path==='/frame'?'frame.html':path==='/app.js'?'app.js':path==='/app.css'?'app.css':'index.html';res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html; charset=utf-8');res.end(await readFile(resolve(root,file)));}catch{res.statusCode=404;res.end();}}).listen(Number(process.env.PORT||4173),'0.0.0.0');`);
console.log('Local-only fixture ready:',target);
