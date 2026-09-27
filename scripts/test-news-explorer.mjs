import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function pure(path){const source=await readFile(new URL(path,import.meta.url),'utf8');const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;return {source,output};}
const presentation=await pure('../lib/news/presentation.ts');
const presentationUrl=`data:text/javascript;base64,${Buffer.from(presentation.output.replace("'../news'","'data:text/javascript,export {}'" )).toString('base64')}`;
const explorer=await pure('../lib/news/explorer.ts');
const explorerOutput=explorer.output.replace("'./presentation'",`'${presentationUrl}'`).replace("'./stories'","'data:text/javascript,export {}'");
const mod=await import(`data:text/javascript;base64,${Buffer.from(explorerOutput).toString('base64')}`);
const article=(id,extra={})=>({id,topic:id,title:`제목 ${id}`,titleOverride:null,summary:`요약 ${id}`,category:'영화',...extra});
const stories=count=>Array.from({length:count},(_,index)=>({topic:`topic-${index}`,orderUncertain:false,articles:[article(String(index))]}));
let assertions=0;
for(const [columns,total,expected] of [[1,5,1],[1,6,2],[1,10,2],[1,11,3],[2,10,1],[2,11,2],[2,20,2],[2,21,3]]){assert.equal(mod.newsPageCount(total,columns),expected);assertions++;}
for(const columns of [1,2]){const all=stories(columns===1?11:21);const pages=mod.newsPageCount(all.length,columns);const ids=Array.from({length:pages},(_,i)=>mod.paginateStories(all,i+1,columns)).flat().map(story=>story.topic);assert.equal(new Set(ids).size,all.length);assert.deepEqual(ids,all.map(story=>story.topic));assertions+=2;}
const grouped={topic:'grouped',orderUncertain:false,articles:[article('a'),article('b')]};
assert.equal(mod.newsPageCount([grouped].length,1),1);assertions++;
const searchable=[grouped,{topic:'override',orderUncertain:false,articles:[article('c',{title:'자동 제목',titleOverride:'아소카 새 소식',summary:'다른 내용',category:'드라마'})]},{topic:'summary',orderUncertain:false,articles:[article('d',{summary:'만달로리안 제작 소식',category:'드라마'})]}];
assert.equal(mod.filterStories(searchable,'','').length,3);assertions++;
assert.equal(mod.filterStories(searchable,'제목 a','').length,1);assertions++;
assert.equal(mod.filterStories(searchable,'아소카','').length,1);assertions++;
assert.equal(mod.filterStories(searchable,'만달로리안','').length,1);assertions++;
assert.equal(mod.filterStories(searchable,'없는 검색','').length,0);assertions++;
assert.equal(mod.filterStories(searchable,'','드라마').length,2);assertions++;
assert.equal(mod.filterStories(searchable,'아소카','드라마').length,1);assertions++;
assert.deepEqual(mod.storyCategories(searchable),['영화','드라마']);assertions++;
const categoryOrderStories=['게임','컬쳐','영화','애니메이션','시리즈'].map((category,index)=>({topic:`order-${index}`,orderUncertain:false,articles:[article(`order-${index}`,{category})]}));
assert.deepEqual(mod.storyCategories(categoryOrderStories),['영화','시리즈','애니메이션','게임','컬쳐']);assertions++;
const component=await readFile(new URL('../components/news/news-archive-explorer.tsx',import.meta.url),'utf8');
assert.match(component,/setQuery\(event\.target\.value\);setPage\(1\)/);assertions++;
assert.match(component,/setCategory\(value\);setPage\(1\)/);assertions++;
assert.match(component,/filterStories\(stories,query,category\)[\s\S]*paginateStories\(filtered,activePage,columns\)/);assertions++;
console.log(`News explorer: ${assertions} assertions passed`);
