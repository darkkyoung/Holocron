import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const dataModule=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
async function transpile(path,replacements={}){let output=ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const [specifier,url] of Object.entries(replacements))output=output.replaceAll(`'${specifier}'`,`'${url}'`).replaceAll(`"${specifier}"`,`"${url}"`);return dataModule(output);}

const policyUrl=await transpile('../lib/collection/policy.ts');
const sourcesUrl=await transpile('../lib/collection/sources.ts',{'./policy':policyUrl});
const healthUrl=await transpile('../lib/collection/health.ts',{'./sources':sourcesUrl});
const health=await import(healthUrl),sources=await import(sourcesUrl);
const at=index=>`2026-10-04T0${index}:17:00.000Z`;
const stats=(sourceId,overrides={})=>({sourceId,source:sourceId,disabled:false,discovered:4,inserted:0,primaryDiscovered:2,backfillDiscovered:2,metadataFailure:0,headlineOnlyFallback:0,backfillFailures:0,sourceFailure:'',...overrides});
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
const disabled=health.collectionHealthView(independent,[{id:'starwars',name:'StarWars.com',enabled:false}]);
assert.equal(disabled[0].status,'disabled','a disabled source is displayed as disabled without deleting history');
const unknown=health.collectionHealthView(health.parseCollectionHealthSnapshot('{broken'),sources.sourceAdapters.map(source=>({id:source.id,name:source.name,enabled:true})));
assert.equal(unknown.length,7);assert.ok(unknown.every(item=>item.status==='unknown'),'malformed persisted JSON safely produces seven unknown sources');
assert.equal(health.formatCollectionHealthTime('2026-10-04T00:17:00.000Z'),'2026. 10. 04. 09:17','health time is shown in Asia/Seoul');
assert.equal(health.formatCollectionHealthTime('invalid'),'확인 기록 없음');
const historical=await readFile(new URL('../lib/collection/historical-backfill.ts',import.meta.url),'utf8');
assert.doesNotMatch(historical,/updateCollectionHealth|health-repository/,'historical backfill never mutates normal collection health');
const adminCss=await readFile(new URL('../components/admin/admin.css',import.meta.url),'utf8');
assert.match(adminCss,/\.admin-command-rail\{[^}]*max-height:calc\(100dvh - 40px\);overflow-y:auto/,'existing sidebar viewport scrolling remains enabled');

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
