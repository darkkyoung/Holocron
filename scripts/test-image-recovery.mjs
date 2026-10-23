import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import {collectionSourceModule} from './test-source-modules.mjs';

const dataModule=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
async function transpile(path,replacements={}){
  let output=ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [specifier,url] of Object.entries(replacements))output=output.replaceAll(`'${specifier}'`,`'${url}'`).replaceAll(`"${specifier}"`,`"${url}"`);
  return dataModule(output);
}
const policyUrl=await transpile('../lib/collection/policy.ts');
const sourcesUrl=await collectionSourceModule(policyUrl);
const metadataPolicyUrl=await transpile('../lib/collection/metadata-policy.ts',{'./policy':policyUrl});
const metadataUrl=await transpile('../lib/collection/metadata.ts',{'./sources':sourcesUrl,'./metadata-policy':metadataPolicyUrl});
const imagePolicyUrl=await transpile('../lib/collection/image-recovery-policy.ts',{'./sources':sourcesUrl});
const sources=await import(sourcesUrl);
const imagePolicy=await import(imagePolicyUrl);
const rss=body=>sources.parseRssOrAtom(`<rss><channel><item>${body}</item></channel></rss>`)[0];

const liveSwnnItem=`<title>&#8216;Star Wars/Marvel&#8217; Crossover Series Extended to Six Issues, Will Be Canon to the Marvel Comics Universe</title><link>https://www.starwarsnewsnet.com/2026/10/star-wars-marvel-crossover-series-extended-to-six-issues-will-be-canon-to-the-marvel-comics-universe.html</link><pubDate>Sun, 11 Oct 2026 01:29:47 +0000</pubDate><guid isPermaLink="false">https://www.starwarsnewsnet.com/?p=184549</guid><description><![CDATA[<p>New information about the upcoming Star Wars and Marvel crossover was revealed during New York Comic Con.</p><p>The post appeared first on Star Wars News Net.</p>]]></description>`;
const liveSwnnCandidate=rss(liveSwnnItem);
assert.equal(liveSwnnCandidate.image,'','the current SWNN RSS shape contains no image element');
const livePostUrl=sources.swnnWordPressPostUrl(liveSwnnCandidate.url);
assert.equal(new URL(livePostUrl).searchParams.get('slug'),'star-wars-marvel-crossover-series-extended-to-six-issues-will-be-canon-to-the-marvel-comics-universe','the real failed .html permalink produces the current WordPress slug');
assert.match(new URL(livePostUrl).searchParams.get('_fields'),/featured_media/,'the post query retains the numeric media fallback fields');
assert.match(livePostUrl,/^https:\/\/www\.starwarsnewsnet\.com\/wp-json\/wp\/v2\/posts\?/);
const liveImage='https://www.starwarsnewsnet.com/wp-content/uploads/2026/10/Screenshot-2026-10-10-202027-e1791681784487.png';
const liveWordPressResponse=JSON.stringify([{id:184549,link:liveSwnnCandidate.url,featured_media:184563,yoast_head_json:{og_image:[{width:1200,height:675,url:liveImage,type:'image/png'}]}}]);
assert.equal(sources.enrichSwnnFromWordPress(liveSwnnCandidate,liveWordPressResponse).image,liveImage,'the current live failed-article WordPress shape supplies the initial image');
assert.equal(sources.enrichSwnnFromWordPress(liveSwnnCandidate,'[{"jetpack_featured_media_url":"https://images.example/jetpack.jpg"}]').image,'https://images.example/jetpack.jpg','Jetpack featured media remains supported');
assert.equal(sources.enrichSwnnFromWordPress(liveSwnnCandidate,'[{"_embedded":{"wp:featuredmedia":[{"source_url":"https://images.example/embedded.jpg"}]}}]').image,'https://images.example/embedded.jpg','embedded WordPress featured media remains supported');
assert.equal(sources.enrichSwnnFromWordPress(liveSwnnCandidate,'[{"yoast_head_json":{"og_image":[{"url":"javascript:x"}]}}]').image,'','malformed SWNN featured image URLs are ignored');
assert.equal(sources.enrichSwnnFromWordPress({...liveSwnnCandidate,image:'https://images.example/admin.jpg'},liveWordPressResponse).image,'https://images.example/admin.jpg','existing images are never replaced by source enrichment');

