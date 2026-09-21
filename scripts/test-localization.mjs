import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function transpile(path,replacements={}){
  const source=await readFile(new URL(path,import.meta.url),'utf8');
  let output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [specifier,url] of Object.entries(replacements))output=output.replaceAll(`'${specifier}'`,`'${url}'`).replaceAll(`"${specifier}"`,`"${url}"`);
  return `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
}

const policyBaseUrl=await transpile('../lib/collection/policy.ts');
const localizationPolicyUrl=await transpile('../lib/collection/localization-policy.ts',{'./policy':policyBaseUrl});
const policy=await import(localizationPolicyUrl);
const runnerUrl=await transpile('../lib/collection/localization-runner.ts',{'./localization-policy':localizationPolicyUrl});
const {runLocalizationBatch}=await import(runnerUrl);

const now=Date.parse('2026-09-21T12:00:00Z');
const article=(extra={})=>({id:crypto.randomUUID(),topic:'topic-original',topicOverride:'topic-manual',title:'English title',summary:'English summary',image:'',url:'https://example.com/news',source:'Example',published:'2026-09-20T12:00:00Z',category:'기타',status:'published',statusOverride:'published',reason:'',franchise:'star-wars',...extra});

assert.equal(policy.isLocalizationCandidate(article(),now),true,'English title and summary are candidates');
assert.equal(policy.isLocalizationCandidate(article({title:'한국어 제목'}),now),true,'Korean title and English summary are candidates');
assert.equal(policy.isLocalizationCandidate(article({summary:'한국어 요약'}),now),true,'English title and Korean summary are candidates');
assert.equal(policy.isLocalizationCandidate(article({title:'한국어 제목',summary:'한국어 요약'}),now),false,'fully Korean articles are not candidates');
assert.equal(policy.isLocalizationCandidate(article({status:'review'}),now),false,'review articles are not candidates');
assert.equal(policy.isLocalizationCandidate(article({status:'excluded'}),now),false,'excluded articles are not candidates');
assert.equal(policy.isLocalizationCandidate(article({title:'Review: Star Wars news'}),now),false,'Review content is not a localization candidate');
assert.equal(policy.isLocalizationCandidate(article({title:'Star Wars Character Spotlight'}),now),false,'Character Spotlight is not a localization candidate');

const stored=article();
const preserved={id:stored.id,url:stored.url,source:stored.source,published:stored.published,topic:stored.topic,topicOverride:stored.topicOverride,status:stored.status,statusOverride:stored.statusOverride,franchise:stored.franchise};
const successful=await runLocalizationBatch([stored],15,async()=>({title:'한국어 제목',summary:'한국어 요약입니다.',category:'영화'}),async(id,patch)=>{assert.equal(id,stored.id);Object.assign(stored,patch);return true;});
assert.deepEqual(successful,{candidates:1,succeeded:1,failed:0,skipped:0,deferred:0},'successful localization is reported');
assert.deepEqual({title:stored.title,summary:stored.summary,category:stored.category},{title:'한국어 제목',summary:'한국어 요약입니다.',category:'영화'},'only localization fields are replaced');
assert.deepEqual({id:stored.id,url:stored.url,source:stored.source,published:stored.published,topic:stored.topic,topicOverride:stored.topicOverride,status:stored.status,statusOverride:stored.statusOverride,franchise:stored.franchise},preserved,'topic, overrides, status and identity fields are preserved');

const failedArticle=article();
const beforeFailure=structuredClone(failedArticle);
const failed=await runLocalizationBatch([failedArticle],15,async()=>{throw new Error('temporary OpenAI failure');},async()=>{throw new Error('must not persist failed output');});
assert.deepEqual(failed,{candidates:1,succeeded:0,failed:1,skipped:0,deferred:0},'a localization failure remains isolated');
assert.deepEqual(failedArticle,beforeFailure,'failed localization keeps the existing English data');

const mixed=await runLocalizationBatch([article({id:'fails'}),article({id:'continues'})],15,async item=>{
  if(item.id==='fails')throw new Error('temporary failure');
  return {title:'한국어 제목',summary:'한국어 요약',category:'기타'};
},async()=>true);
assert.deepEqual(mixed,{candidates:2,succeeded:1,failed:1,skipped:0,deferred:0},'one article failure does not stop later localization');

const batch=Array.from({length:18},(_,index)=>article({id:`article-${index}`}));
let calls=0;
const limited=await runLocalizationBatch(batch,15,async()=>{calls++;return {title:'한국어 제목',summary:'한국어 요약',category:'기타'};},async()=>true);
assert.equal(calls,15,'batch limit caps OpenAI calls');
assert.equal(limited.deferred,3,'items over the batch limit are deferred');

const translated=batch.slice(0,15).map(item=>({...item,title:'한국어 제목',summary:'한국어 요약'}));
let secondCalls=0;
const secondCandidates=translated.filter(item=>policy.isLocalizationCandidate(item,now));
await runLocalizationBatch(secondCandidates,15,async()=>{secondCalls++;return {title:'중복',summary:'중복',category:'기타'};},async()=>true);
assert.equal(secondCalls,0,'already localized articles are not sent to OpenAI on the next collection');

const repository=await readFile(new URL('../lib/collection/repository.ts',import.meta.url),'utf8');
const service=await readFile(new URL('../lib/collection/localization.ts',import.meta.url),'utf8');
const localizationUpdate=repository.match(/export async function updateLocalizationFields[\s\S]*?\n}/)?.[0]??'';
assert.match(localizationUpdate,/UPDATE articles SET title=\?,summary=\?,category=\? WHERE id=\? AND status='published'/,'repository update is restricted to localization fields on published rows');
assert.doesNotMatch(localizationUpdate,/topic|status_override|topic_override|franchise/,'localization update must not touch protected fields');
assert.match(service,/if\(!candidates\.length\)return[\s\S]*기존 영문 기사 한글화: 대상 없음/,'an empty batch skips AI and reports no targets');
console.log('Legacy localization: 19 assertions passed');
