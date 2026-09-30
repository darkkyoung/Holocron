import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

async function source(path){return readFile(new URL(path,import.meta.url),'utf8');}
const header=await source('../app/newsroom.tsx');
const footer=await source('../components/navigation/public-footer.tsx');
const tracker=await source('../components/analytics/page-view-tracker.tsx');
const pages=await Promise.all(['../app/page.tsx','../app/works/page.tsx','../app/quiz/page.tsx'].map(source));
const roadmapPage=await source('../app/roadmap/page.tsx');
let assertions=0;

assert.doesNotMatch(header,/import Link from 'next\/link'/);assertions++;
assert.match(header,/Sites\/Vinext currently throws during next\/link transitions/);assertions++;
for(const [href,label] of [['/','뉴스 아카이브'],['/works','작품 아카이브'],['/quiz','퀴즈'],['/roadmap','로드맵']]){
  assert.match(header,new RegExp(`href="${href}"[^>]*>${label}|href="${href}"[^>]*>퀴즈`));assertions++;
}
for(const route of ['news','works','quiz','roadmap']){assert.match(header,new RegExp(`archive==='${route}'\\?'active':''`));assertions++;}
assert.doesNotMatch(footer,/next\/link|<Link/);assertions++;
assert.match(footer,/<a className="footer-brand" href="\/">HOLOCRON<\/a>/);assertions++;
assert.match(footer,/<a href="\/roadmap">로드맵<\/a>/);assertions++;
assert.match(tracker,/lastSent\.current===route/);assertions++;
assert.match(tracker,/lastSent\.current=route/);assertions++;
assert.doesNotMatch(tracker,/sent\.current=true/);assertions++;
for(const page of pages){assert.match(page,/PageViewTracker route=/);assertions++;}
assert.match(roadmapPage,/<Header archive="roadmap"/);assertions++;
assert.doesNotMatch(header,/admin-link|href="\/admin\/login"/);assertions++;

console.log(`Public navigation: ${assertions} assertions passed`);
