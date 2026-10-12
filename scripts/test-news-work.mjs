import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';

const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
for(const file of (await readdir('drizzle')).filter(file=>file.endsWith('.sql')).sort())sqlite.exec(await readFile(`drizzle/${file}`,'utf8'));
sqlite.exec('DELETE FROM articles; DELETE FROM works;'); // Isolate fixtures from historical seed migrations, in memory only.
const calls=[];
const database={prepare(sql){return {args:[],bind(...args){this.args=args;return this;},async all(){calls.push(sql);return {results:sqlite.prepare(sql).all(...this.args)};},async run(){calls.push(sql);const r=sqlite.prepare(sql).run(...this.args);return {success:true,meta:{changes:Number(r.changes)}};}};},async batch(items){const out=[];for(const item of items)out.push(await item.run());return out;}};
globalThis.__newsWorkTest={database,invalidations:[],articles:[]};
const url=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const stubs=new Map([
 [resolve('lib/news.ts'),url('export const db=()=>globalThis.__newsWorkTest.database;export const list=async()=>globalThis.__newsWorkTest.articles;')],
 [resolve('lib/public-cache.ts'),url('export const invalidatePublicNewsCache=()=>globalThis.__newsWorkTest.invalidations.push("news");export const invalidatePublicWorksCache=()=>globalThis.__newsWorkTest.invalidations.push("works");')],
]);
async function load(file){file=resolve(file);if(stubs.has(file))return stubs.get(file);let source=ts.transpileModule(await readFile(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 for(const match of [...source.matchAll(/from ['"]([^'"]+)['"]/g)]){const dep=match[1];if(dep.startsWith('.'))source=source.replace(match[0],`from ${JSON.stringify(await load(resolve(dirname(file),dep+'.ts')))}`);}
 const result=url(source);stubs.set(file,result);return result;
}
const matcher=await import(await load('lib/news-work/matcher.ts')),repo=await import(await load('lib/news-work/repository.ts')),service=await import(await load('lib/news-work/service.ts')),projection=await import(await load('lib/news-work/projection.ts')),explorer=await import(await load('lib/news/explorer.ts')),{buildStories}=await import(await load('lib/news/stories.ts'));
const works=[{id:'a1',title:'아소카 시즌 1',originalTitle:'Star Wars: Ahsoka Season 1',seasonNumber:'1'},{id:'a2',title:'아소카 시즌 2',originalTitle:'Star Wars: Ahsoka Season 2',seasonNumber:'2'},{id:'m',title:'만달로리안과 그로구',originalTitle:'The Mandalorian and Grogu',seasonNumber:null},{id:'generic',title:'스타워즈',originalTitle:'Star Wars',seasonNumber:null}];
const index=matcher.buildWorkMatchIndex(works),match=title=>matcher.matchArticleWorks(index,{title,summary:''});
assert.deepEqual(match('아소카 시즌 2의 촬영 소식').workIds,['a2']);
assert.deepEqual(match('아소카 시즌2의 촬영 소식').workIds,['a2']);
assert.deepEqual(match('STAR WARS: AHSOKA—Season 2 filming').workIds,['a2']);
assert.deepEqual(match('The Mandalorian and Grogu casting').workIds,['m']);
assert.deepEqual(match('Star Wars news').workIds,[]);
assert.deepEqual(match('아소카 촬영'),{workIds:[],ambiguous:true});
assert.deepEqual(match('Ahsoka season 20 filming').workIds,[]);
assert.deepEqual(match('SomeThe Mandalorian and GroguX').workIds,[]);
assert.deepEqual(matcher.matchArticleWorks(matcher.buildWorkMatchIndex([...works,{...works[2],id:'duplicate'}]),{title:works[2].title,summary:''}),{workIds:[],ambiguous:true});
const article=(id,extra={})=>({id,topic:id,title:'아소카 시즌 2 촬영',titleOverride:null,summary:'새 소식',image:'',url:`https://example.com/${id}`,source:'Star Wars News Net',published:'2026-10-10T12:00:00Z',category:'시리즈',status:'published',...extra});
function insertArticle(a){sqlite.prepare('INSERT INTO articles(id,topic,title,summary,image,url,source,published,category,status) VALUES(?,?,?,?,?,?,?,?,?,?)').run(a.id,a.topic,a.title,a.summary,a.image,a.url,a.source,a.published,a.category,a.status);}
for(const w of works)sqlite.prepare("INSERT INTO works(id,title,original_title,type,status,poster_url,season_number) VALUES(?,?,?,'드라마','archive','',?)").run(w.id,w.title,w.originalTitle,w.seasonNumber);
const articles=[article('one'),article('two',{topic:'one',title:'같은 사건',source:'StarWars.com'}),article('hidden',{status:'excluded'}),article('ambiguous',{title:'아소카 촬영'}),article('none',{title:'무관한 소식'})];articles.forEach(insertArticle);
const report=await service.associateArticles(articles,database);assert.equal(report.added,2);assert.equal(report.ambiguous,1);assert.equal(report.unmatched,2);
assert.equal(calls.filter(sql=>sql.startsWith('SELECT id,title,original_title')).length,1,'one catalog index per operation, never per article');
assert.equal((await service.associateArticles(articles,database)).added,0,'idempotent');
await repo.setManualRelation(database,'one','a2','excluded');
assert.equal((await service.associateArticles(articles,database)).manualPreserved,1);
assert.equal((await repo.articleRelations(database,'one'))[0].state,'excluded');
await repo.setManualRelation(database,'one','a2','linked');assert.equal((await repo.articleRelations(database,'one'))[0].origin,'manual');
await repo.setManualRelation(database,'two','m','linked');await repo.setManualRelation(database,'hidden','a1','linked');
await assert.rejects(repo.setManualRelation(database,'missing','a2','linked'));
await assert.rejects(repo.setManualRelation(database,'one','missing','linked'));
assert.throws(()=>sqlite.prepare("INSERT INTO article_work_relations VALUES('one','a2','linked','automatic')").run());
const stories=buildStories(articles,Date.parse('2026-10-12')),linked=await repo.linkedRelations(database,'2026-07-12');
const result=projection.projectNewsWorks(stories,linked,works);
assert.deepEqual(result.stories.find(s=>s.topic==='one').workIds,['a2','m']);
assert.equal(result.related.a2.count,1);assert.equal(result.related.m.count,1);assert.equal(result.related.a1,undefined,'excluded members never expose relations');
assert.equal(result.related.a2.stories[0].sourceCount,2,'grouped coverage counts distinct sources without duplicate rows');
for(const [query,category] of [['',''],['촬영',''],['','시리즈'],['촬영','시리즈']])assert.equal(explorer.filterStories(result.stories,query,category,'a2').length,1);
assert.equal(explorer.filterStories(result.stories,'','영화','a2').length,0);assert.equal(explorer.filterStories(result.stories,'','','missing').length,0);
assert.equal(explorer.newsPageCount(explorer.filterStories(result.stories,'','','a2').length,2),1);
assert.equal(projection.workNewsUrl('a /?'), '/?work=a%20%2F%3F');
const many=Array.from({length:12},(_,i)=>({...stories[0],topic:String(i)}));assert.equal(projection.projectNewsWorks(many,linked,works).related.a2.stories.length,8);
assert.deepEqual(globalThis.__newsWorkTest.invalidations.slice(-2),['news','works']);
const maintenance=await service.backfillWorkRelations('');assert.equal(maintenance.inspected,5);assert.equal(maintenance.nextCursor,null);assert.equal(maintenance.added,0);
await assert.rejects(service.backfillWorkRelations({bad:true}));
sqlite.prepare("DELETE FROM articles WHERE id='one'").run();assert.equal((await repo.articleRelations(database,'one')).length,0);
sqlite.prepare("DELETE FROM works WHERE id='m'").run();assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM article_work_relations WHERE work_id='m'").get().n,0);
const source=await readFile('components/works/work-related-news.tsx','utf8');assert.match(source,/DialogTrigger asChild/);assert.match(source,/DialogClose/);assert.doesNotMatch(source,/<img|StoryCard/);assert.match(source,/workNewsUrl\(id\)/);
const card=await readFile('components/works/work-card.tsx','utf8');assert.match(card,/<\/button>\s*\{relatedNews&&<WorkRelatedNews/,'secondary control is outside destination button');
const filter=await readFile('components/news/news-archive-explorer.tsx','utf8');assert.match(filter,/useState\(initialWork\)/);assert.match(filter,/setWorkId\(value\);setPage\(1\)/);
for(const path of ['lib/collect.ts','lib/collection/historical-backfill.ts','lib/collection/recovery.ts','lib/collection/metadata-recovery.ts'])assert.match(await readFile(path,'utf8'),/associateCollectedArticles/);
// Exercise the route guards and real service/SQL without production access.
let routeSource=ts.transpileModule(await readFile('app/api/admin/news-work/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
routeSource=routeSource.replaceAll("'@/lib/admin/session'",JSON.stringify(url('export const getAdminSession=async()=>globalThis.__newsWorkTest.session;'))).replaceAll("'@/lib/news-work/service'",JSON.stringify(await load('lib/news-work/service.ts')));
const route=await import(url(routeSource));
const request=(body,origin='https://example.com')=>new Request('https://example.com/api/admin/news-work',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
assert.equal((await route.GET(new Request('https://example.com/api/admin/news-work?article=two'))).status,401);
assert.equal((await route.POST(request({action:'backfill'}))).status,401);
globalThis.__newsWorkTest.session={id:'test'};
assert.equal((await route.POST(request({action:'backfill'},'https://other.example'))).status,403);
assert.equal((await route.POST(request({action:'set',articleId:'two',workId:'a2',state:'excluded'}))).status,200);
await service.associateArticles([article('two')],database);
assert.equal((await repo.articleRelations(database,'two')).find(row=>row.workId==='a2').state,'excluded');
const read=await route.GET(new Request('https://example.com/api/admin/news-work?article=two'));assert.equal(read.status,200);assert.match(read.headers.get('cache-control'),/no-store/);
assert.equal((await route.POST(request({action:'set',articleId:'two',workId:'missing',state:'linked'}))).status,400);
for(let i=0;i<205;i++)insertArticle(article(`z${String(i).padStart(3,'0')}`));
const first=await service.backfillWorkRelations('');assert.equal(first.inspected,200);assert.ok(first.nextCursor);
const second=await service.backfillWorkRelations(first.nextCursor);assert.equal(second.inspected,9);assert.equal(second.nextCursor,null);
assert.equal((await service.backfillWorkRelations(first.nextCursor)).added,0,'bounded cursor retry is idempotent');
sqlite.close();delete globalThis.__newsWorkTest;
console.log('News–Works: SQL constraints/cascades, matching, manual precedence, backfill, story union/filter/dedupe, query bounds and secondary actions passed');
