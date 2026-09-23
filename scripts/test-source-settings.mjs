import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function source(path){return readFile(new URL(path,import.meta.url),'utf8');}
async function transpile(path,replacements={}){
  let output=ts.transpileModule(await source(path),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [specifier,url] of Object.entries(replacements))output=output.replaceAll(`'${specifier}'`,`'${url}'`).replaceAll(`"${specifier}"`,`"${url}"`);
  return `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
}

const policyUrl=await transpile('../lib/collection/policy.ts');
const sourcesUrl=await transpile('../lib/collection/sources.ts',{'./policy':policyUrl});
const settingsUrl=await transpile('../lib/collection/source-settings.ts',{'./sources':sourcesUrl});
const storiesUrl=await transpile('../lib/news/stories.ts');
const sources=await import(sourcesUrl);
const settings=await import(settingsUrl);
const stories=await import(storiesUrl);
const collectSource=await source('../lib/collect.ts');
const repositorySource=await source('../lib/collection/source-settings-repository.ts');
const serviceSource=await source('../lib/admin/service.ts');
const manageRoute=await source('../app/api/manage/route.ts');
const archiveSource=await source('../lib/news/archive.ts');
const adminPanel=await source('../app/admin/panel.tsx');
const newsroom=await source('../app/newsroom.tsx');
const sourceSheet=await source('../components/admin/admin-source-settings-sheet.tsx');

const defaults=settings.parseSourceEnabledState(null);
assert.equal(Object.values(defaults).every(Boolean),true,'missing settings enable all seven sources');
assert.equal(Object.keys(defaults).length,7);
assert.deepEqual(sources.sourceAdapters.map(item=>item.id),['starwars','swnn','collider','thr','deadline','variety','forbes'],'source IDs are stable and explicit');

const colliderOff=settings.normalizeSourceEnabledState({...defaults,collider:false});
assert.equal(colliderOff.collider,false,'Collider OFF is represented explicitly');
assert.equal(settings.parseSourceEnabledState(JSON.stringify(colliderOff)).collider,false,'stored Collider OFF survives a reload');
assert.equal(settings.enabledSourceAdapters(colliderOff).some(item=>item.id==='collider'),false,'disabled Collider adapter is not selected');
assert.deepEqual(settings.enabledSourceAdapters(colliderOff).map(item=>item.id),['starwars','swnn','thr','deadline','variety','forbes'],'the other six sources remain enabled');
assert.equal(settings.enabledSourceAdapters({...colliderOff,collider:true}).some(item=>item.id==='collider'),true,'re-enabled Collider returns to the next collection');

assert.match(collectSource,/const enabled=enabledSourceAdapters\(sourceState\)[\s\S]*runIsolated\(enabled,adapter=>collectSource/,'collector invokes only preselected enabled adapters');
assert.match(collectSource,/if\(!enabled\.length\)[\s\S]*활성화된 뉴스 소스가 없습니다/,'all-off collection exits safely with a clear report');
assert.match(collectSource,/if\(result\.disabled\)return `\$\{result\.source\}: 수집 비활성화`/,'collection report identifies disabled sources');
assert.doesNotMatch(repositorySource,/UPDATE\s+articles|DELETE\s+FROM\s+articles/i,'source settings persistence never mutates existing articles');
assert.doesNotMatch(repositorySource,/status_override|topic_override/,'source settings persistence is isolated from administrator article overrides');
assert.match(repositorySource,/SELECT value FROM settings WHERE key=\?/,'source settings are loaded from D1 settings');
assert.match(repositorySource,/setting\(COLLECTION_SOURCES_SETTING_KEY,JSON\.stringify\(state\)\)/,'source settings are durably saved as one versioned setting');
assert.match(serviceSource,/action==='set-source-enabled'[\s\S]*isSourceId\(sourceId\)[\s\S]*saveSourceEnabledState/,'admin service validates and persists source toggles');
assert.match(manageRoute,/getAdminSession/,'source toggle API remains protected by the admin session');
assert.equal(settings.enabledSourceAdapters(settings.normalizeSourceEnabledState(Object.fromEntries(sources.sourceAdapters.map(item=>[item.id,false])))).length,0,'all sources may be safely disabled');

const now=Date.parse('2026-09-23T00:00:00Z');
const article=(id,source,topic,published,extra={})=>({id,source,topic,published,status:'published',statusOverride:null,title:id,...extra});
const stored=[
  article('collider-earliest','Collider','mixed','2026-09-20T12:00:00Z',{statusOverride:'published'}),
  article('variety-next','Variety','mixed','2026-09-21T12:00:00Z'),
  article('collider-only','Collider','collider-only','2026-09-21T12:00:00Z'),
  article('review-collider','Collider','review','2026-09-22T12:00:00Z',{status:'review'}),
];
const persisted=JSON.stringify(stored);
assert.equal(settings.sourceIdForArticleSource(' Collider '),'collider','article source names resolve to stable source IDs');
assert.deepEqual(settings.filterArticlesByEnabledSources(stored,defaults),stored,'default settings display every source article');
const visibleOff=settings.filterArticlesByEnabledSources(stored,colliderOff);
assert.deepEqual(visibleOff.map(item=>item.id),['variety-next'],'Collider OFF hides existing published Collider articles but keeps other sources');
assert.equal(JSON.stringify(stored),persisted,'visibility filtering never mutates stored DB rows');
assert.equal(stored[0].status,'published','OFF leaves article status unchanged');
assert.equal(stored[0].statusOverride,'published','OFF leaves administrator publication overrides unchanged');
assert.equal(stories.buildStories(visibleOff,now).length,1,'a Collider-only topic disappears before grouping');
assert.deepEqual(stories.buildStories(visibleOff,now).map(story=>story.topic),['mixed'],'a topic containing only disabled-source articles is absent from the archive');
assert.equal(stories.buildStories(visibleOff,now)[0].articles[0].id,'variety-next','remaining enabled source becomes the earliest representative');
assert.deepEqual(settings.filterArticlesByEnabledSources(stored,{...colliderOff,collider:true}),stored,'re-enabling restores existing rows without reinsertion or AI work');
assert.deepEqual(settings.filterArticlesByEnabledSources([article('unknown','Legacy Source','legacy','2026-09-21T12:00:00Z')],colliderOff).map(item=>item.id),['unknown'],'unknown legacy sources stay visible safely');
assert.match(archiveSource,/buildStories\(filterArticlesByEnabledSources\(articles,sourceState\)/,'public archive filters enabled sources before topic grouping');
assert.match(archiveSource,/sourceSettingItems\(sourceState\)\.filter\(source=>source\.enabled\)/,'public sidebar receives enabled sources only');
assert.match(serviceSource,/visibleArticles:filterArticlesByEnabledSources\(articles,sourceState\)/,'admin service uses the same visibility helper');
assert.match(adminPanel,/buildStories\(visibleArticles,projectionNow\)/,'admin public-preview groups the same visible articles');
assert.match(newsroom,/sources\.map\(source=>/,'public source sidebar derives from server visibility state');
assert.match(newsroom,/sourceList\.length\}개의 소스/,'public source count follows the enabled sidebar list');
assert.match(sourceSheet,/수집 중지 · 아카이브에서 숨김/,'Source Settings explains the OFF visibility policy');
assert.match(sourceSheet,/다시 켜면 삭제 없이 복원됩니다/,'Source Settings explains reversible restoration');
console.log('Source settings: 36 assertions passed');
