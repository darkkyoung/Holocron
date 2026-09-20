import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function transpile(path,replacements={}){
  const source=await readFile(new URL(path,import.meta.url),'utf8');
  let output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [specifier,url] of Object.entries(replacements))output=output.replaceAll(`'${specifier}'`,`'${url}'`).replaceAll(`"${specifier}"`,`"${url}"`);
  return `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
}

const policyUrl=await transpile('../lib/collection/policy.ts');
const policy=await import(policyUrl);
const sourcesUrl=await transpile('../lib/collection/sources.ts',{'./policy':policyUrl});
const sourceModule=await import(sourcesUrl);
const openAiUrl=await transpile('../lib/collection/openai.ts',{'./policy':policyUrl});
const openAi=await import(openAiUrl);
const overrideUrl=await transpile('../lib/admin/override-policy.ts');
const {applyAutomaticDecision}=await import(overrideUrl);
const storiesUrl=await transpile('../lib/news/stories.ts');
const {buildStories}=await import(storiesUrl);

const now=Date.parse('2026-09-20T12:00:00Z');

const normalized=policy.normalizeArticleUrl('http://WWW.Example.com/news/a/?utm_source=x&b=2&a=1#fragment');
assert.equal(normalized,'https://example.com/news/a?a=1&b=2');
assert.equal(policy.knownUrlSet([normalized]).has(policy.normalizeArticleUrl('https://example.com/news/a/?b=2&a=1&utm_medium=y')),true,'normalized URL reruns must deduplicate');

assert.equal(policy.publicationDate('2026-09-01',now).kind,'valid','recent date-only values stay eligible without invented time');
assert.equal(policy.publicationDate('2026-06-01T12:00:00Z',now).kind,'expired','articles older than 90 days must be dropped');
assert.equal(policy.publicationDate('not-a-date',now).kind,'review','malformed dates must enter review');
assert.equal(policy.publicationDate('2026-09-01T12:00:00',now).kind,'review','timezone-less timestamps must enter review');

assert.equal(policy.isRelevant(true,'A completely unrelated official-site post'),true,'trusted sources accept every article');
assert.equal(policy.isRelevant(false,'New STAR WARS film announced'),true,'non-trusted sources accept explicit Star Wars coverage');
assert.equal(policy.isRelevant(false,'Disney announces a new film','An actor has joined the project'),false,'Disney or actor context alone is insufficient');

assert.equal(policy.editorialReason('Review: The Book of Boba Fett'),'Review 콘텐츠');
assert.equal(policy.editorialReason('Review of Ahsoka Season Two'),'Review 콘텐츠');
assert.equal(policy.editorialReason('REVIEW &#8211; A Star Wars Story'),'Review 콘텐츠','case, entity and punctuation variants must be detected');
assert.equal(policy.editorialReason('Second Sister – Star Wars Character Spotlight'),'Character Spotlight');
assert.equal(policy.editorialReason('Lucasfilm completes annual review process'),'', 'contextual use of review must not be over-filtered');

assert.equal(policy.cleanText('Ahsoka &#8211; Star Wars &amp; More'),'Ahsoka – Star Wars & More','RSS entities must be decoded');
const rss=sourceModule.parseRssOrAtom('<rss><channel><item><title><![CDATA[News &#8211; Star Wars]]></title><link>https://example.com/a</link><description>Body</description><pubDate>Sun, 20 Sep 2026 10:00:00 GMT</pubDate></item></channel></rss>');
assert.equal(rss[0].title,'News – Star Wars');
const atom=sourceModule.parseRssOrAtom('<feed><entry><title>Star Wars Atom</title><link href="https://example.com/b"/><summary>Body</summary><updated>2026-09-20T10:00:00Z</updated></entry></feed>');
assert.equal(atom[0].url,'https://example.com/b','Atom links must be supported');
assert.equal(sourceModule.sourceAdapters.length,7,'exactly seven configured sources are required');
assert.equal(new Set(sourceModule.sourceAdapters.map(source=>source.name)).size,7);
assert.equal(sourceModule.sourceAdapters.find(source=>source.name==='Collider').endpoint,'https://collider.com/feed/category/tag/star-wars/','Collider must use its advertised Star Wars tag feed');

assert.throws(()=>openAi.validateAiOutput({title:'English only',summary:'한국어 요약',category:'기타',topic:'NEW'},'fresh',new Set()),openAi.AiProcessingError,'malformed AI output must not publish');
assert.deepEqual(openAi.validateAiOutput({title:'한국어 제목',summary:'한국어 요약입니다.',category:'영화',topic:'known'},'fresh',new Set(['known'])),{title:'한국어 제목',summary:'한국어 요약입니다.',category:'영화',topic:'known'});

const isolated=await policy.runIsolated(['broken','healthy'],async item=>{if(item==='broken')throw new Error('source down');return `${item}:ok`;},async item=>`${item}:failed`);
assert.deepEqual(isolated,['broken:failed','healthy:ok'],'one source failure must not block later sources');
const articleIsolation=await policy.runIsolated(['bad-ai','good-ai'],async item=>{if(item==='bad-ai')throw new Error('AI failed');return item;},async item=>`${item}:review`);
assert.deepEqual(articleIsolation,['bad-ai:review','good-ai'],'one AI failure must not block later articles');

const restored={topic:'t',topicOverride:null,status:'published',statusOverride:'published',reason:'관리자 수동 복구'};
assert.equal(applyAutomaticDecision(restored,{status:'review',reason:'Review 콘텐츠'}).status,'published','legacy editorial maintenance must not override manual restore');
const excluded={topic:'t',topicOverride:null,status:'excluded',statusOverride:'excluded',reason:'관리자 수동 제외'};
assert.equal(applyAutomaticDecision(excluded,{status:'published',reason:''}).status,'excluded','automatic publish must not override manual exclusion');
const split={topic:'a',topicOverride:'a',status:'published',statusOverride:null,reason:''};
assert.equal(applyAutomaticDecision(split,{topic:'auto'}).topic,'a','topic matching must preserve explicit admin override');

const grouped=[
  {id:'later',topic:'same',published:'2026-09-20T12:00:00Z',status:'published'},
  {id:'earliest',topic:'same',published:'2026-09-19T12:00:00Z',status:'published'},
];
assert.equal(buildStories(grouped,now)[0].articles[0].id,'earliest','earliest publication remains representative');

console.log('Collection reliability: 30 assertions passed');