const swnn=sources.sourceAdapters.find(source=>source.id==='swnn');
async function sourceEnrichment(response){
  const diagnostics=[];
  const enrich=swnn.createCandidateEnricher(async()=>{
    if(response instanceof Error)throw response;
    return response;
  },{reportDiagnostic:diagnostic=>diagnostics.push(diagnostic)});
  return {candidate:await enrich(liveSwnnCandidate),diagnostics};
}
let sourceResult=await sourceEnrichment(liveWordPressResponse);
assert.equal(sourceResult.candidate.image,liveImage);assert.deepEqual(sourceResult.diagnostics,[]);
const featuredCalls=[];
const featuredEnrich=swnn.createCandidateEnricher(async url=>{featuredCalls.push(url);return url.includes('/posts?')?'[{"id":184549,"featured_media":184563}]':JSON.stringify({id:184563,post:184549,source_url:liveImage});});
assert.equal((await featuredEnrich(liveSwnnCandidate)).image,liveImage,'featured_media resolves through one bounded public media request');
assert.equal(featuredCalls.length,2);assert.equal(featuredCalls[1],'https://www.starwarsnewsnet.com/wp-json/wp/v2/media/184563?_fields=source_url');
const parentCalls=[];
const parentEnrich=swnn.createCandidateEnricher(async url=>{parentCalls.push(url);return url.includes('/posts?')?'[{"id":184549,"featured_media":0}]':JSON.stringify([{post:184549,source_url:liveImage}]);});
assert.equal((await parentEnrich(liveSwnnCandidate)).image,liveImage,'post id resolves the newest attached media when delayed metadata omits featured_media');
assert.equal(parentCalls.length,2);assert.match(parentCalls[1],/^https:\/\/www\.starwarsnewsnet\.com\/wp-json\/wp\/v2\/media\?/);assert.equal(new URL(parentCalls[1]).searchParams.get('parent'),'184549');
assert.equal(sources.swnnWordPressMediaUrl({featured_media:'184563'}),'','non-numeric media identifiers cannot produce arbitrary REST paths');
for(const [response,message,reason] of [['[]','post 0건','NO_IMAGE'],['not json','JSON 파싱 실패','PARSE_ERROR'],['{}','JSON 파싱 실패','PARSE_ERROR'],['[null]','JSON 파싱 실패','PARSE_ERROR'],['[{"yoast_head_json":{"og_image":[{"url":"javascript:x"}]}}]','이미지 메타데이터 누락','NO_IMAGE'],[new Error('HTTP 403'),'HTTP 403','HTTP_ERROR'],[new Error('HTTP 429'),'HTTP 429','HTTP_ERROR']]){
  sourceResult=await sourceEnrichment(response);assert.equal(sourceResult.candidate.image,'');assert.match(sourceResult.diagnostics[0].message,new RegExp(message));
  assert.equal(sourceResult.diagnostics[0].reason,reason);
}
let manualFetches=0;
const manualEnrich=swnn.createCandidateEnricher(async()=>{manualFetches++;return liveWordPressResponse;});
assert.equal((await manualEnrich({...liveSwnnCandidate,image:'https://images.example/admin.jpg'})).image,'https://images.example/admin.jpg');assert.equal(manualFetches,0,'a valid existing/manual image skips source lookup');

assert.equal(rss('<media:content url="https://images.example/content.jpg"/><media:thumbnail url="https://images.example/thumb.jpg"/><enclosure url="https://images.example/enclosure.jpg"/>').image,'https://images.example/content.jpg');
assert.equal(rss('<media:thumbnail url="https://images.example/thumb.jpg"/><enclosure url="https://images.example/enclosure.jpg"/>').image,'https://images.example/thumb.jpg');
assert.equal(rss('<enclosure url="https://images.example/enclosure.jpg"/>').image,'https://images.example/enclosure.jpg');
for(const [attribute,url] of [['src','src.jpg'],['data-src','data.jpg'],['data-lazy-src','lazy.jpg'],['data-original','original.jpg']]){
  assert.equal(rss(`<content:encoded><![CDATA[<img ${attribute}="https://images.example/${url}">]]></content:encoded>`).image,`https://images.example/${url}`);
}
assert.equal(rss('<content:encoded><![CDATA[<img srcset="data:image/png,x 1x, https://images.example/srcset.jpg 2x">]]></content:encoded>').image,'https://images.example/srcset.jpg');
assert.equal(rss('<description><![CDATA[<img data-lazy-src="https://images.example/description.jpg">]]></description>').image,'https://images.example/description.jpg');
assert.equal(rss('<content:encoded><![CDATA[<img src="javascript:x" data-src="blob:x" data-original="ftp://x" srcset="data:image/png,x 1x">]]></content:encoded>').image,'');
assert.equal(imagePolicy.normalizeManualImageUrl(' https://images.example/manual.jpg '),'https://images.example/manual.jpg');
for(const value of ['', 'data:image/png,x','javascript:x','blob:x','ftp://example.com/x',null])assert.throws(()=>imagePolicy.normalizeManualImageUrl(value));

