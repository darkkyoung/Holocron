import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';

const dataModule=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
async function transpile(path,replacements={}){
  let output=ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [specifier,url] of Object.entries(replacements))output=output.replaceAll(`'${specifier}'`,`'${url}'`).replaceAll(`"${specifier}"`,`"${url}"`);
  return dataModule(output);
}
const policyUrl=await transpile('../lib/collection/policy.ts');
const sourceUrl=await transpile('../lib/collection/sources.ts',{'./policy':policyUrl});
const metadataPolicyUrl=await transpile('../lib/collection/metadata-policy.ts',{'./policy':policyUrl});
const metadataUrl=await transpile('../lib/collection/metadata.ts',{'./sources':sourceUrl,'./metadata-policy':metadataPolicyUrl});
const recoveryPolicyUrl=await transpile('../lib/collection/recovery-policy.ts');
const settingsUrl=await transpile('../lib/collection/source-settings.ts',{'./sources':sourceUrl});
const sources=await import(sourceUrl);
const metadataPolicy=await import(metadataPolicyUrl);
const metadata=await import(metadataUrl);
const settings=await import(settingsUrl);
const now=Date.now(),recent=new Date(now-86400000).toISOString();
const candidate={url:'https://starwarsnewsnet.com/story',title:'Star Wars news',description:'Usable source facts',published:recent,image:''};
const rss=body=>sources.parseRssOrAtom(`<rss><channel><item>${body}</item></channel></rss>`)[0];
for(const tag of ['media:content','media:thumbnail','enclosure']){
  assert.equal(rss(`<${tag} url="https://images.example/media.jpg"/><content:encoded><![CDATA[<img src="https://images.example/inline.jpg">]]></content:encoded>`).image,'https://images.example/media.jpg');
}
assert.equal(rss('<content:encoded><![CDATA[<img src="https://images.example/a.jpg?a=1&amp;b=2">]]></content:encoded>').image,'https://images.example/a.jpg?a=1&b=2');
assert.equal(rss('<description><![CDATA[<img src="https://images.example/d.jpg">]]></description>').image,'https://images.example/d.jpg');
assert.equal(rss('<content:encoded>&lt;img data-src=&quot;https://images.example/lazy.jpg&quot;&gt;</content:encoded>').image,'https://images.example/lazy.jpg');
assert.equal(rss('<description><![CDATA[<img data-src="https://images.example/data.jpg" src="data:image/png,x">]]></description>').image,'https://images.example/data.jpg');
assert.equal(rss('<description><![CDATA[<img src="javascript:alert(1)"><img src="data:image/png,x"><img src="ftp://bad/x">]]></description>').image,'');
assert.equal(rss('<media:content url="javascript:x"/><media:thumbnail url="https://images.example/valid.jpg"/>').image,'https://images.example/valid.jpg');
assert.equal(rss('<description><![CDATA[<img data-src="javascript:x"><img src="https://images.example/second.jpg">]]></description>').image,'https://images.example/second.jpg');
assert.equal(metadataPolicy.metadataProblemAfterEnrichment(candidate,new Error('HTTP 403'),now),'');
assert.match(metadataPolicy.metadataProblemAfterEnrichment({...candidate,description:''},new Error('HTTP 403'),now),/설명 누락.*HTTP 403/);
for(const published of ['', 'not-a-date', '2026-09-20T10:00:00'])assert.match(metadataPolicy.requiredMetadataProblem({...candidate,published},now),/metadata 문제:/);
assert.match(metadataPolicy.requiredMetadataProblem({...candidate,title:'제목 확인 필요'},now),/제목 누락/);
assert.match(metadataPolicy.requiredMetadataProblem({...candidate,description:'원문 메타데이터를 확인해 주세요.'},now),/설명 누락/);
const eligible={status:'review',reason:'metadata 문제: 원문 응답 실패 (HTTP 403)',statusOverride:null,topicOverride:null,published:recent};
assert.equal(metadataPolicy.isRetryableMetadataArticle(eligible,now),true);
for(const extra of [{status:'published'},{status:'excluded'},{reason:'AI 처리 실패: x'},{reason:'Review 콘텐츠'},{statusOverride:'published'},{statusOverride:'excluded'},{topicOverride:'manual'},{published:'2000-01-01'},{published:''}])assert.equal(metadataPolicy.isRetryableMetadataArticle({...eligible,...extra},now),false);
assert.equal(metadataPolicy.matchFeedCandidate('http://www.starwarsnewsnet.com/story/?utm_source=x#top',[candidate]),candidate);

