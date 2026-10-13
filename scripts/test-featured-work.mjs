import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {drizzle} from 'drizzle-orm/sqlite-proxy';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';

const root=resolve('.'),cache=new Map();
const data=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const sqlite=new DatabaseSync(':memory:');
for(const name of (await readdir('drizzle')).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(await readFile(`drizzle/${name}`,'utf8'));
globalThis.__featuredDb=drizzle(async(sql,params,method)=>{
 const stmt=sqlite.prepare(sql);
 if(method==='run'){stmt.run(...params);return {rows:[]};}
 stmt.setReturnArrays(true);return {rows:method==='get'?stmt.get(...params):stmt.all(...params)};
});
async function load(path){
 path=resolve(root,path);if(cache.has(path))return cache.get(path);
 if(path===resolve(root,'lib/admin/session.ts'))return data('export const getAdminSession=async()=>globalThis.__featureAuth?{sub:"admin"}:null;');
 if(path===resolve(root,'lib/public-cache.ts'))return data('export const PUBLIC_WORKS_CACHE_SECONDS=60,PUBLIC_WORKS_CACHE_TAG="works";export const invalidatePublicWorksCache=()=>globalThis.__featureInvalidations++;');
 if(path===resolve(root,'db/index.ts'))return data('export const getDb=()=>globalThis.__featuredDb;');
 if(path.endsWith('.css'))return data('export default new Proxy({}, {get:(_,key)=>String(key)});');
 let source=ts.transpileModule(await readFile(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const specs=[...new Set([...source.matchAll(/from\s+["']([^"']+)["']/g)].map(match=>match[1]))];
 for(const spec of specs){
  let url;
  if(spec.startsWith('.')||spec.startsWith('@/')){
   let next=spec.startsWith('@/')?resolve(root,spec.slice(2)):resolve(dirname(path),spec);
   if(!/\.(css|ts|tsx)$/.test(next)){
    for(const suffix of ['.ts','.tsx','/index.ts']){try{await readFile(next+suffix);next+=suffix;break;}catch{}}
   }
   url=await load(next);
  }else url=spec==='next/cache'?data('export const unstable_cache=fn=>fn;'):import.meta.resolve(spec);
  source=source.replaceAll(`from "${spec}"`,`from ${JSON.stringify(url)}`).replaceAll(`from '${spec}'`,`from ${JSON.stringify(url)}`);
 }
 const url=data(source);cache.set(path,url);return url;
}
const {validateWorkDraft}=await import(await load('lib/works/validation.ts'));
const metadata=await import(await load('lib/works/metadata.ts'));
const repository=await import(await load('lib/works/repository.ts'));
const base={title:'테스트 작품',originalTitle:'Test',type:'영화',status:'upcoming',releaseDate:null,releasePrecision:'unknown',officialUrl:'https://example.com',posterUrl:''};
assert.deepEqual(metadata.validateWorkMetadata({}),{});
assert.deepEqual(metadata.parsePrincipalCast(' Actor A \n Actor B,actor a, '),['Actor A','Actor B']);
assert.deepEqual(metadata.parsePrincipalCast('["Ａ", "a"]'),['Ａ']);
for(const bad of ['[bad','{}',42,[42],['a'.repeat(101)],Array.from({length:9},(_,i)=>`Actor ${i}`)])assert.throws(()=>metadata.parsePrincipalCast(bad));
assert.throws(()=>validateWorkDraft({...base,synopsis:'a'.repeat(1501)}));
assert.throws(()=>validateWorkDraft({...base,creatorCredit:'a'.repeat(241)}));
assert.throws(()=>validateWorkDraft({...base,releaseContext:'a'.repeat(121)}));
for(const [index,fields] of [{},{creatorCredit:' Director '},{principalCast:['Actor']},{synopsis:' Synopsis '},{creatorCredit:'Director',principalCast:['Actor'],synopsis:'Synopsis',releaseContext:'Verified context'}].entries()){
 const work=await repository.createWork(`featured-test-${index}`,validateWorkDraft({...base,...fields}));
 assert.equal(work.creatorCredit,fields.creatorCredit?.trim()??null);
 assert.deepEqual(work.principalCast,fields.principalCast??null);
 assert.equal(work.synopsis,fields.synopsis?.trim()??null);
}
let work=await repository.updateWork('featured-test-4',validateWorkDraft({...base,creatorCredit:'Updated',principalCast:'Actor C\nActor D'}));
assert.equal(work.creatorCredit,'Updated');assert.equal(work.synopsis,'Synopsis');assert.deepEqual(work.principalCast,['Actor C','Actor D']);
work=await repository.updateWork(work.id,validateWorkDraft(base));
assert.equal(work.creatorCredit,'Updated','legacy requests preserve metadata');
assert.equal(work.releaseContext,'Verified context');
assert.equal(sqlite.prepare('SELECT principal_cast FROM works WHERE id=?').get(work.id).principal_cast,'["Actor C","Actor D"]');
work=await repository.updateWork(work.id,validateWorkDraft({...base,creatorCredit:'',principalCast:'',synopsis:null,releaseContext:''}));
for(const key of ['creatorCredit','principalCast','synopsis','releaseContext'])assert.equal(work[key],null,'explicit clear persists');
assert.equal((await repository.listWorks()).find(item=>item.id==='featured-test-0').creatorCredit,null);
const {default:Hero,FeaturedMetadata}=await import(await load('components/works/featured-work-hero.tsx'));
assert.equal(renderToStaticMarkup(React.createElement(FeaturedMetadata,{work})), '');
const full={...work,creatorCredit:'Director',principalCast:['A','B','C','D','E','F'],synopsis:'Saved synopsis',releaseContext:'Verified context'};
let html=renderToStaticMarkup(React.createElement(Hero,{work:full,news:{count:4,stories:[]}}));
assert.match(html,/관련 소식 4/);assert.match(html,/공식 페이지/);assert.match(html,/Saved synopsis/);assert.match(html,/HOLOCRON/);
assert.doesNotMatch(html,/F<\/dd>/,'desktop bounds cast to five');
const preview=html.match(/<button[^>]*class="preview"[\s\S]*?<\/button>/)?.[0];assert.ok(preview);assert.match(preview,/aria-haspopup="dialog"/);assert.doesNotMatch(preview,/<a|Saved synopsis|Director/);
assert.match(renderToStaticMarkup(React.createElement(FeaturedMetadata,{work:full,full:true})),/E · F/);
for(const [fields,label] of [[{status:'recent',type:'영화'},'예매하기'],[{status:'recent',type:'드라마'},'Disney+에서 보기'],[{officialUrl:null},'공식 페이지 준비 중']])assert.match(renderToStaticMarkup(React.createElement(Hero,{work:{...work,...fields}})),new RegExp(label.replace('+','\\+')));
const hero=await readFile('components/works/featured-work-hero.tsx','utf8'),css=await readFile('components/works/featured-work-hero.module.css','utf8');
assert.equal((hero.match(/<Dialog /g)??[]).length,1,'one modal root for details/news/ticket');
assert.match(hero,/onCloseAutoFocus/);assert.match(hero,/returnFocus.current\?\.focus/);
assert.match(hero,/open\('detail',event.currentTarget\)/);assert.match(hero,/inside\?setMode\('news'\)/);
assert.match(css,/max-height:85dvh/);assert.match(css,/overflow-y:auto/);assert.match(css,/width:calc\(100% - 24px\)/);assert.match(css,/max-width:520px/);
assert.match(css,/max-width:820px/);assert.match(css,/pointer:coarse/);assert.match(css,/grid-template-columns:104px minmax\(0,1fr\)/);
for(const viewport of [360,390])assert.ok(viewport-24-104-16>0,'preview leaves flexible text width; not a browser geometry test');
assert.match(await readFile('components/works/work-form.tsx','utf8'),/\.\.\.fromWork\(work\),\.\.\.initialValue/,'TMDB drafts preserve existing manual metadata');
globalThis.__featureAuth=false;globalThis.__featureInvalidations=0;
const route=await import(await load('app/api/admin/works/route.ts'));
const request=(body,origin='https://holocron.kr')=>new Request('https://holocron.kr/api/admin/works',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
assert.equal((await route.POST(request({action:'create',work:base}))).status,401);
globalThis.__featureAuth=true;
assert.equal((await route.POST(request({action:'create',work:base},'https://evil.example'))).status,403);
let response=await route.POST(request({action:'create',work:{...base,...metadata.validateWorkMetadata(full)}}));assert.equal(response.status,201);
const created=await response.json();assert.equal(created.synopsis,'Saved synopsis');
response=await route.POST(request({action:'update',id:created.id,work:{...base,principalCast:'[invalid'}}));assert.equal(response.status,400);
response=await route.POST(request({action:'update',id:created.id,work:{...base,synopsis:''}}));assert.equal(response.status,200);assert.equal((await response.json()).synopsis,null);
assert.equal(globalThis.__featureInvalidations,2,'successful writes invalidate the shared Works cache');
sqlite.close();delete globalThis.__featuredDb;delete globalThis.__featureAuth;delete globalThis.__featureInvalidations;
console.log('Featured Work: real repository SQLite create/update/clear/legacy preservation, validation, server rendering and responsive/modal contracts passed (browser interaction NOT TESTED)');
