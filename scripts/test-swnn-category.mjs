import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';

// Synthetic source metadata, never represented as a captured live SWNN feed.
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
let outbound=0,metadataCalls=0;
const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',script:'export default {fetch(){return new Response("isolated")}}',d1Databases:['DB'],outboundService:()=>{outbound++;throw Error('OUTBOUND_FORBIDDEN');}});
const db=await mf.getD1Database('DB');
for(const name of (await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort())await db.batch(require('wrangler').unstable_splitSqlQuery(await readFile('drizzle/'+name,'utf8')).map(sql=>db.prepare(sql)));
globalThis.__swnnCategory={db,ai:0};
const loaded=await loadTestModules(['lib/collection/sources.ts','lib/collection/discovery.ts','lib/collection/candidate-queue.ts','lib/collection/processor.ts','lib/collection/repository.ts','lib/collection/policy.ts'],{stubs:{
  '../news':'export const db=()=>globalThis.__swnnCategory.db;export const setting=()=>{throw Error("UNEXPECTED_SETTING_WRITE")};export const config=()=>({key:"mock",model:"mock"});',
  './openai':'export async function processWithOpenAi(){globalThis.__swnnCategory.ai++;return {title:"검증된 소식",summary:"모의 요약",category:"기타",topic:"mock-story"};}',
}});
const sources=loaded.modules['lib/collection/sources.ts'],discovery=loaded.modules['lib/collection/discovery.ts'],queue=loaded.modules['lib/collection/candidate-queue.ts'],processor=loaded.modules['lib/collection/processor.ts'],repo=loaded.modules['lib/collection/repository.ts'],policy=loaded.modules['lib/collection/policy.ts'];
const swnn=sources.sourceAdapters.find(a=>a.id==='swnn');
const now=Date.parse('2026-10-27T12:00:00Z'),range={start:'2026-10-20',end:'2026-10-27',days:8};
const feed=items=>`<rss><channel>${items}</channel></rss>`;
const item=(slug,categories='',extra='',title='Star Wars news')=>`<item><title>${title}</title><link>https://www.starwarsnewsnet.com/2026/10/${slug}.html</link><description>Star Wars facts</description><pubDate>Mon, 26 Oct 2026 12:00:00 +0000</pubDate>${categories}${extra}</item>`;
const candidate=categories=>sources.parseRssOrAtom(feed(item('sample',categories)))[0];
const originalFetch=globalThis.fetch;
globalThis.fetch=async()=>{metadataCalls++;throw Error('UNEXPECTED_METADATA_REQUEST');};
const reset=async()=>{await db.prepare('DELETE FROM articles').run();globalThis.__swnnCategory.ai=0;metadataCalls=0;};
const rows=async()=>(await db.prepare('SELECT * FROM articles ORDER BY id').all()).results;
let groups=0;
try{
  for(const category of ['Other','other','OTHER','  Other  ','<![CDATA[Other]]>','<![CDATA[ Other ]]>','&#79;ther','&#x4f;ther','&#32;Other&#32;']){
    const parsed=candidate(`<category>${category}</category>`);
    assert.equal(swnn.excludeCandidate(parsed),true,category);
    assert.equal(queue.queueSourceCandidates(swnn,[parsed],new Set(),12).sourceExcluded,1);
  }groups++;
  const multi=candidate('<category domain="source">Films</category><category><![CDATA[Other]]></category><category>Television</category>');
  assert.deepEqual(multi.sourceCategories,['Films','Other','Television']);assert(swnn.excludeCandidate(multi));groups++;
  assert(swnn.excludeCandidate(candidate('<category /><category>Other</category>')),'empty self-closing element does not swallow the next category');
  for(const categories of ['', '<category>Films</category><category>Television</category>', '<category>Other News</category>', '<category>SomeOther</category>', '<category>기타</category>', '<category>Other &amp; Films</category>']){
    assert.equal(swnn.excludeCandidate(candidate(categories)),false,categories);
  }
  assert.equal(candidate('').sourceCategories,undefined,'missing source categories remain unknown');
  assert.equal(swnn.excludeCandidate({...candidate(''),title:'Other Star Wars news',description:'Other reports',category:'기타'}),false);groups++;
  for(const content of [
    '<description><![CDATA[<category>Other</category>]]></description>',
    '<content:encoded><![CDATA[<category>Other</category>]]></content:encoded>',
    '<description><category>Other</category></description>',
    '<description><div><div>Text</div><category>Other</category></div></description>',
    '<!-- <category>Other</category> -->',
    '<category><![CDATA[<b>Other</b>]]></category>',
  ])assert.equal(swnn.excludeCandidate(sources.parseRssOrAtom(feed(item('text','',content)))[0]),false,'prose/markup is not an exact category');
  assert.equal(swnn.excludeCandidate(candidate('<category><![CDATA[&#79;ther]]></category>')),false,'literal CDATA entity text is not XML character data Other');groups++;
  for(const adapter of sources.sourceAdapters.filter(a=>a.id!=='swnn')){
    const parsed={...candidate('<category>Other</category>'),url:`https://${adapter.hosts[0]}/star-wars-news`};
    assert.equal(queue.queueSourceCandidates(adapter,[parsed],new Set(),12).sourceExcluded,0,adapter.id);
  }groups++;
  assert(swnn.excludeCandidate({...candidate(''),title:'This Week: Star Wars'}));
  assert(swnn.excludeCandidate({...candidate(''),url:'https://starwarsnewsnet.com/this-week-news.html'}));
  assert.equal(queue.queueSourceCandidates(swnn,[{...multi,title:'This Week: Star Wars'}],new Set(),12).sourceExcluded,1,'one candidate is counted once');groups++;
  for(const pair of [[candidate(''),multi],[multi,candidate('')],[candidate('<category>Films</category>'),multi]]){
    const merged=sources.mergeCandidateMetadata(...pair);
    assert(swnn.excludeCandidate(merged));assert.equal(merged.sourceCategories.filter(c=>c==='Other').length,1);
    assert.notEqual(merged.sourceCategories,pair[0].sourceCategories,'merge does not mutate input arrays');
  }groups++;
  // Each real discovery entry point reaches the real processor/repository/D1.
  for(const mode of ['normal','historical'])for(const path of ['primary','monthly']){
    await reset();
    const xml=feed(item('excluded','<category>Other</category>'));
    const requests=[];
    const found=await discovery.discoverSourceCandidates(swnn,async url=>{requests.push(url);return (url===swnn.endpoint)===(path==='primary')?xml:feed('');},{now,mode,range:mode==='historical'?range:undefined});
    const result=await processor.processSourceCandidates(swnn,found,[],new Set(),12,now,mode==='historical'?range:undefined);
    assert.equal(result.sourceExcluded,1,`${mode}/${path}`);assert.equal(result.attempted,0);assert.equal(result.inserted,0);
    assert.equal(metadataCalls,0,'no WordPress, media or article HTML request');assert.equal(globalThis.__swnnCategory.ai,0);assert.deepEqual(await rows(),[]);
    assert.match(processor.sourceReportLine(result),/1건 소스 정책 제외/);
    assert(requests.length<=1+(mode==='normal'?4:6),'existing discovery bounds retained');groups++;
  }
  for(const mode of ['normal','historical'])for(const otherInPrimary of [true,false]){
    const found=await discovery.discoverSourceCandidates(swnn,async url=>feed(item('shared',(url===swnn.endpoint)===otherInPrimary?'<category>Other</category>':'<category>Films</category>')),{now,mode,range:mode==='historical'?range:undefined});
    assert.equal(found.candidates.length,1);assert(swnn.excludeCandidate(found.candidates[0]),'later duplicate does not erase known Other');groups++;
  }
  // Excluded articles precede 13 good articles: all 12 slots remain available.
  await reset();
  const image='<media:thumbnail url="https://images.example/known.jpg"/>';
  const xml=feed(Array.from({length:15},(_,i)=>item(`other-${i}`,'<category>Other</category>')).join('')+Array.from({length:13},(_,i)=>item(`good-${i}`,'<category>Films</category>',image)).join(''));
  const found=await discovery.discoverSourceCandidates(swnn,async url=>url===swnn.endpoint?xml:feed(''),{now});
  const stored=[],known=new Set();
  const result=await processor.processSourceCandidates(swnn,found,stored,known,12,now);
  assert.equal(result.sourceExcluded,15);assert.equal(result.attempted,12);assert.equal(result.inserted,12);assert.equal(result.deferred,1);
  assert.equal(globalThis.__swnnCategory.ai,12);assert.equal(metadataCalls,0);
  assert.equal((await rows()).length,12);assert((await rows()).every(r=>r.url.includes('/good-')&&r.category==='기타'),'internal Korean category does not exclude articles');groups++;
  // Existing editorial overrides and stored Other articles are never reclassified.
  await reset();
  const existing={id:'existing',topic:'manual',topicOverride:'manual',title:'수동 제목',titleOverride:'수동 제목',summary:'수동 요약',image:'https://images.example/manual.jpg',url:policy.normalizeArticleUrl(candidate('').url),source:swnn.name,published:'2026-10-26',category:'기타',status:'published',statusOverride:'published',reason:'admin',franchise:'star-wars'};
  await repo.insertCollectedArticle(existing);const before=await rows();
  const existingDiscovery=await discovery.discoverSourceCandidates(swnn,async()=>feed(item('sample','<category>Other</category>')),{now,articles:[existing]});
  const duplicate=await processor.processSourceCandidates(swnn,existingDiscovery,[existing],new Set([existing.url]),12,now);
  assert.equal(duplicate.attempted,0);assert.equal(duplicate.duplicate,1);assert.equal(duplicate.sourceExcluded,0);assert.deepEqual(await rows(),before);assert.equal(globalThis.__swnnCategory.ai,0);assert.equal(metadataCalls,0);groups++;
  assert.equal(outbound,0);
  console.log(`SWNN source category: ${groups} scenario groups PASS; real discovery/processor + isolated D1; excluded metadata/AI/inserts zero; external/Provider outbound zero`);
}finally{
  globalThis.fetch=originalFetch;delete globalThis.__swnnCategory;await loaded.dispose();await mf.dispose();
}
