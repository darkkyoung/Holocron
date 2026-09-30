import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

async function source(path){return readFile(new URL(path,import.meta.url),'utf8');}

const component=await source('../components/background/public-geometry.tsx');
const styles=await source('../components/background/public-geometry.module.css');
const assistantStyles=await source('../components/news/ai-assistant-placeholder.module.css');
const roadmap=await source('../components/roadmap/roadmap.tsx');
const pages=await Promise.all(['../app/page.tsx','../app/works/page.tsx','../app/quiz/page.tsx'].map(source));
let assertions=0;

for(const [page,variant] of pages.map((page,index)=>[page,['news','works','quiz'][index]])){
  assert.match(page,new RegExp(`<PublicGeometry variant="${variant}">`));assertions++;
}
assert.match(component,/aria-hidden="true"/);assertions++;
assert.match(component,/focusable="false"/);assertions++;
assert.ok(component.indexOf('<g className={styles.stars}>')<component.indexOf('<g className={styles.heroGeometry}>'));assertions++;
assert.match(component,/className=\{styles\.starWarm\}/);assertions++;
assert.match(styles,/\.geometry\{[^}]*pointer-events:none/);assertions++;
assert.match(styles,/\.page\{[^}]*overflow:clip/);assertions++;
assert.match(styles,/\.stars\{fill:#cbd4df;opacity:\.13\}/);assertions++;
assert.match(styles,/\.stars circle:nth-child\(n\+15\),[^}]*\{display:none\}/);assertions++;
assert.match(styles,/@media\(max-width:820px\)/);assertions++;
assert.match(styles,/@media\(max-width:550px\)/);assertions++;
assert.match(assistantStyles,/@media \(min-width: 821px\)[\s\S]*?width: 76px;[\s\S]*?height: 76px;/);assertions++;
assert.match(assistantStyles,/@media \(max-width: 550px\)[\s\S]*?width:48px;height:48px/);assertions++;
assert.match(roadmap,/function CelestialBackdrop\(\)/);assertions++;
assert.doesNotMatch(component,/['"]use client['"]|canvas|requestAnimationFrame|three|d3|gsap/i);assertions++;

console.log(`Public celestial geometry: ${assertions} assertions passed`);
