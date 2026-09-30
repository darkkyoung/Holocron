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
const works=await source('../lib/works/repository.ts');
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
for(const mutation of ['seedNews','runCollection','retryFailedAiArticles','saveSourceEnabledState','persistArticleTitleOverride','persistAdminPatches']){
  assert.match(admin,new RegExp(`${mutation}[\\s\\S]{0,220}invalidatePublicNewsCache`),`${mutation} invalidates public News`);assertions++;
}
assert.match(scheduler,/runCollection\('scheduled'\)[\s\S]{0,120}invalidatePublicNewsCache/);assertions++;
assert.doesNotMatch(siteCopy,/unstable_cache|cacheLife/);assertions++;
assert.doesNotMatch(roadmapCopy,/unstable_cache|cacheLife/);assertions++;
assert.doesNotMatch(works,/unstable_cache|cacheLife/);assertions++;
assert.doesNotMatch(layout,/codex-preview/);assertions++;
assert.match(storyCard,/decoding="async"/);assertions++;
assert.match(workCard,/loading=\{featured\?'eager':'lazy'\}/);assertions++;
assert.match(quizImage,/loading=\{aspect==='wide'\?'eager':'lazy'\}/);assertions++;

console.log(`Public performance safeguards: ${assertions} assertions passed`);
