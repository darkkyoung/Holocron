import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const dataModule=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
async function transpile(path,replacements={}){let output=ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const [specifier,url] of Object.entries(replacements))output=output.replaceAll(`'${specifier}'`,`'${url}'`).replaceAll(`"${specifier}"`,`"${url}"`);return dataModule(output);}

const policyUrl=await transpile('../lib/collection/policy.ts'),policy=await import(policyUrl);
const sourcesUrl=await transpile('../lib/collection/sources.ts',{'./policy':policyUrl}),sources=await import(sourcesUrl);
const dateRangeUrl=await transpile('../lib/collection/date-range.ts',{'./policy':policyUrl,'./sources':sourcesUrl}),dates=await import(dateRangeUrl);
const discoveryUrl=await transpile('../lib/collection/discovery.ts',{'./policy':policyUrl,'./sources':sourcesUrl,'./date-range':dateRangeUrl}),discovery=await import(discoveryUrl);
const queueUrl=await transpile('../lib/collection/candidate-queue.ts',{'./policy':policyUrl,'./sources':sourcesUrl});
const overrideUrl=await transpile('../lib/admin/override-policy.ts');
const now=Date.parse('2026-10-03T12:00:00Z');

assert.deepEqual(dates.parseHistoricalRange('2026-09-09','2026-09-18',now),{start:'2026-09-09',end:'2026-09-18',days:10});
assert.throws(()=>dates.parseHistoricalRange('09/09/2026','2026-09-18',now),/YYYY-MM-DD/);
assert.throws(()=>dates.parseHistoricalRange('2026-09-19','2026-09-18',now),/빠를 수 없습니다/);
assert.throws(()=>dates.parseHistoricalRange('2026-08-01','2026-09-18',now),/최대 31일/);
assert.throws(()=>dates.parseHistoricalRange('2020-01-01','2020-01-02',now),/수집 정책 범위/);

const starwars=sources.sourceAdapters.find(source=>source.id==='starwars');
const embedded=date=>({entity_type:'articlepage',href:`https://www.starwars.com/news/story-${date}`,title:`Star Wars ${date}`,description:'Official facts',content_date:`${date}T06:00:00-07:00`,image_assets:{featured_image:{src:`https://images.example/${date}.jpg`}}});
const fixture=['2026-09-08','2026-09-10','2026-09-12','2026-09-16','2026-09-17','2026-09-19'].map(embedded);
const historical=await discovery.discoverSourceCandidates(starwars,async()=>`<script>this.Grill?Grill.burger=${JSON.stringify({items:fixture})}:(function(){})()</script>`,{mode:'historical',range:dates.parseHistoricalRange('2026-09-09','2026-09-18',now),now});
assert.deepEqual(historical.candidates.map(candidate=>candidate.published.slice(0,10)),['2026-09-10','2026-09-12','2026-09-16','2026-09-17'],'the explicit historical gap fixture includes only 09-09 through 09-18');
assert.deepEqual(historical.discoveryPaths,['embedded']);

const swnn=sources.sourceAdapters.find(source=>source.id==='swnn'),calls=[];
const rss=(url,date)=>`<rss><channel><item><link>${url}</link><title>Star Wars archive</title><description>Facts</description><pubDate>${date}</pubDate></item></channel></rss>`;
const swnnHistorical=await discovery.discoverSourceCandidates(swnn,async url=>{calls.push(url);if(url===swnn.endpoint)return '<rss><channel></channel></rss>';return rss(`https://starwarsnewsnet.com/${calls.length}`,'Thu, 17 Sep 2026 18:45:12 +0000');},{mode:'historical',range:dates.parseHistoricalRange('2026-09-09','2026-09-18',now),now});
assert.equal(swnnHistorical.backfillRequests,discovery.MAX_HISTORICAL_REQUESTS_PER_SOURCE);
assert.ok(calls.slice(1).every(url=>url.includes('/2026/09/feed/')),'SWNN historical discovery uses the first-party monthly feed');

const rollingCalls=[];
const rolling=await discovery.discoverSourceCandidates(swnn,async url=>{rollingCalls.push(url);if(url===swnn.endpoint)return rss('https://starwarsnewsnet.com/current','Fri, 02 Oct 2026 12:00:00 +0000');if(url.includes('paged=2'))throw new Error('archive down');return rss('http://www.starwarsnewsnet.com/current/?utm_source=x','Fri, 02 Oct 2026 12:00:00 +0000')+rss('https://starwarsnewsnet.com/missed','Sat, 19 Sep 2026 17:01:44 +0000')+rss('https://starwarsnewsnet.com/old','Tue, 01 Sep 2026 17:01:44 +0000');},{now});
assert.equal(rolling.primaryDiscovered,1);assert.equal(rolling.candidates.filter(candidate=>candidate.url.endsWith('/current')).length,1,'rolling candidates deduplicate normalized primary URLs');
assert.ok(rolling.candidates.some(candidate=>candidate.url.endsWith('/missed')),'a recent missed article is recovered');
assert.ok(!rolling.candidates.some(candidate=>candidate.url.endsWith('/old')),'rolling candidates older than 14 days are excluded');
assert.equal(rolling.backfillRequests,discovery.MAX_ROLLING_REQUESTS_PER_SOURCE);assert.equal(rolling.backfillFailures.length,1,'one rolling archive failure does not discard primary discovery');

