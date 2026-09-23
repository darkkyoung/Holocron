import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const component=await readFile(new URL('../components/news/story-card.tsx',import.meta.url),'utf8');
const styles=await readFile(new URL('../components/news/story-card.module.css',import.meta.url),'utf8');

assert.doesNotMatch(component,/개 출처 펼치기|className=\{styles\.toggle\}/,'visible source-count toggle is removed');
assert.doesNotMatch(styles,/\.toggle\b/,'obsolete floating toggle styles are removed');
assert.match(component,/className=\{styles\.edge\}/,'vertical source edge remains');
assert.match(component,/onPointerEnter=\{event => \{ if \(event\.pointerType === 'mouse' && canHover\(\)\) \{ setExpanded\(true\)/,'desktop edge hover still expands the stack');
assert.match(component,/onClick=\{\(\) => \{[\s\S]*root\.current\?\.focus[\s\S]*setExpanded\(true\)/,'mobile first tap moves focus to the persistent root and expands');
assert.match(component,/<button type="button" className=\{styles\.edge\} aria-expanded=\{expanded\}/,'source edge remains a keyboard-operable button');
assert.match(component,/event\.key === 'Escape'[\s\S]*close\(true\)/,'Escape still collapses and returns focus safely');
assert.match(component,/tabIndex=\{-1\}/,'story root is the replacement programmatic focus anchor');
assert.match(component,/href=\{article\.url\}[\s\S]*target="_blank"/,'each article keeps its original link');
assert.match(component,/group-count[\s\S]*<Layers3 size=\{13\}/,'small grouped-source count badge remains');
assert.match(component,/const \[representative, \.\.\.related\] = story\.articles/,'single-source stories naturally render without secondary edges');
assert.match(styles,/@media \(max-width: 820px\)[\s\S]*story\[data-expanded='true'\] \.layer/,'mobile expanded cards remain full-width');
console.log('Story stack interaction: 12 assertions passed');
