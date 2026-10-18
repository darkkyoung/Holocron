import {readFile,readdir} from 'node:fs/promises';
import {currentHashes} from './fixture.mjs';
import {hash,fail,MODEL,PROFILE} from '../assistant-eval/budget.mjs';
export const HISTORICAL='684dcc5f2af3c706b994c1c73373fa6231ed7c84';
export const SCOPE=Object.freeze({P41:19200,P44:33600});
export const MANIFEST='evaluation/assistant-mvp/live-revision.json';
export async function liveHashes(){
  const files=[];
  async function walk(dir){for(const e of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'))){const p=dir+'/'+e.name;if(e.isDirectory())await walk(p);else if(e.isFile())files.push(p);else fail('UNREVIEWED_RUNTIME_LAYOUT');}}
  for(const dir of ['lib','db','drizzle'])await walk(dir);
  files.push('pnpm-lock.yaml','scripts/test-module-loader.mjs','scripts/sites-env.mjs');
  return {...await currentHashes(),runtimeHash:hash((await Promise.all(files.sort().map(async p=>p+'\n'+await readFile(p,'utf8')))).join('\n'))};
}
export async function loadLiveRevision(){
  const raw=await readFile(MANIFEST,'utf8'),manifest=JSON.parse(raw),hashes=await liveHashes();
  const frozen=JSON.parse(await readFile('evaluation/assistant-mvp/manifest.json','utf8'));
  if(manifest.version!=='E.5B-smoke-v1'||manifest.historicalRevision!==HISTORICAL||manifest.model!==MODEL||manifest.profile!==PROFILE||
    Object.entries(hashes).some(([k,v])=>manifest[k]!==v)||['corpusHash','casesHash','rubricHash'].some(k=>hashes[k]!==frozen[k])||
    JSON.stringify(manifest.scope)!==JSON.stringify(SCOPE))fail('MVP_LIVE_INTEGRITY_FAILED');
  const corpus=JSON.parse(await readFile('evaluation/assistant/public-archive.json','utf8'));
  const {cases}=JSON.parse(await readFile('evaluation/assistant-mvp/cases.json','utf8'));
  const selected=Object.keys(SCOPE).map(id=>cases.find(c=>c.id===id));
  if(selected.some(c=>!c||c.includeDraft||c.stage!=='smoke'||c.expected!=='generate'||c.origin!=='public_archive')||selected[0].mode!=='qa'||selected[1].mode!=='script')fail('INVALID_SMOKE_SCOPE');
  return {manifest,revisionHash:hash(raw),hashes,corpus,cases:selected};
}
