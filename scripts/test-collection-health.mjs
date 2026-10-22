import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {collectionSourceModule} from './test-source-modules.mjs';

const dataModule=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
async function transpile(path,replacements={}){let output=ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const [specifier,url] of Object.entries(replacements))output=output.replaceAll(`'${specifier}'`,`'${url}'`).replaceAll(`"${specifier}"`,`"${url}"`);return dataModule(output);}

const policyUrl=await transpile('../lib/collection/policy.ts');
const sourcesUrl=await collectionSourceModule(policyUrl);
const healthUrl=await transpile('../lib/collection/health.ts',{'./sources':sourcesUrl});
const health=await import(healthUrl),sources=await import(sourcesUrl);
const at=index=>`2026-10-04T0${index}:17:00.000Z`;
const stats=(sourceId,overrides={})=>({sourceId,source:sourceId,disabled:false,discovered:4,inserted:0,primaryDiscovered:2,backfillDiscovered:2,metadataFailure:0,headlineOnlyFallback:0,backfillFailures:0,imageLookupFailures:0,imageLookupFailureReasons:[],sourceFailure:'',...overrides});
let snapshot=health.parseCollectionHealthSnapshot(null);
snapshot=health.updateCollectionHealthSnapshot(snapshot,[stats('starwars')],at(0));
assert.equal(snapshot.sources.starwars.lastStatus,'healthy','first successful discovery is healthy');
assert.equal(snapshot.sources.starwars.lastInserted,0,'no new article is still healthy when candidates were discovered');
snapshot=health.updateCollectionHealthSnapshot(snapshot,[stats('starwars',{discovered:0})],at(1));
assert.equal(snapshot.sources.starwars.lastStatus,'healthy','the first zero discovery is not danger');
snapshot=health.updateCollectionHealthSnapshot(snapshot,[stats('starwars',{discovered:0})],at(2));
assert.equal(snapshot.sources.starwars.lastStatus,'warning','the second consecutive zero is warning');
snapshot=health.updateCollectionHealthSnapshot(snapshot,[stats('starwars',{discovered:0})],at(3));
assert.equal(snapshot.sources.starwars.lastStatus,'danger','the third consecutive zero is danger');
snapshot=health.updateCollectionHealthSnapshot(snapshot,[stats('starwars')],at(4));
assert.equal(snapshot.sources.starwars.consecutiveZeroDiscoveries,0,'normal discovery resets the zero streak');
snapshot=health.updateCollectionHealthSnapshot(snapshot,[stats('starwars',{sourceFailure:'HTTP 503'})],at(5));
assert.equal(snapshot.sources.starwars.lastStatus,'warning','one source failure is warning');
snapshot=health.updateCollectionHealthSnapshot(snapshot,[stats('starwars',{sourceFailure:'HTTP 503'})],at(6));
assert.equal(snapshot.sources.starwars.lastStatus,'danger','two source failures are danger');
snapshot=health.updateCollectionHealthSnapshot(snapshot,[stats('starwars')],at(7));
assert.equal(snapshot.sources.starwars.consecutiveFailures,0,'normal discovery resets the failure streak');
const independent=health.updateCollectionHealthSnapshot(snapshot,[stats('swnn',{sourceFailure:'feed down'})],at(8));
assert.equal(independent.sources.starwars.lastStatus,'healthy','one source failure does not affect another source');
const imageDiagnostic=health.updateCollectionHealthSnapshot(snapshot,[stats('swnn',{imageLookupFailures:2,imageLookupFailureReasons:['WordPress REST HTTP 403']})],at(8));
assert.equal(imageDiagnostic.sources.swnn.imageLookupFailures,2);assert.deepEqual(imageDiagnostic.sources.swnn.imageLookupFailureReasons,['WordPress REST HTTP 403'],'nonfatal image diagnostics remain visible in collection health');
const disabled=health.collectionHealthView(independent,[{id:'starwars',name:'StarWars.com',enabled:false}]);
assert.equal(disabled[0].status,'disabled','a disabled source is displayed as disabled without deleting history');
const unknown=health.collectionHealthView(health.parseCollectionHealthSnapshot('{broken'),sources.sourceAdapters.map(source=>({id:source.id,name:source.name,enabled:true})));
assert.equal(unknown.length,7);assert.ok(unknown.every(item=>item.status==='unknown'),'malformed persisted JSON safely produces seven unknown sources');
assert.equal(health.formatCollectionHealthTime('2026-10-04T00:17:00.000Z'),'2026. 10. 04. 09:17','health time is shown in Asia/Seoul');
assert.equal(health.formatCollectionHealthTime('invalid'),'확인 기록 없음');
const historical=await readFile(new URL('../lib/collection/historical-backfill.ts',import.meta.url),'utf8');
assert.doesNotMatch(historical,/updateCollectionHealth|health-repository/,'historical backfill never mutates normal collection health');
const adminCss=await readFile(new URL('../components/admin/admin.css',import.meta.url),'utf8');
assert.doesNotMatch(adminCss,/\.admin-command-rail\{[^}]*overflow-y:auto/,'navigation has no independent vertical scroll');

