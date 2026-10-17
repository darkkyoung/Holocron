// Explicit offline extractor for a GET https://holocron.kr/ response. Never eval JS,
// call admin/backup, follow publisher URLs or collect account/Credit payloads.
import {readFile,writeFile} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
import {hash,fail} from './budget.mjs';
export function extractPublic(html,capturedAt){
  let projection;
  function visit(value){
    if(!value||typeof value!=='object')return;
    if(Array.isArray(value)){value.forEach(visit);return;}
    if(Array.isArray(value.stories)&&Array.isArray(value.workOptions)){
      if(projection)fail('AMBIGUOUS_PUBLIC_PROJECTION');projection=value;
    }
    Object.values(value).forEach(visit);
  }
  for(const match of html.matchAll(/\.rsc\.push\(("(?:[^"\\]|\\.)*")\)/g)){
    for(const line of JSON.parse(match[1]).split('\n')){let row;try{row=JSON.parse(line.slice(line.indexOf(':')+1));}catch{continue;}visit(row);}
  }
  if(!projection||projection.initial!==false||!projection.stories.length||projection.stories.some(s=>!s.articles.length||s.articles.some(a=>a.status!=='published'||a.topic!==s.topic))||!Number.isFinite(Date.parse(capturedAt)))fail('PUBLIC_PROJECTION_UNAVAILABLE');
  return {version:'public-home-'+capturedAt.slice(0,10)+'-v1',capturedAt,source:'https://holocron.kr/',sourceSha256:hash(html),initialFallback:false,
    scope:'Public Newsroom RSC Story projection. Effective titles only. Article-level Work relations unavailable; public cases use lexical retrieval. Not a current primary D1 snapshot.',
    articles:projection.stories.flatMap(s=>s.articles.map(a=>({id:a.id,topic:a.topic,title:a.titleOverride||a.title,summary:a.summary,url:a.url,source:a.source,published:a.published,category:a.category}))),
    publicStoryWorkProjection:projection.stories.map(s=>({storyId:s.topic,workIds:s.workIds??[]})),publicWorkOptions:projection.workOptions.map(({id,title,count})=>({id,title,count}))};
}
if(import.meta.url===new URL(process.argv[1],'file:').href){
  try{const [input,output,capturedAt,...extra]=process.argv.slice(2);if(extra.length||!input||!output||!isAbsolute(output))fail('USAGE_INPUT_HTML_ABSOLUTE_OUTPUT_CAPTURED_AT');
    const corpus=extractPublic(await readFile(input,'utf8'),capturedAt);await writeFile(output,JSON.stringify(corpus,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({articles:corpus.articles.length,sourceSha256:corpus.sourceSha256}));
  }catch(e){console.error(/^[A-Z_]+$/.test(e.message)?e.message:'PUBLIC_IMPORT_FAILED');process.exitCode=1;}
}