// Reduced live metadata captured 2026-10-19, plus synthetic failure boundaries.
const observed=JSON.parse(await readFile(new URL('./fixtures/swnn-image-2026-10-19.json',import.meta.url),'utf8'));
const observedCandidate={...rss(observed.rssItem),description:'Synthetic summary for metadata tests'};
assert.equal(observedCandidate.image,'','observed RSS does not carry the original article image');
assert.equal(sources.enrichSwnnFromWordPress(observedCandidate,JSON.stringify([{...observed.post,yoast_head_json:{og_image:[{url:observed.ogImage}]}}])).image,observed.ogImage,'existing Yoast parser already handles the observed article; historical failure is not proven');
assert.equal(sources.enrichGenericFromHtml(observedCandidate,observed.htmlMeta).image,observed.ogImage);
const embeddedCalls=[];
const embeddedEnrich=swnn.createCandidateEnricher(async url=>{
  embeddedCalls.push(url);
  const fields=new URL(url).searchParams.get('_fields').split(',');
  assert.ok(fields.includes('_links')&&fields.includes('_embedded'),'WordPress requires both fields with _embed');
  return JSON.stringify([{...observed.post,_embedded:observed.embedded}]);
});
assert.equal((await embeddedEnrich(observedCandidate)).image,observed.ogImage);
assert.equal(embeddedCalls.length,1,'embedded-only image resolves without an extra media GET');
{
  const original=globalThis.fetch;
  const {createCandidateEnricher,enrichCandidate}=await import(metadataUrl);
  try{
    for(const failure of ['empty','403','429','timeout','malformed']){
      const calls=[],diagnostics=[];
      globalThis.fetch=async (url,options)=>{
        calls.push(String(url));assert.ok(options.signal,'all metadata requests keep a timeout signal');
        if(String(url).includes('/wp-json/')){
          if(failure==='timeout')throw new DOMException('synthetic private detail','TimeoutError');
          if(failure==='403'||failure==='429')return new Response('',{status:Number(failure)});
          return new Response(failure==='empty'?'[]':'not json');
        }
        return new Response(observed.htmlMeta);
      };
      const result=await createCandidateEnricher(swnn,d=>diagnostics.push(d))(observedCandidate);
      assert.equal(result.candidate.image,observed.ogImage,`${failure} retains the article HTML fallback`);
      assert.equal(calls.length,2,'one REST attempt, one HTML fallback; no retries');
      assert.equal(diagnostics.length,1);assert.ok(!JSON.stringify(diagnostics).includes('synthetic private detail'));
    }
    for(const failure of ['403','429','timeout','invalid-image','missing-image']){
      const diagnostics=[];
      globalThis.fetch=async url=>{
        if(String(url).includes('/wp-json/'))return new Response('[]');
        if(failure==='timeout')throw new DOMException('sensitive exception content','TimeoutError');
        if(failure==='403'||failure==='429')return new Response('',{status:Number(failure)});
        return new Response(failure==='invalid-image'?'<meta property="og:image" content="javascript:secret">':'<html></html>');
      };
      const result=await createCandidateEnricher(swnn,d=>diagnostics.push(d))(observedCandidate);
      assert.equal(result.candidate.image,'');assert.equal(result.problem,'','optional image failure does not invalidate otherwise complete article metadata');
      assert.equal(diagnostics.length,2,'both REST and terminal HTML failure are visible');
      assert.match(diagnostics[1].message,/원문 HTML 이미지 조회 실패/);
      if(failure==='403'||failure==='429')assert.ok(diagnostics[1].message.includes(`HTTP ${failure}`));
      if(failure==='timeout')assert.match(diagnostics[1].message,/시간 초과/);
      assert.equal(diagnostics[1].reason,failure==='403'||failure==='429'?'HTTP_ERROR':failure==='timeout'?'TIMEOUT':'NO_IMAGE');
      assert.doesNotMatch(JSON.stringify(diagnostics),/sensitive|secret/,'safe diagnostics contain no arbitrary exception or invalid URL');
    }
    const diagnostics=[];
    const parsed=await enrichCandidate(observedCandidate,{...swnn,enrichFromHtml:()=>{throw new Error('PRIVATE_HTML');}},d=>diagnostics.push(d),async()=>'<html/>');
    assert.equal(parsed.candidate.image,'');assert.equal(diagnostics[0].reason,'PARSE_ERROR');assert.doesNotMatch(JSON.stringify(diagnostics),/PRIVATE_HTML/);
  }finally{globalThis.fetch=original;}
}

