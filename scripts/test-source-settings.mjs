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
const sources=await import(sourcesUrl);
const settings=await import(settingsUrl);
const collectSource=await source('../lib/collect.ts');
const repositorySource=await source('../lib/collection/source-settings-repository.ts');
const serviceSource=await source('../lib/admin/service.ts');
const manageRoute=await source('../app/api/manage/route.ts');

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
console.log('Source settings: 18 assertions passed');
