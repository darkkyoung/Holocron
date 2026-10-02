import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';

const dataModule=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
async function transpile(path,replacements={}){
  let output=ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [specifier,url] of Object.entries(replacements))output=output.replaceAll(`'${specifier}'`,`'${url}'`).replaceAll(`"${specifier}"`,`"${url}"`);
  return dataModule(output);
}
const policyUrl=await transpile('../lib/collection/policy.ts');
const sourcesUrl=await transpile('../lib/collection/sources.ts',{'./policy':policyUrl});
const metadataPolicyUrl=await transpile('../lib/collection/metadata-policy.ts',{'./policy':policyUrl});
const metadataUrl=await transpile('../lib/collection/metadata.ts',{'./sources':sourcesUrl,'./metadata-policy':metadataPolicyUrl});
const imagePolicyUrl=await transpile('../lib/collection/image-recovery-policy.ts',{'./sources':sourcesUrl});
const sources=await import(sourcesUrl);
const imagePolicy=await import(imagePolicyUrl);
const rss=body=>sources.parseRssOrAtom(`<rss><channel><item>${body}</item></channel></rss>`)[0];

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

const sqlite=new DatabaseSync(':memory:');
for(const filename of (await readdir(new URL('../drizzle/',import.meta.url))).filter(name=>name.endsWith('.sql')).sort())sqlite.exec(await readFile(new URL(`../drizzle/${filename}`,import.meta.url),'utf8'));
const columns='id,topic,topic_override AS topicOverride,title,title_override AS titleOverride,summary,image,url,source,published,category,status,status_override AS statusOverride,reason,franchise';
const allArticles=()=>sqlite.prepare(`SELECT ${columns} FROM articles ORDER BY published DESC`).all();
const d1={prepare(sql){return {bind(...args){return {async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}};}};}};
const state={db:d1,feed:'',feedFetches:0};globalThis.__imageRecoveryTest=state;
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
  return new Response('Forbidden',{status:403});
};
try{
  insert('individual');const before=row('individual');
  state.feed=`<rss><channel><item><link>http://www.starwarsnewsnet.com/individual/?utm_source=x</link><title>x</title><description>x</description><pubDate>${recent}</pubDate><content:encoded><![CDATA[<img data-original="https://images.example/individual.jpg">]]></content:encoded></item></channel></rss>`;
  const individual=await recovery.retryArticleImage('individual');assert.equal(individual.ok,true);assert.equal(row('individual').image,'https://images.example/individual.jpg');assert.deepEqual(withoutImage(row('individual')),withoutImage(before),'individual recovery changes only image');

  insert('missing');const missingBefore=row('missing');state.feed='<rss><channel></channel></rss>';
  await assert.rejects(()=>recovery.retryArticleImage('missing'),/이미지를 찾지 못했습니다/);assert.deepEqual(row('missing'),missingBefore,'failed recovery leaves every field unchanged');

  sqlite.exec('DELETE FROM articles');
  for(let i=0;i<25;i++)insert(`batch-${String(i).padStart(2,'0')}`,{status:i%3===0?'review':i%3===1?'excluded':'published',statusOverride:i%2?'excluded':null,topicOverride:i%2?'manual-topic':null});
  insert('old',{published:'2000-01-01'});insert('already',{image:'https://images.example/existing.jpg'});
  state.feed=`<rss><channel>${Array.from({length:25},(_,i)=>`<item><link>https://starwarsnewsnet.com/batch-${String(i).padStart(2,'0')}</link><title>x</title><description>x</description><pubDate>${recent}</pubDate><media:thumbnail url="https://images.example/${i}.jpg"/></item>`).join('')}</channel></rss>`;
  const snapshots=Object.fromEntries(allArticles().map(article=>[article.id,article]));state.feedFetches=0;
  const batch=await recovery.retryMissingArticleImages(100);assert.equal(batch.limit,20);assert.equal(batch.candidates,20);assert.equal(batch.recovered,20);assert.equal(batch.missing,0);assert.equal(batch.failed,0);assert.equal(state.feedFetches,1,'batch fetches each source feed once');
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
const rail=await readFile(new URL('../components/admin/admin-command-rail.tsx',import.meta.url),'utf8');
const story=await readFile(new URL('../components/admin/admin-story-card.tsx',import.meta.url),'utf8');
const sheet=await readFile(new URL('../components/admin/admin-status-sheet.tsx',import.meta.url),'utf8');
const editor=await readFile(new URL('../components/admin/article-image-editor.tsx',import.meta.url),'utf8');
assert.match(service,/retry-missing-images[\s\S]*invalidatePublicNewsCache/);assert.match(service,/retry-image[\s\S]*invalidatePublicNewsCache/);assert.match(service,/set-image[\s\S]*normalizeManualImageUrl[\s\S]*invalidatePublicNewsCache/);
assert.match(api,/getAdminSession/);assert.match(api,/body\.image/);assert.match(rail,/누락 이미지 재조회/);assert.match(story,/ArticleImageEditor/);assert.match(sheet,/ArticleImageEditor/);assert.match(editor,/이미지 재조회/);assert.match(editor,/이미지 URL 수정/);assert.match(editor,/if\(await onSave[\s\S]*setEditing\(false\)/,'failed manual saves keep the editor open');
console.log('Image recovery: parser fallbacks, image-only SQL, individual/batch/manual actions, limits, UI and cache paths passed');