const sqlite=new DatabaseSync(':memory:');
for(const filename of (await readdir(new URL('../drizzle/',import.meta.url))).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(await readFile(new URL(`../drizzle/${filename}`,import.meta.url),'utf8'));
const columns='id,topic,topic_override AS topicOverride,title,title_override AS titleOverride,summary,image,url,source,published,category,status,status_override AS statusOverride,reason,franchise';
const allArticles=()=>sqlite.prepare(`SELECT ${columns} FROM articles ORDER BY published DESC`).all();
const d1={prepare(sql){return {bind(...args){return {async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}};}};}};
const state={db:d1,feed:'',feedFetches:0,wpFetches:0,htmlFetches:0,wpImages:{}};globalThis.__imageRecoveryTest=state;
const newsUrl=dataModule(`export const db=()=>globalThis.__imageRecoveryTest.db;export const list=async()=>globalThis.__imageRecoveryTest.allArticles();export const setting=async()=>{};`);
state.allArticles=allArticles;
const repositoryUrl=await transpile('../lib/collection/repository.ts',{'../news':newsUrl,'./policy':policyUrl});
const imageRecoveryUrl=await transpile('../lib/collection/image-recovery.ts',{'../news':newsUrl,'./metadata':metadataUrl,'./metadata-policy':metadataPolicyUrl,'./policy':policyUrl,'./repository':repositoryUrl,'./sources':sourcesUrl});
const adminRepositoryUrl=await transpile('../lib/admin/repository.ts',{'@/lib/news':newsUrl});
const recovery=await import(imageRecoveryUrl);
const repository=await import(repositoryUrl);
const adminRepository=await import(adminRepositoryUrl);
const recent=new Date(Date.now()-86400000).toISOString();
function insert(id,extra={}){
  const article={id,topic:'topic',topicOverride:'manual-topic',title:'관리자 보존 제목',titleOverride:'수동 제목',summary:'보존 요약',image:'',url:`https://starwarsnewsnet.com/${id}`,source:'Star Wars News Net',published:recent,category:'영화',status:'published',statusOverride:'published',reason:'관리자 수동 공개',franchise:'star-wars',...extra};
  sqlite.prepare('INSERT INTO articles(id,topic,topic_override,title,title_override,summary,image,url,source,published,category,status,status_override,reason,franchise) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(article.id,article.topic,article.topicOverride,article.title,article.titleOverride,article.summary,article.image,article.url,article.source,article.published,article.category,article.status,article.statusOverride,article.reason,article.franchise);
  return article;
}
const row=id=>sqlite.prepare('SELECT * FROM articles WHERE id=?').get(id);
const withoutImage=value=>Object.fromEntries(Object.entries(value).filter(([key])=>key!=='image'));
const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{
  if(String(url).endsWith('/feed')){state.feedFetches++;return new Response(state.feed,{status:200});}
  if(String(url).includes('/wp-json/wp/v2/posts')){
    state.wpFetches++;
    const slug=new URL(String(url)).searchParams.get('slug');
    const image=slug?state.wpImages[slug]:undefined;
    return new Response(JSON.stringify(image?[{id:184475,link:String(url),featured_media:184478,yoast_head_json:{og_image:[{width:1024,height:576,url:image,type:'image/png'}]}}]:[]),{status:200});
  }
  state.htmlFetches++;
  return new Response('Forbidden',{status:403});
};
try{
  insert('individual');const before=row('individual');
  state.feed=`<rss><channel><item><link>http://www.starwarsnewsnet.com/individual/?utm_source=x</link><title>x</title><description>x</description><pubDate>${recent}</pubDate></item></channel></rss>`;
  state.wpImages.individual='https://images.example/individual.jpg';
  const individual=await recovery.retryArticleImage('individual');assert.equal(individual.ok,true);assert.equal(row('individual').image,'https://images.example/individual.jpg');assert.deepEqual(withoutImage(row('individual')),withoutImage(before),'individual recovery changes only image');
  assert.equal(state.wpFetches,1,'individual retry uses the shared SWNN WordPress enrichment');assert.equal(state.htmlFetches,0,'featured metadata avoids the article HTML fallback');

  insert('missing');const missingBefore=row('missing');state.feed='<rss><channel></channel></rss>';state.wpImages={};
  await assert.rejects(()=>recovery.retryArticleImage('missing'),/이미지를 찾지 못했습니다/);assert.deepEqual(row('missing'),missingBefore,'failed recovery leaves every field unchanged');

  sqlite.exec('DELETE FROM articles');
  for(let i=0;i<25;i++)insert(`batch-${String(i).padStart(2,'0')}`,{status:i%3===0?'review':i%3===1?'excluded':'published',statusOverride:i%2?'excluded':null,topicOverride:i%2?'manual-topic':null});
  insert('old',{published:'2000-01-01'});insert('already',{image:'https://images.example/existing.jpg'});
  state.feed=`<rss><channel>${Array.from({length:25},(_,i)=>`<item><link>https://starwarsnewsnet.com/batch-${String(i).padStart(2,'0')}</link><title>x</title><description>x</description><pubDate>${recent}</pubDate>${i===0?'':`<media:thumbnail url="https://images.example/${i}.jpg"/>`}</item>`).join('')}</channel></rss>`;
  state.wpImages={'batch-00':'https://images.example/0.jpg'};
  const snapshots=Object.fromEntries(allArticles().map(article=>[article.id,article]));state.feedFetches=0;state.wpFetches=0;
  const batch=await recovery.retryMissingArticleImages(100);assert.equal(batch.limit,20);assert.equal(batch.candidates,20);assert.equal(batch.recovered,20);assert.equal(batch.missing,0);assert.equal(batch.failed,0);assert.equal(state.feedFetches,1,'batch fetches each source feed once');
  assert.equal(state.wpFetches,1,'batch retry reuses feed images and calls shared SWNN enrichment only for the missing one');
  assert.equal(allArticles().filter(article=>article.id.startsWith('batch-')&&article.image).length,20);assert.equal(row('old').image,'');assert.equal(row('already').image,'https://images.example/existing.jpg');
  for(const article of allArticles())assert.deepEqual(withoutImage(article),withoutImage(snapshots[article.id]),`${article.id} retains all non-image fields`);

  const cutoff=new Date(Date.now()-90*86400000).toISOString().slice(0,10);
  const target=allArticles().find(article=>article.id.startsWith('batch-')&&!article.image);assert(target);
  sqlite.prepare('UPDATE articles SET image=? WHERE id=?').run('https://images.example/manual-race.jpg',target.id);
  assert.equal(await repository.updateMissingArticleImage(target.id,'https://images.example/automatic.jpg',cutoff),false,'batch recovery does not overwrite a concurrent manual image');

  const manualBefore=row(target.id);await adminRepository.persistArticleImage(target.id,'https://images.example/manual-new.jpg');assert.equal(row(target.id).image,'https://images.example/manual-new.jpg');assert.deepEqual(withoutImage(row(target.id)),withoutImage(manualBefore),'manual edit changes only image');
}finally{globalThis.fetch=originalFetch;delete globalThis.__imageRecoveryTest;sqlite.close();}

const service=await readFile(new URL('../lib/admin/service.ts',import.meta.url),'utf8');
const api=await readFile(new URL('../app/api/manage/route.ts',import.meta.url),'utf8');
const rail=await readFile(new URL('../components/admin/admin-operations.tsx',import.meta.url),'utf8');
const story=await readFile(new URL('../components/admin/admin-story-card.tsx',import.meta.url),'utf8');
const sheet=await readFile(new URL('../components/admin/admin-status-sheet.tsx',import.meta.url),'utf8');
const editor=await readFile(new URL('../components/admin/article-image-editor.tsx',import.meta.url),'utf8');
assert.match(service,/retry-missing-images[\s\S]*invalidatePublicNewsCache/);assert.match(service,/retry-image[\s\S]*invalidatePublicNewsCache/);assert.match(service,/set-image[\s\S]*normalizeManualImageUrl[\s\S]*invalidatePublicNewsCache/);
assert.match(api,/getAdminSession/);assert.match(api,/body\.image/);assert.match(rail,/누락 이미지 재조회/);assert.match(story,/ArticleImageEditor/);assert.match(sheet,/ArticleImageEditor/);assert.match(editor,/이미지 재조회/);assert.match(editor,/이미지 URL 수정/);assert.match(editor,/if\(await onSave[\s\S]*setEditing\(false\)/,'failed manual saves keep the editor open');
console.log('Image recovery: parser fallbacks, image-only SQL, individual/batch/manual actions, limits, UI and cache paths passed');