const knownArchive=Array.from({length:discovery.MAX_ARCHIVE_CANDIDATES_PER_SOURCE+1},(_,index)=>({source:swnn.name,url:`https://starwarsnewsnet.com/star-wars-known-${index}`}));
const archiveXml=knownArchive.map(article=>rss(article.url,'Thu, 17 Sep 2026 18:45:12 +0000')).join('')+rss('https://starwarsnewsnet.com/star-wars-next-new','Thu, 17 Sep 2026 18:45:12 +0000');
const progressive=await discovery.discoverSourceCandidates(swnn,async url=>url===swnn.endpoint?'<rss><channel></channel></rss>':url.includes('paged=2')?'<rss><channel></channel></rss>':`<rss><channel>${archiveXml}</channel></rss>`,{mode:'historical',range:dates.parseHistoricalRange('2026-09-09','2026-09-18',now),now,articles:knownArchive});
assert.equal(progressive.knownSkipped,knownArchive.length);assert.ok(progressive.candidates.some(candidate=>candidate.url.endsWith('/star-wars-next-new')),'known archive URLs do not consume the discovery cap, so repeated runs progress to later new candidates');

const collider=sources.sourceAdapters.find(source=>source.id==='collider'),colliderCalls=[];
const colliderResult=await discovery.discoverSourceCandidates(collider,async url=>{colliderCalls.push(url);if(url===collider.endpoint)return '<rss><channel></channel></rss>';if(url.endsWith('/sitemap.xml'))return '<sitemapindex><sitemap><loc>https://collider.com/sitemap-2026-09-part1-articles.xml</loc></sitemap></sitemapindex>';return '<urlset><url><loc>https://collider.com/star-wars-gap/</loc><lastmod>2026-09-16T12:00:00Z</lastmod></url></urlset>';},{mode:'historical',range:dates.parseHistoricalRange('2026-09-09','2026-09-18',now),now});
assert.ok(colliderCalls.includes('https://collider.com/sitemap.xml'));assert.ok(colliderCalls.some(url=>url.includes('sitemap-2026-09-part1-articles.xml')),'Collider resolves dated first-party article sitemaps through its index');
assert.equal(colliderResult.candidates[0].published,'','sitemap lastmod is only a discovery filter and never stored as the article publication date');
assert.equal(colliderResult.candidates[0].discoveryDate,'2026-09-16T12:00:00Z');

globalThis.__backfillTest={inserted:[]};
const newsUrl=dataModule('export const config=()=>({key:"test",model:"test"});');
const aiUrl=dataModule('export async function processWithOpenAi(title){if(title.includes("AI fail"))throw new Error("OpenAI 503");return {title:"한국어 제목",summary:"한국어 요약",category:"영화",topic:crypto.randomUUID()}}');
const repoUrl=dataModule('export async function insertCollectedArticle(article){globalThis.__backfillTest.inserted.push(article);return true}');
const metadataUrl=dataModule('export const createCandidateEnricher=()=>async candidate=>({candidate,problem:""});');
const processorUrl=await transpile('../lib/collection/processor.ts',{'../news':newsUrl,'../admin/override-policy':overrideUrl,'./openai':aiUrl,'./policy':policyUrl,'./sources':sourcesUrl,'./repository':repoUrl,'./metadata':metadataUrl,'./candidate-queue':queueUrl,'./date-range':dateRangeUrl,'./discovery':discoveryUrl});
const processor=await import(processorUrl);
const existingExcluded='https://starwarsnewsnet.com/excluded',existingReview='https://starwarsnewsnet.com/review';
const candidates=[
  {url:existingExcluded,title:'Star Wars excluded',description:'Facts',published:'2026-09-16',image:''},
  {url:existingReview,title:'Star Wars review row',description:'Facts',published:'2026-09-16',image:''},
  {url:'https://starwarsnewsnet.com/good',title:'Star Wars good',description:'Facts',published:'2026-09-16',image:''},
  {url:'https://starwarsnewsnet.com/editorial',title:'Review: Star Wars',description:'Facts',published:'2026-09-16',image:''},
  {url:'https://starwarsnewsnet.com/ai-fail',title:'Star Wars AI fail',description:'Facts',published:'2026-09-16',image:''},
];
const result=await processor.processSourceCandidates(swnn,{candidates,primaryDiscovered:0,backfillDiscovered:5,knownSkipped:0,backfillRequests:1,backfillFailures:[],discoveryPaths:['rss'],coverage:'complete',coverageNote:''},[],policy.knownUrlSet([existingExcluded,existingReview]),20,now,dates.parseHistoricalRange('2026-09-09','2026-09-18',now));
assert.equal(result.duplicate,2,'existing excluded and review URLs are not reinserted');assert.equal(result.inserted,3);assert.equal(result.published,1);assert.equal(result.review,2,'editorial and AI failures stay in review through the shared pipeline');
assert.equal(globalThis.__backfillTest.inserted.find(article=>article.url.endsWith('/editorial')).reason,'Review 콘텐츠');assert.match(globalThis.__backfillTest.inserted.find(article=>article.url.endsWith('/ai-fail')).reason,/AI 처리 실패/);
assert.match(processor.sourceReportLine({...processor.createSourceStats(starwars),sourceFailure:'primary 0건'}),/수집원 실패.*primary 0건/,'StarWars.com zero discovery is prominent in the report');
delete globalThis.__backfillTest;

const service=await readFile(new URL('../lib/admin/service.ts',import.meta.url),'utf8'),route=await readFile(new URL('../app/api/manage/route.ts',import.meta.url),'utf8'),rail=await readFile(new URL('../components/admin/admin-command-rail.tsx',import.meta.url),'utf8');
assert.match(service,/historical-backfill'[\s\S]*runHistoricalBackfill/);assert.match(route,/getAdminSession/);assert.match(route,/req\.headers\.get\('origin'\)/);assert.match(rail,/type="date"/);assert.match(rail,/전체 활성 소스/);assert.match(rail,/최대 31일/);
console.log('Historical and rolling backfill: validation, source strategies, bounds, shared processing, duplicate and admin safety assertions passed');
