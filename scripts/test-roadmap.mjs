import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';

async function source(path){return readFile(new URL(path,import.meta.url),'utf8');}

const page=await source('../app/roadmap/page.tsx');
const component=await source('../components/roadmap/roadmap.tsx');
const styles=await source('../components/roadmap/roadmap.module.css');
const data=await source('../lib/roadmap-copy.ts');
const structure=await source('../lib/roadmap.ts');
const footer=await source('../components/navigation/public-footer.tsx');
const newsroom=await source('../app/newsroom.tsx');
const pkg=JSON.parse(await source('../package.json'));
let assertions=0;

await access(new URL('../app/roadmap/page.tsx',import.meta.url));assertions++;
assert.match(page,/Header archive="roadmap"/);assertions++;
assert.match(page,/HOLOCRON ROADMAP/);assertions++;
assert.match(data,/marker:'2026 · NOW',label:'AVAILABLE'/);assertions++;
assert.match(data,/marker:'NEXT',label:'NEXT'/);assertions++;
assert.match(data,/marker:'EXPLORING',label:'FUTURE · 아이디어 단계'/);assertions++;
assert.match(structure,/ROADMAP_STAGE_IDS\.map/);assertions++;
for(const title of ['한국어 스타워즈 뉴스 아카이브','작품 아카이브','데일리 퀴즈']){
  assert.equal((data.match(new RegExp(`title:'${title.replace('/','\\/')}'`,'g'))??[]).length,1,`${title} appears exactly once in AVAILABLE content`);assertions++;
}
for(const title of ['AI Assistant 확장','퀴즈 아카이브 개선','작품 아카이브 정보 확장','뉴스 탐색 경험 개선']){
  assert.match(data,new RegExp(title));assertions++;
}
for(const title of ['캐릭터 / 인물 아카이브','스타워즈 연표','개인 맞춤형 기능','더 깊은 데이터 아카이브']){
  assert.match(data,new RegExp(title));assertions++;
}
assert.match(data,/확정된 출시 계획이 아닌, 장기적으로 검토 중인 아이디어/);assertions++;
assert.match(footer,/href="\/roadmap">로드맵/);assertions++;
assert.match(newsroom,/archive==='roadmap'\?'active':''\} href="\/roadmap">로드맵/);assertions++;
assert.match(newsroom,/PublicFooter tagline=\{copy\.siteFooterTagline\} legal=\{copy\.siteFooterLegal\}/);assertions++;
assert.ok((component.match(/<svg/g)??[]).length>=2,'roadmap uses structural SVG geometry');assertions++;
assert.doesNotMatch(component,/<svg(?![^>]*aria-hidden="true")/,'decorative SVGs are hidden from assistive technology');assertions++;
for(const element of ['main','section','h1','h2','ol','article']){
  assert.match(component,new RegExp(`<${element}(?:[\\s>])`),`${element} semantic element is present`);assertions++;
}
assert.match(styles,/@media\(max-width:1100px\)/);assertions++;
assert.match(styles,/@media\(max-width:820px\)/);assertions++;
assert.match(styles,/@media\(max-width:520px\)/);assertions++;
assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);assertions++;
assert.match(styles,/overflow:clip/);assertions++;
assert.match(styles,/grid-template-columns:minmax\(0,1fr\)/);assertions++;
assert.match(component,/const INTRO_HEIGHT=310/);assertions++;
assert.match(styles,/grid-template-columns:minmax\(0,1fr\) 220px minmax\(0,1fr\)/);assertions++;
assert.match(styles,/\.stageHeader\{[^}]*z-index:3[^}]*height:310px/);assertions++;
assert.doesNotMatch(`${page}\n${component}\n${data}`,/Phase\s*\d|beta_analytics_start_at|QA|migration|GitHub|Sites deployment/i);assertions++;
for(const dependency of ['three','d3','gsap']){
  assert.equal(pkg.dependencies?.[dependency]??pkg.devDependencies?.[dependency],undefined,`${dependency} was not added`);assertions++;
}

console.log(`Public roadmap: ${assertions} assertions passed`);
