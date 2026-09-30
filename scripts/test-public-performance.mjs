import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

async function source(path){return readFile(new URL(path,import.meta.url),'utf8');}

const news=await source('../lib/news.ts');
const archive=await source('../lib/news/archive.ts');
const cache=await source('../lib/public-cache.ts');
const admin=await source('../lib/admin/service.ts');
const scheduler=await source('../app/api/scheduled/collect/route.ts');
const siteCopy=await source('../lib/site-copy-repository.ts');
const roadmapCopy=await source('../lib/roadmap-copy-repository.ts');
const works=await source('../lib/works/service.ts');
const worksAdminPage=await source('../app/admin/works/page.tsx');
const siteCopyAdminPage=await source('../app/admin/site-copy/page.tsx');
const roadmapCopyAdminPage=await source('../app/admin/roadmap/page.tsx');
const siteCopyApi=await source('../app/api/admin/site-copy/route.ts');
const roadmapCopyApi=await source('../app/api/admin/roadmap-copy/route.ts');
const publicPages=await Promise.all(['../app/page.tsx','../app/works/page.tsx','../app/quiz/page.tsx','../app/roadmap/page.tsx'].map(source));
const quizService=await source('../lib/quiz/service.ts');
const overridePolicy=await source('../lib/admin/override-policy.ts');
const adminRepository=await source('../lib/admin/repository.ts');
const layout=await source('../app/layout.tsx');
const storyCard=await source('../components/news/story-card.tsx');
const workCard=await source('../components/works/work-card.tsx');
const quizImage=await source('../components/quiz/image-crop-control.tsx');
let assertions=0;

assert.match(news,/listPublicArticlesSince/);assertions++;
assert.match(news,/WHERE status='published' AND published>=\?/);assertions++;
assert.match(news,/ORDER BY published DESC/);assertions++;
assert.match(news,/topic_override AS topicOverride/);assertions++;
assert.match(news,/title_override AS titleOverride/);assertions++;
assert.match(news,/status_override AS statusOverride/);assertions++;
assert.match(archive,/90\*24\*60\*60\*1000/);assertions++;
assert.match(archive,/Promise\.all\(\[listPublicArticlesSince/);assertions++;
assert.match(archive,/unstable_cache/);assertions++;
assert.match(archive,/revalidate:PUBLIC_NEWS_CACHE_SECONDS/);assertions++;
assert.match(cache,/PUBLIC_NEWS_CACHE_SECONDS=60/);assertions++;
assert.match(cache,/revalidateTag\(PUBLIC_NEWS_CACHE_TAG,\{expire:0\}\)/);assertions++;
for(const name of ['SITE_COPY','ROADMAP_COPY','WORKS']){
  assert.match(cache,new RegExp(`PUBLIC_${name}_CACHE_SECONDS=60`));assertions++;
  assert.match(cache,new RegExp(`PUBLIC_${name}_CACHE_TAG='public-[^']+-v1'`));assertions++;
  assert.match(cache,new RegExp(`revalidateTag\\(PUBLIC_${name}_CACHE_TAG,\\{expire:0\\}\\)`));assertions++;
}
for(const mutation of ['seedNews','runCollection','retryFailedAiArticles','saveSourceEnabledState','persistArticleTitleOverride','persistAdminPatches']){
  assert.match(admin,new RegExp(`${mutation}[\\s\\S]{0,220}invalidatePublicNewsCache`),`${mutation} invalidates public News`);assertions++;
}
assert.match(scheduler,/runCollection\('scheduled'\)[\s\S]{0,120}invalidatePublicNewsCache/);assertions++;
for(const [repository,tag,seconds,invalidate] of [
  [siteCopy,'PUBLIC_SITE_COPY_CACHE_TAG','PUBLIC_SITE_COPY_CACHE_SECONDS','invalidatePublicSiteCopyCache'],
  [roadmapCopy,'PUBLIC_ROADMAP_COPY_CACHE_TAG','PUBLIC_ROADMAP_COPY_CACHE_SECONDS','invalidatePublicRoadmapCopyCache'],
]){
  assert.match(repository,/unstable_cache/);assertions++;
  assert.match(repository,new RegExp(`revalidate:${seconds}[\\s\\S]*tags:\\[${tag}\\]`));assertions++;
  assert.equal((repository.match(new RegExp(`${invalidate}\\(\\)`,'g'))??[]).length,2,'save and reset invalidate cached public copy');assertions++;
}
assert.match(works,/const loadPublicWorks=unstable_cache\(listWorks/);assertions++;
assert.match(works,/revalidate:PUBLIC_WORKS_CACHE_SECONDS[\s\S]*tags:\[PUBLIC_WORKS_CACHE_TAG\]/);assertions++;
for(const mutation of ['changeWorkStatus','createManagedWork','updateManagedWork','deleteManagedWork']){
  assert.match(works,new RegExp(`${mutation}[\\s\\S]{0,420}invalidatePublicWorksCache`),`${mutation} invalidates public Works`);assertions++;
}
assert.match(works,/if\(changed\)invalidatePublicWorksCache\(\)/);assertions++;
assert.match(works,/getWorksManagementState\(\)\{return projectWorks\(await listWorks\(\)\)/);assertions++;
assert.doesNotMatch(worksAdminPage,/getWorksArchive/);assertions++;
for(const adminSource of [siteCopyAdminPage,siteCopyApi]){assert.match(adminSource,/loadSiteCopyFresh/);assertions++;}
for(const adminSource of [roadmapCopyAdminPage,roadmapCopyApi]){assert.match(adminSource,/loadRoadmapCopyFresh/);assertions++;}
for(const page of publicPages){assert.match(page,/export const dynamic='force-dynamic'/);assertions++;}
assert.doesNotMatch(quizService,/unstable_cache|cacheLife/);assertions++;
assert.match(overridePolicy,/status:published\?'published':'excluded'[\s\S]*statusOverride:published\?'published':'excluded'/);assertions++;
assert.match(adminRepository,/UPDATE articles SET status=\?, status_override=\?/);assertions++;
assert.doesNotMatch(layout,/codex-preview/);assertions++;
assert.match(storyCard,/decoding="async"/);assertions++;
assert.match(workCard,/loading=\{featured\?'eager':'lazy'\}/);assertions++;
assert.match(quizImage,/loading=\{aspect==='wide'\?'eager':'lazy'\}/);assertions++;

console.log(`Public performance safeguards: ${assertions} assertions passed`);
