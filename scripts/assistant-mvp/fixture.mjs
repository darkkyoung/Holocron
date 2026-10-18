import {readFile,readdir} from 'node:fs/promises';
import {hash,fail,MODEL,PROFILE} from '../assistant-eval/budget.mjs';
export const DIRECTORY='evaluation/assistant-mvp';
export async function currentHashes(){
  const read=path=>readFile(path,'utf8');
  const pipeline=(await readdir('lib/assistant')).filter(n=>n.endsWith('.ts')).sort();
  const tooling=[];
  for(const folder of ['scripts/assistant-eval','scripts/assistant-mvp'])for(const name of (await readdir(folder)).filter(n=>n.endsWith('.mjs')).sort())tooling.push(folder+'/'+name);
  return {corpusHash:hash(await read('evaluation/assistant/public-archive.json')),casesHash:hash(await read(DIRECTORY+'/cases.json')),rubricHash:hash(await read(DIRECTORY+'/rubric.json')),
    pipelineHash:hash((await Promise.all(pipeline.map(async n=>n+'\n'+await read('lib/assistant/'+n)))).join('\n')),
    toolingHash:hash((await Promise.all(tooling.map(async n=>n+'\n'+await read(n)))).join('\n'))};
}
export async function loadMvp(){
  const hashes=await currentHashes(),manifest=JSON.parse(await readFile(DIRECTORY+'/manifest.json','utf8'));
  if(Object.entries(hashes).some(([k,v])=>manifest[k]!==v)||manifest.model!==MODEL||manifest.profile!==PROFILE)fail('MVP_INTEGRITY_FAILED');
  // Reuse exactly the reviewed public projection, never a private backup or fresh Production read.
  if(hashes.corpusHash!=='acd78cd254bc8bb716bbf4f3bafb87bd6e2d3e1dab4618f8b63faff4bc9cce48')fail('UNREVIEWED_PUBLIC_CORPUS');
  const corpus=JSON.parse(await readFile('evaluation/assistant/public-archive.json','utf8'));
  const {cases}=JSON.parse(await readFile(DIRECTORY+'/cases.json','utf8'));
  const paid=cases.filter(c=>c.expected==='generate');
  if(paid.length!==6||paid.some(c=>c.includeDraft||c.origin!=='public_archive')||paid.filter(c=>c.mode==='qa').length!==3||paid.filter(c=>c.mode==='script').length!==3||paid.filter(c=>c.stage==='smoke').map(c=>c.id).join()!=='P41,P44')fail('INVALID_MVP_SCOPE');
  return {corpus,cases,hashes,manifest};
}
