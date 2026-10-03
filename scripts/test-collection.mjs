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
const dateRangeUrl=await transpile('../lib/collection/date-range.ts',{'./policy':policyUrl,'./sources':sourcesUrl});
const discoveryUrl=await transpile('../lib/collection/discovery.ts',{'./policy':policyUrl,'./sources':sourcesUrl,'./date-range':dateRangeUrl});
const discovery=await import(discoveryUrl);
const queueUrl=await transpile('../lib/collection/candidate-queue.ts',{'./policy':policyUrl,'./sources':sourcesUrl});
const queue=await import(queueUrl);
const openAiUrl=await transpile('../lib/collection/openai.ts',{'./policy':policyUrl});
const openAi=await import(openAiUrl);
const openAiSource=await readFile(new URL('../lib/collection/openai.ts',import.meta.url),'utf8');
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
const sitemap=sourceModule.parseNewsSitemap('<urlset><url><loc>https://www.forbes.com/sites/example/star-wars-news/</loc><news:news><news:title>Star Wars News</news:title><news:publication_date>2026-09-20T10:00:00Z</news:publication_date></news:news><image:image><image:loc>https://images.example/forbes.jpg</image:loc></image:image></url></urlset>');
assert.deepEqual(sitemap[0],{url:'https://www.forbes.com/sites/example/star-wars-news/',title:'Star Wars News',description:'',published:'2026-09-20T10:00:00Z',image:'https://images.example/forbes.jpg'},'Forbes news sitemap retains title, date and image metadata');
assert.equal(sourceModule.sourceAdapters.length,7,'exactly seven configured sources are required');
assert.equal(new Set(sourceModule.sourceAdapters.map(source=>source.name)).size,7);
assert.equal(sourceModule.sourceAdapters.find(source=>source.name==='Collider').endpoint,'https://collider.com/feed/category/tag/star-wars/','Collider must use its advertised Star Wars tag feed');

const starWarsIndex=`
<li class="col item"><a href="https://www.starwars.com/news/featured-story" data-title="Featured Star Wars Story"><noscript><img src="https://images.example/featured.jpg"></noscript></a></li>
<li class="building-block-config articlepage-content"><a href="/news/normal-story"><img data-src="https://images.example/normal.jpg"></a><h3 class="title"><span>Normal Star Wars Story</span></h3><p class="desc"><span>Facts supplied by the official index.</span></p></li>
<li class="article"><a href="https://www.starwars.com/news/normal-story" data-title="Normal Star Wars Story"><h3 class="article-title">Normal Star Wars Story</h3></a><p class="publish-date">September 17, 2026</p></li>`;
const starWarsCandidates=sourceModule.parseStarWarsIndex(starWarsIndex);
assert.equal(starWarsCandidates.length,2,'featured and normal StarWars.com cards are deduplicated by URL');
assert.deepEqual(starWarsCandidates.find(candidate=>candidate.url.endsWith('/normal-story')),{
  url:'https://www.starwars.com/news/normal-story',title:'Normal Star Wars Story',description:'Facts supplied by the official index.',published:'2026-09-17',image:'https://images.example/normal.jpg',
},'normal StarWars.com cards retain title, description, date and image supplied by the index');
assert.equal(starWarsCandidates.find(candidate=>candidate.url.endsWith('/featured-story')).title,'Featured Star Wars Story','featured StarWars.com cards retain their title');
assert.equal(starWarsCandidates.find(candidate=>candidate.url.endsWith('/featured-story')).image,'https://images.example/featured.jpg','featured StarWars.com cards retain their image');
const embeddedArticle={entity_type:'articlepage',href:'https://www.starwars.com/news/embedded-story',title:'Embedded Star Wars Story',description:'<h2>Facts supplied by embedded page data.</h2>',content_date:'2026-09-18T06:00:00-07:00',image_assets:{featured_image:{src:'https://images.example/embedded.jpg'}}};
const embeddedCandidates=sourceModule.parseStarWarsIndex(`<script>this.Grill?Grill.burger=${JSON.stringify({stack:[{data:[embeddedArticle]}]})}:(function(){})()</script>`);
assert.deepEqual(embeddedCandidates[0],{
  url:'https://www.starwars.com/news/embedded-story',title:'Embedded Star Wars Story',description:'Facts supplied by embedded page data.',published:'2026-09-18T06:00:00-07:00',image:'https://images.example/embedded.jpg',
},'embedded StarWars.com article data provides complete metadata without an article fetch');
const visibleArticle=`<section class="module inc_rich_article"><div class="featured-image"><noscript><img src="https://images.example/visible.jpg"></noscript></div><div class="headline-area"><h1><span>Visible Star Wars Title</span></h1></div><div class="publish-date">September 17, 2026</div><div class="content-area"><div class="summary"><h2>Visible article facts.</h2></div></div></section>`;
assert.deepEqual(sourceModule.enrichStarWarsFromHtml({url:'https://www.starwars.com/news/visible',title:'',description:'',published:'',image:''},visibleArticle),{url:'https://www.starwars.com/news/visible',title:'Visible Star Wars Title',description:'Visible article facts.',published:'2026-09-17',image:'https://images.example/visible.jpg'},'individual StarWars.com visible markup supplies h1, summary, date and hero image before generic metadata');

