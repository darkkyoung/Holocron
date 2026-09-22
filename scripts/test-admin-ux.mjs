import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function source(path){return readFile(new URL(path,import.meta.url),'utf8');}
async function loadPureModule(path){
  const output=ts.transpileModule(await source(path),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const {buildStories}=await loadPureModule('../lib/news/stories.ts');
const {buildAdminPatches}=await loadPureModule('../lib/admin/override-policy.ts');
const newsroom=await source('../app/newsroom.tsx');
const adminPanel=await source('../app/admin/panel.tsx');
const adminStory=await source('../components/admin/admin-story-card.tsx');
const statusSheet=await source('../components/admin/admin-status-sheet.tsx');
const adminCss=await source('../components/admin/admin.css');
const adminPage=await source('../app/admin/page.tsx');
const manageRoute=await source('../app/api/manage/route.ts');

assert.doesNotMatch(newsroom,/AdminStoryCard|admin-selection-toolbar|주제 전체 선택/,'public archive has no administrator controls');
assert.match(adminPanel,/buildStories\(articles,projectionNow\)/,'admin uses the shared story projection');
assert.match(adminStory,/<StoryCard story=\{story\}/,'admin uses the shared public StoryCard');

const now=Date.parse('2026-09-22T00:00:00Z');
const article=(id,topic,published,status='published')=>({id,topic,published,status,title:`title-${id}`,source:`source-${id}`,url:`https://example.com/${id}`});
const members=[article('later','topic-a','2026-09-21T12:00:00Z'),article('representative','topic-a','2026-09-20T12:00:00Z')];
const publicStories=buildStories(members,now);
const adminStories=buildStories(members,now);
assert.deepEqual(adminStories,publicStories,'public and admin story/topic structures are identical');
assert.equal(adminStories[0].articles[0].id,'representative','admin representative is the public earliest representative');
assert.match(adminStory,/article\.title[\s\S]*article\.source[\s\S]*article\.published|article\.source[\s\S]*article\.published[\s\S]*article\.title/,'topic members expose title, source and date');
assert.match(adminStory,/대표/,'representative is explicitly labeled');

const apply=(rows,patches)=>rows.map(row=>{const patch=patches.find(value=>value.id===row.id);if(!patch)return row;return patch.kind==='topic'?{...row,topic:patch.topic,topicOverride:patch.topicOverride}:{...row,status:patch.status,statusOverride:patch.statusOverride,reason:patch.reason};});
const separate=[article('a','a','2026-09-21T12:00:00Z'),article('b','b','2026-09-20T12:00:00Z')];
const merged=apply(separate,buildAdminPatches('merge',['a','b'],'manual-topic'));
assert.equal(buildStories(merged,now).length,1,'merge is reflected as one story card');
const split=apply(merged,buildAdminPatches('split',['a','b']));
assert.equal(buildStories(split,now).length,2,'split is reflected as independent story cards');
const excluded=apply(separate,buildAdminPatches('exclude',['a']));
assert.deepEqual(buildStories(excluded,now).flatMap(story=>story.articles.map(item=>item.id)),['b'],'excluded article leaves the admin public archive');
assert.match(statusSheet,/status==='excluded'|article\.status===status/,'excluded items are projected into the status sheet');
const restored=apply(excluded,buildAdminPatches('restore',['a']));
assert.equal(buildStories(restored,now).flatMap(story=>story.articles).length,2,'restore returns an article to the archive');
const reviewed=[article('review','review-topic','2026-09-21T12:00:00Z','review')];
assert.equal(buildStories(apply(reviewed,buildAdminPatches('publish-review',['review'])),now).length,1,'review publish returns an article to the archive');
assert.match(adminPage,/requireAdminSession/,'unauthenticated admin access remains server protected');
assert.match(manageRoute,/getAdminSession/,'management API retains the session guard');
assert.match(adminCss,/@media\(max-width:820px\)[\s\S]*admin-status-sheet\{width:100vw/,'mobile uses a full-width management sheet');
assert.match(adminPanel,/className="news-grid admin-news-grid"/,'administrator archive reuses the responsive public card grid');
console.log('Administrator mode UX: 15 assertions passed');