const moduleStub=source=>dataModule(source);
const newsStub=moduleStub(`export const list=async()=>globalThis.__healthArticles??[];export const config=()=>({key:'test',model:'test'});`);
const overrideStub=moduleStub(`export const applyAutomaticDecision=(value,automatic)=>({...value,...automatic});`);
const openAiStub=moduleStub(`export const processWithOpenAi=async()=>({title:'테스트 제목',summary:'테스트 요약',category:'기타',topic:'topic'});`);
const repositoryStub=moduleStub(`export const runEditorialMaintenanceOnce=async()=>0;export const insertCollectedArticle=async()=>false;`);
const localizationStub=moduleStub(`export const backfillPublishedLocalization=async()=>({candidates:0,succeeded:0,failed:0,skipped:0,deferred:0,report:[]});`);
const metadataStub=moduleStub(`export const fetchSourceText=async()=>{if(globalThis.__healthFetchError)throw new Error('HTTP 503');return globalThis.__healthBody??''};export const createCandidateEnricher=()=>async candidate=>({candidate,problem:''});`);
const sourceSettingsStub=moduleStub(`export const enabledSourceAdapters=()=>[globalThis.__healthAdapter];`);
const sourceSettingsRepositoryStub=moduleStub(`export const loadSourceEnabledState=async()=>({});`);
const candidateQueueUrl=await transpile('../lib/collection/candidate-queue.ts',{'./policy':policyUrl});
const dateRangeUrl=await transpile('../lib/collection/date-range.ts',{'./policy':policyUrl});
const processorUrl=await transpile('../lib/collection/processor.ts',{
  '../news':newsStub,'../admin/override-policy':overrideStub,'./openai':openAiStub,'./policy':policyUrl,'./sources':sourcesUrl,
  './repository':repositoryStub,'./metadata':metadataStub,'./candidate-queue':candidateQueueUrl,'./date-range':dateRangeUrl,
});
const discoveryUrl=await transpile('../lib/collection/discovery.ts',{'./policy':policyUrl,'./sources':sourcesUrl,'./date-range':dateRangeUrl});
const collectUrl=await transpile('../lib/collect.ts',{
  './news-work/service':moduleStub('export const associateCollectedArticles=async()=>[];'),
  './news':newsStub,'./collection/policy':policyUrl,'./collection/sources':sourcesUrl,'./collection/repository':repositoryStub,
  './collection/localization':localizationStub,'./collection/source-settings':sourceSettingsStub,'./collection/source-settings-repository':sourceSettingsRepositoryStub,
  './collection/metadata':metadataStub,'./collection/discovery':discoveryUrl,'./collection/processor':processorUrl,
});
const collector=await import(collectUrl);
globalThis.__healthAdapter=sources.sourceAdapters[0];
globalThis.__healthArticles=[];
globalThis.__healthBody='<!doctype html><html><body><p>정상적인 빈 뉴스 목록</p></body></html>';
globalThis.__healthFetchError=false;
let integrationSnapshot=health.parseCollectionHealthSnapshot(null);
for(const expected of ['healthy','warning','danger']){
  const result=await collector.collect(),source=result.sources.find(item=>item.sourceId==='starwars');
  assert.equal(source.sourceFailure,'','a successful empty discovery is not a source failure');
  assert.equal(source.discovered,0,'a successful empty discovery reports zero candidates');
  assert.equal(source.inserted,0,'a successful empty discovery inserts nothing');
  integrationSnapshot=health.updateCollectionHealthSnapshot(integrationSnapshot,result.sources,new Date().toISOString());
  assert.equal(integrationSnapshot.sources.starwars.lastStatus,expected,`zero-discovery integration reaches ${expected}`);
}
const candidateUrl='https://www.starwars.com/news/integration-test';
globalThis.__healthArticles=[{source:'StarWars.com',url:candidateUrl}];
globalThis.__healthBody=`<li class="col item"><a href="${candidateUrl}" data-title="Integration test"></a></li>`;
let result=await collector.collect(),source=result.sources.find(item=>item.sourceId==='starwars');
assert.ok(source.discovered>0,'a parsed candidate is recorded as discovered');
assert.equal(source.inserted,0,'a known candidate may correctly produce no insert');
integrationSnapshot=health.updateCollectionHealthSnapshot(integrationSnapshot,result.sources,new Date().toISOString());
assert.equal(integrationSnapshot.sources.starwars.lastStatus,'healthy','discovery recovery is healthy even when inserted is zero');
assert.equal(integrationSnapshot.sources.starwars.consecutiveZeroDiscoveries,0,'discovery recovery resets the zero streak');
globalThis.__healthFetchError=true;
result=await collector.collect();source=result.sources.find(item=>item.sourceId==='starwars');
assert.match(source.sourceFailure,/HTTP 503/,'a real fetch exception remains a source failure');
integrationSnapshot=health.updateCollectionHealthSnapshot(integrationSnapshot,result.sources,new Date().toISOString());
assert.equal(integrationSnapshot.sources.starwars.consecutiveFailures,1,'a real fetch exception increments the failure streak');
delete globalThis.__healthAdapter;delete globalThis.__healthArticles;delete globalThis.__healthBody;delete globalThis.__healthFetchError;

