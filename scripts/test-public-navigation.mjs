import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

async function source(path){return readFile(new URL(path,import.meta.url),'utf8');}
const header=await source('../app/newsroom.tsx');
const footer=await source('../components/navigation/public-footer.tsx');
const tracker=await source('../components/analytics/page-view-tracker.tsx');
const pages=await Promise.all(['../app/page.tsx','../app/works/page.tsx','../app/quiz/page.tsx'].map(source));
let assertions=0;

assert.match(header,/import Link from 'next\/link'/);assertions++;
assert.match(header,/admin\?<a[\s\S]*:<Link/);assertions++;
assert.match(header,/prefetch=\{false\}/);assertions++;
for(const [href,label] of [['/','뉴스 아카이브'],['/works','작품 아카이브'],['/quiz','퀴즈'],['/roadmap','로드맵']]){
  assert.match(header,new RegExp(`internalLink\\('${href.replace('/','\\/')}'[\\s\\S]{0,80}${label}`));assertions++;
}
for(const route of ['news','works','quiz','roadmap']){assert.match(header,new RegExp(`archive==='${route}'\\?'active':''`));assertions++;}
assert.match(footer,/prefetch=\{false\}/);assertions++;
assert.match(tracker,/lastSent\.current===route/);assertions++;
assert.match(tracker,/lastSent\.current=route/);assertions++;
assert.doesNotMatch(tracker,/sent\.current=true/);assertions++;
for(const page of pages){assert.match(page,/PageViewTracker route=/);assertions++;}
assert.match(header,/<a className="admin-link" href="\/admin\/login">/);assertions++;

console.log(`Public navigation: ${assertions} assertions passed`);