// Exercise actual repository SQL against SQLite with the project's migrations.
const sqlite=new DatabaseSync(':memory:');
for(const filename of (await readdir(new URL('../drizzle/',import.meta.url))).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(await readFile(new URL(`../drizzle/${filename}`,import.meta.url),'utf8'));
const allArticles=()=>sqlite.prepare('SELECT id,topic,topic_override AS topicOverride,title,title_override AS titleOverride,summary,image,url,source,published,category,status,status_override AS statusOverride,reason,franchise FROM articles ORDER BY published DESC').all();
const d1={prepare(sql){return {bind(...args){return {async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}};}};}};
const state={db:d1,allArticles,settings:settings.defaultSourceEnabledState(),aiCalls:0,feedFetches:0,feed:'',feedFails:false,race:false};
globalThis.__metadataTest=state;
const newsUrl=dataModule('export const db=()=>globalThis.__metadataTest.db; export const setting=async()=>{}; export const list=async()=>globalThis.__metadataTest.allArticles(); export const config=()=>({key:"test",model:"test"});');
const repositoryUrl=await transpile('../lib/collection/repository.ts',{'../news':newsUrl,'./policy':policyUrl});
const repository=await import(repositoryUrl);
const aiUrl=dataModule(`export async function processWithOpenAi(title){const state=globalThis.__metadataTest;state.aiCalls++;if(state.race)state.race();if(title.includes('AI fail'))throw new Error('OpenAI 503');return {title:'한국어 제목',summary:'한국어 요약',category:'영화',topic:'new-topic'};}`);
const settingsRepositoryUrl=dataModule('export const loadSourceEnabledState=async()=>globalThis.__metadataTest.settings;');
const recoveryUrl=await transpile('../lib/collection/metadata-recovery.ts',{'../news':newsUrl,'./openai':aiUrl,'./policy':policyUrl,'./sources':sourceUrl,'./metadata':metadataUrl,'./metadata-policy':metadataPolicyUrl,'./recovery-policy':recoveryPolicyUrl,'./repository':repositoryUrl,'./source-settings':settingsUrl,'./source-settings-repository':settingsRepositoryUrl});
const recovery=await import(recoveryUrl);
function insert(id,extra={}){
  const article={id,topic:'old-topic',title:'Star Wars news',titleOverride:'관리자 제목',summary:'Source facts',image:'',url:`https://starwarsnewsnet.com/${id}`,source:'Star Wars News Net',category:'기타',franchise:'star-wars',...eligible,...extra};
  sqlite.prepare('INSERT INTO articles(id,topic,title,title_override,summary,image,url,source,published,category,status,status_override,topic_override,reason,franchise) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(article.id,article.topic,article.title,article.titleOverride,article.summary,article.image,article.url,article.source,article.published,article.category,article.status,article.statusOverride,article.topicOverride,article.reason,article.franchise);
  return article;
}
const row=id=>sqlite.prepare('SELECT * FROM articles WHERE id=?').get(id);
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{
  if(String(url).endsWith('/feed')){state.feedFetches++;return new Response(state.feed,{status:state.feedFails?503:200});}
  return new Response('Forbidden',{status:403});
};
try{
  const enriched=await metadata.enrichCandidate(candidate);
  assert.equal(enriched.problem,'','image-only HTTP 403 is nonfatal');
  assert.equal(enriched.candidate.image,'');
  assert.match((await metadata.enrichCandidate({...candidate,description:''})).problem,/설명 누락.*HTTP 403/);
  insert('fresh');insert('stored');insert('missing',{summary:'원문 메타데이터를 확인해 주세요.'});insert('ai',{title:'AI fail Star Wars'});
  insert('manual-status',{statusOverride:'published'});insert('manual-topic',{topicOverride:'manual'});insert('excluded',{status:'excluded',statusOverride:'excluded'});insert('old',{published:'2000-01-01'});insert('editorial',{title:'Review: Star Wars'});
  state.feed=`<rss><channel><item><link>http://www.starwarsnewsnet.com/fresh/?utm_source=x</link><title>Fresh Star Wars</title><description>Fresh source facts</description><pubDate>${recent}</pubDate><content:encoded><![CDATA[<img src="https://images.example/recovered.jpg">]]></content:encoded></item></channel></rss>`;
  const result=await recovery.retryFailedMetadataArticles();
  assert.equal(result.candidates,5);assert.equal(result.succeeded,2);assert.equal(result.metadataFailed,2);assert.equal(result.aiFailed,1);assert.equal(result.imageRecovered,1);assert.equal(state.feedFetches,1,'one feed request per source');
  assert.equal(row('fresh').status,'published');assert.equal(row('fresh').reason,'');assert.equal(row('fresh').image,'https://images.example/recovered.jpg');
  assert.equal(row('stored').status,'published','stored facts recover when article is no longer in feed and HTML is 403');assert.equal(row('stored').image,'');
  assert.equal(row('fresh').title_override,'관리자 제목');assert.equal(row('stored').title_override,'관리자 제목');
  assert.equal(row('missing').status,'review');assert.match(row('missing').reason,/설명 누락/);
  assert.equal(row('editorial').status,'review');assert.equal(row('editorial').reason,'Review 콘텐츠');
  assert.equal(row('ai').status,'review');assert.match(row('ai').reason,/^AI 처리 실패:/);assert.equal(row('ai').title_override,'관리자 제목');
  assert.equal((await repository.listAiFailedReviewArticles(20)).some(article=>article.id==='ai'),true,'AI failure is eligible for existing AI retry');
  for(const id of ['manual-status','manual-topic','excluded','old'])assert.equal(row(id).title,'Star Wars news');
  // A manual override added during AI processing must prevent the guarded write.
  sqlite.exec('DELETE FROM articles');insert('race');state.race=()=>sqlite.prepare("UPDATE articles SET topic_override='manual',topic='manual' WHERE id='race'").run();
  assert.equal((await recovery.retryFailedMetadataArticles()).skipped,1);assert.equal(row('race').topic,'manual');assert.equal(row('race').title,'Star Wars news');state.race=false;
  const cutoff=new Date(now-90*86400000).toISOString().slice(0,10);
  const patch={title:'자동 제목',summary:'자동 요약',category:'영화',topic:'automatic',image:'',published:recent,status:'published',reason:''};
  assert.equal(await repository.updateMetadataRecovery('race',patch,cutoff),false);
  sqlite.exec('DELETE FROM articles');insert('status-race',{statusOverride:'excluded'});assert.equal(await repository.updateMetadataRecovery('status-race',patch,cutoff),false);
  sqlite.exec('DELETE FROM articles');for(let i=0;i<25;i++)insert(`batch-${i}`);state.feedFails=true;
  const batch=await recovery.retryFailedMetadataArticles(100);assert.equal(batch.limit,20);assert.equal(batch.candidates,20);assert.equal(batch.succeeded,20,'feed failure falls back to stored metadata');assert.equal(allArticles().filter(a=>a.status==='review').length,5);
  sqlite.exec('DELETE FROM articles');insert('disabled');state.settings.swnn=false;assert.equal((await recovery.retryFailedMetadataArticles()).skipped,1);assert.equal(row('disabled').status,'review');
  // Run the real collection pipeline with a public RSS fixture and HTML 403.
  sqlite.exec('DELETE FROM articles');state.feedFails=false;state.settings=Object.fromEntries(sources.sourceAdapters.map(adapter=>[adapter.id,adapter.id==='swnn']));
  state.feed=`<rss><channel><item><link>https://starwarsnewsnet.com/new-no-image</link><title>Star Wars new story</title><description>Complete source facts</description><pubDate>${recent}</pubDate></item><item><link>https://starwarsnewsnet.com/new-image</link><title>Star Wars image story</title><description>Complete source facts</description><pubDate>${recent}</pubDate><content:encoded><![CDATA[<img src="https://images.example/new.jpg">]]></content:encoded></item><item><link>https://starwarsnewsnet.com/new-missing</link><title>Star Wars missing facts</title><pubDate>${recent}</pubDate></item></channel></rss>`;
  const collectionRepositoryUrl=dataModule(`export {insertCollectedArticle} from '${repositoryUrl}';export const runEditorialMaintenanceOnce=async()=>0;`);
  const localizationUrl=dataModule('export const backfillPublishedLocalization=async()=>({candidates:0,succeeded:0,failed:0,skipped:0,deferred:0,report:[]});');
  const overrideUrl=await transpile('../lib/admin/override-policy.ts');
  const collectUrl=await transpile('../lib/collect.ts',{'./news':newsUrl,'./admin/override-policy':overrideUrl,'./collection/openai':aiUrl,'./collection/policy':policyUrl,'./collection/sources':sourceUrl,'./collection/metadata':metadataUrl,'./collection/repository':collectionRepositoryUrl,'./collection/localization':localizationUrl,'./collection/source-settings':settingsUrl,'./collection/source-settings-repository':settingsRepositoryUrl});
  const collector=await import(collectUrl);
  const collected=await collector.collect();
  const swnn=collected.sources.find(source=>source.sourceId==='swnn');
  assert.equal(swnn.published,2);assert.equal(swnn.review,1);assert.equal(swnn.metadataFailure,1);assert.equal(collected.activeSources,1);
  assert.equal(allArticles().find(article=>article.url.endsWith('/new-no-image')).status,'published');
  assert.equal(allArticles().find(article=>article.url.endsWith('/new-image')).image,'https://images.example/new.jpg');
  assert.match(allArticles().find(article=>article.url.endsWith('/new-missing')).reason,/설명 누락.*HTTP 403/);
  const rerun=await collector.collect();assert.equal(rerun.count,0);assert.equal(rerun.sources.find(source=>source.sourceId==='swnn').duplicate,3);
}finally{globalThis.fetch=originalFetch;delete globalThis.__metadataTest;sqlite.close();}
const service=await readFile(new URL('../lib/admin/service.ts',import.meta.url),'utf8');
assert.match(service,/action==='retry-metadata'[\s\S]*?retryFailedMetadataArticles\(\);invalidatePublicNewsCache\(\)/);
const rail=await readFile(new URL('../components/admin/admin-command-rail.tsx',import.meta.url),'utf8');
assert.match(rail,/onAction\('retry-metadata'\)[\s\S]*?메타데이터 실패 재처리/);
const card=await readFile(new URL('../components/news/story-card.tsx',import.meta.url),'utf8');assert.match(card,/article.image \?[\s\S]*?no-image/);
console.log('RSS metadata recovery: parser, policy, HTTP 403, SQLite guards, backlog recovery, AI handoff, batch limit and cache path passed');