console.log('Collection health: thresholds and collect/discovery integration regression passed');
const degraded=health.updateCollectionHealthSnapshot(health.parseCollectionHealthSnapshot(null),[stats('swnn',{primaryFailure:'HTTP 503'})],at(1));
assert.equal(degraded.sources.swnn.lastStatus,'warning');assert.equal(degraded.sources.swnn.lastHealthyAt,null);

// Separate discovery stages without erasing existing combined failure thresholds/history.
const backfillError='https://feeds.forbes.com/sites/example/feed/: HTTP 403';
let partial=health.parseCollectionHealthSnapshot(null);
for(let run=0;run<3;run++){
 partial=health.updateCollectionHealthSnapshot(partial,[stats('forbes',{backfillRequests:2,backfillFailures:2,backfillFailureReasons:[backfillError]})],at(run));
 assert.equal(partial.sources.forbes.discovery.primary,'ok');assert.equal(partial.sources.forbes.discovery.backfill,'failed');
 assert.equal(partial.sources.forbes.discovery.lastPrimarySuccessAt,at(run));assert.equal(partial.sources.forbes.lastHealthyAt,null);
 assert.equal(partial.sources.forbes.lastStatus,run===0?'warning':'danger','repeated backfill failures are not hidden as healthy');
 assert.equal(partial.sources.forbes.consecutiveFailures,run+1);
 assert.equal(health.collectionDiscoveryLabel(partial.sources.forbes),'기본 수집 정상 · 보완 수집 실패');
 assert.equal(health.collectionDiscoveryLabel({...partial.sources.forbes,backfillFailures:1}),'기본 수집 정상 · 보완 수집 일부 실패');
}
assert.deepEqual(health.parseCollectionHealthSnapshot(JSON.stringify(partial)),partial,'new optional stage diagnostics roundtrip');
const recovered=health.updateCollectionHealthSnapshot(partial,[stats('forbes',{backfillRequests:2})],at(4)).sources.forbes;
assert.equal(recovered.lastStatus,'healthy');assert.equal(recovered.discovery.lastBackfillSuccessAt,at(4));assert.equal(recovered.consecutiveFailures,0);
const primaryDown=health.updateCollectionHealthSnapshot({version:1,sources:{forbes:recovered}},[stats('forbes',{primaryFailure:'HTTP 503',backfillRequests:2})],at(5)).sources.forbes;
assert.equal(primaryDown.discovery.primary,'failed');assert.equal(primaryDown.discovery.backfill,'ok');assert.equal(primaryDown.discovery.lastPrimarySuccessAt,at(4));assert.match(health.collectionDiscoveryLabel(primaryDown),/기본 수집 실패 · 보완 수집 정상/);
const unavailable=health.updateCollectionHealthSnapshot(partial,[stats('forbes',{sourceFailure:'기본 탐색 실패 (HTTP 503); 보완 탐색 성공 0건'})],at(4)).sources.forbes;
assert.equal(unavailable.discovery.backfill,'unknown','no completed stats cannot masquerade as zero successful backfill');
const old=structuredClone(partial);delete old.sources.forbes.discovery;
const legacy=health.parseCollectionHealthSnapshot(JSON.stringify(old));assert.equal(legacy.sources.forbes.consecutiveFailures,3);assert.equal(legacy.sources.forbes.lastStatus,'danger');assert.equal(legacy.sources.forbes.discovery,undefined);assert.match(health.collectionDiscoveryLabel(legacy.sources.forbes),/미보존/);
const safe=health.updateCollectionHealthSnapshot(partial,[stats('forbes',{backfillFailures:10,backfillFailureReasons:Array(12).fill('x'.repeat(1000))})],at(4));assert.equal(safe.sources.forbes.discovery.backfillErrors.length,4);assert.equal(safe.sources.forbes.discovery.backfillErrors[0].length,300);