const swnn=sourceModule.sourceAdapters.find(source=>source.id==='swnn');
const sampleTitle="The Mandalorian and Grogu: Nielsen Shows Solid Ratings for First Week on Streaming";
const sampleUrl='https://www.starwarsnewsnet.com/2026/09/the-mandalorian-and-grogu-nielsen-shows-solid-ratings-for-first-week-on-streaming.html';
assert.equal(policy.editorialReason(sampleTitle,'',sampleUrl),'','the SWNN Nielsen article is not an editorial review or Character Spotlight');
assert.equal(policy.isRelevant(swnn.trusted,sampleTitle,'',sampleUrl),true,'trusted SWNN articles bypass keyword rejection');
assert.equal(policy.normalizeArticleUrl(sampleUrl),'https://starwarsnewsnet.com/2026/09/the-mandalorian-and-grogu-nielsen-shows-solid-ratings-for-first-week-on-streaming.html');
const discoveryNow=Date.parse('2026-10-02T12:00:00Z');
const backfillCalls=[];
const item=(url,title,published)=>`<item><link>${url}</link><title>${title}</title><description>Source facts</description><pubDate>${published}</pubDate></item>`;
const discovered=await discovery.discoverSourceCandidates(swnn,async url=>{
  backfillCalls.push(url);
  if(url===swnn.endpoint)return `<rss><channel>${item('https://starwarsnewsnet.com/current','Current Star Wars','Thu, 01 Oct 2026 10:00:00 +0000')}</channel></rss>`;
  if(url.includes('/2026/09/'))return `<rss><channel>${item(sampleUrl,sampleTitle,'Sat, 19 Sep 2026 16:55:02 +0000')}${item('https://starwarsnewsnet.com/current','Duplicate','Thu, 01 Oct 2026 10:00:00 +0000')}</channel></rss>`;
  if(url.includes('/2026/08/'))return `<rss><channel>${item('https://starwarsnewsnet.com/2026/08/recent','Recent Star Wars','Sat, 01 Aug 2026 10:00:00 +0000')}</channel></rss>`;
  return `<rss><channel>${item('https://starwarsnewsnet.com/2026/07/expired','Expired Star Wars','Wed, 01 Jul 2026 10:00:00 +0000')}</channel></rss>`;
},discoveryNow);
assert.equal(discovered.candidates.some(candidate=>policy.normalizeArticleUrl(candidate.url)===policy.normalizeArticleUrl(sampleUrl)),true,'bounded SWNN monthly backfill discovers the Nielsen sample');
assert.equal(discovered.candidates.filter(candidate=>candidate.url.endsWith('/current')).length,1,'RSS and backfill candidates deduplicate by normalized URL');
assert.equal(discovered.candidates.some(candidate=>candidate.url.endsWith('/expired')),false,'SWNN backfill excludes articles older than 90 days');
assert.equal(discovered.backfillRequests,2,'SWNN rolling archive pagination remains bounded');
assert.equal(backfillCalls.length,3,'one primary RSS request plus two bounded monthly rolling requests are made');

const backlog=Array.from({length:25},(_,index)=>({url:`https://starwarsnewsnet.com/story-${index}`,title:`Star Wars ${index}`,description:'Facts',published:'2026-10-01',image:''}));
const backlogKnown=new Set();
const backlogSizes=[];
for(let run=0;run<3;run++){
  const selected=queue.queueSourceCandidates(swnn,backlog,backlogKnown,12);
  backlogSizes.push(selected.queued.length);
  for(const candidate of selected.queued)backlogKnown.add(candidate.url);
}
assert.deepEqual(backlogSizes,[12,12,1],'known URL skips let MAX_NEW_PER_SOURCE backlog progress on repeated runs');
assert.equal(backlogKnown.size,25,'all queued candidates eventually receive a turn');

assert.throws(()=>openAi.validateAiOutput({title:'English only',summary:'한국어 요약',category:'기타',topic:'NEW'},'fresh',new Set()),openAi.AiProcessingError,'malformed AI output must not publish');
assert.deepEqual(openAi.validateAiOutput({title:'한국어 제목',summary:'한국어 요약입니다.',category:'영화',topic:'known'},'fresh',new Set(['known'])),{title:'한국어 제목',summary:'한국어 요약입니다.',category:'영화',topic:'known'});
assert.equal((openAiSource.match(/Do not translate or closely reproduce the source wording, sentence structure, or distinctive phrasing\./g)??[]).length,2,'both AI editor prompts independently rewrite facts instead of reproducing source wording');
assert.equal((openAiSource.match(/The description is unavailable\. Use only facts explicitly present in the headline\. Do not infer or add any fact\./g)??[]).length,2,'both AI paths enforce headline-only factual limits');

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

console.log('Collection reliability: parser, rolling discovery, queue and override assertions passed');