const discovery=await import(discoveryUrl),processor=await import(processorUrl);
const fixedNow=Date.parse('2026-10-22T04:00:00Z');
for(const id of ['swnn','forbes']){
 const adapter=sources.sourceAdapters.find(s=>s.id===id);
 const article={source:adapter.name,url:id==='swnn'?'https://www.starwarsnewsnet.com/2026/10/star-wars-fixture.html':'https://www.forbes.com/sites/example/2026/10/21/star-wars-fixture/'};
 const rss=`<rss><channel><item><title>Star Wars fixture</title><link>${article.url}</link><description>Star Wars source fixture</description><pubDate>2026-10-21</pubDate></item></channel></rss>`;
 const primary=id==='swnn'?rss:`<urlset><url><loc>${article.url}</loc><news:title>Star Wars fixture</news:title><news:publication_date>2026-10-21</news:publication_date></url></urlset>`;
 let calls=[];
 const result=await discovery.discoverSourceCandidates(adapter,async url=>{calls.push(url);if(url===adapter.endpoint)return primary;throw new Error('HTTP 403');},{now:fixedNow,articles:[article]});
 assert.equal(result.primaryDiscovered,1);assert.equal(result.primaryFailure,'');assert.equal(result.backfillFailures.length,calls.length-1);
 assert(calls.length<=1+(id==='swnn'?4:2));assert(result.backfillFailures.every(v=>v.endsWith('HTTP 403')));
 const processed=await processor.processSourceCandidates(adapter,result,[article],new Set([(await import(policyUrl)).normalizeArticleUrl(article.url)]),12,fixedNow);
 assert.equal(processed.attempted,0);assert.equal(processed.inserted,0);assert.equal(processed.duplicate,1);
 assert.deepEqual(processed.backfillFailureReasons,result.backfillFailures.slice(0,4));assert.match(processor.sourceReportLine(processed),/보완 오류:.*HTTP 403/);
 const view=health.updateCollectionHealthSnapshot(health.parseCollectionHealthSnapshot(null),[processed],at(1)).sources[id];assert.equal(view.discovery.primary,'ok');assert.equal(view.discovery.backfill,'failed');
 for(const failure of [Object.assign(new Error('timeout'),{name:'TimeoutError'}),new Error('HTTP 429'),new Error('private raw message sentinel')]){
  const failed=await discovery.discoverSourceCandidates(adapter,async url=>{if(url===adapter.endpoint)return primary;throw failure;},{now:fixedNow,articles:[article]});
  assert.equal(failed.primaryDiscovered,1);assert(!failed.backfillFailures.join('').includes('sentinel'));
 }
 const malformed=await discovery.discoverSourceCandidates(adapter,async url=>url===adapter.endpoint?primary:'<html>not RSS</html>',{now:fixedNow,articles:[article]});
 assert(malformed.backfillFailures.every(v=>v.includes('요청 또는 파싱 오류')));
 const fallback=await discovery.discoverSourceCandidates(adapter,async url=>{if(url===adapter.endpoint)throw new Error('HTTP 503');return rss;},{now:fixedNow,articles:[article]});
 assert.equal(fallback.primaryFailure,'HTTP 503');
}
console.log('Collection stage health: primary/backfill isolation, legacy history, repeated danger, bounded safe reasons, parser/HTTP/timeout, known URL zero AI/insertion PASS');
