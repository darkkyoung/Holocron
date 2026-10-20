import {readFile,readdir} from 'node:fs/promises';
import {liveHashes} from '../assistant-mvp/live-revision.mjs';
import {hash,fail,MODEL,PROFILE} from '../assistant-eval/budget.mjs';
import {loadTestModules} from '../test-module-loader.mjs';
export const ID='E.5H-p44-v1',DIRECTORY='mvp-p44-e5h-v1',MANIFEST='evaluation/assistant-mvp/e5h-revision.json';
export const SCOPE=Object.freeze({'E5H-P44':33600});
export const internal=id=>Object.hasOwn(SCOPE,id)?id.slice(4):fail('CASE_NOT_AUTHORIZED');
export async function hashes(){
 const files=[];
 for(const dir of ['scripts/assistant-e5h','scripts/assistant-e5f','scripts/assistant-e5d'])for(const n of (await readdir(dir)).filter(n=>n.endsWith('.mjs')).sort())files.push(dir+'/'+n);
 return {...await liveHashes(),handoffHash:hash((await Promise.all(files.map(async p=>p+'\n'+await readFile(p,'utf8')))).join('\n'))};
}
export async function revision(){
 const raw=await readFile(MANIFEST,'utf8'),manifest=JSON.parse(raw),actual=await hashes(),e4=JSON.parse(await readFile('evaluation/assistant-mvp/manifest.json'));
 if(manifest.sourceRevision!=='bcadc2caf8b3431c50addc5c5bfbb10f3cfbd4aa'||manifest.version!==ID||manifest.model!==MODEL||manifest.profile!==PROFILE||manifest.historyRevision!=='1512d95de440db812c4b051dcc9a7372f2333ccc'||JSON.stringify(manifest.scope)!==JSON.stringify(SCOPE)||manifest.maxCalls!==1||manifest.maxMicros!==33600||Object.entries(actual).some(([k,v])=>manifest[k]!==v)||['corpusHash','casesHash','rubricHash'].some(k=>actual[k]!==e4[k]))fail('E5H_INTEGRITY_FAILED');
 const loaded=await loadTestModules(['lib/assistant/provider-profile.ts','lib/assistant/cost.ts']);
 try{for(const [id,action] of [['E5H-P44','planner']]){const p=loaded.modules['lib/assistant/provider-profile.ts'].providerProfile(PROFILE,action);if(p.model!==MODEL||p.cost.inputMicrosPerMillion!==750000||p.cost.outputMicrosPerMillion!==4500000||loaded.modules['lib/assistant/cost.ts'].reserveCost(p.cost)!==SCOPE[id])fail('MODEL_PROFILE_MISMATCH');}}finally{await loaded.dispose();}
 const {cases}=JSON.parse(await readFile('evaluation/assistant-mvp/cases.json'));
 const selected=Object.keys(SCOPE).map(id=>cases.find(c=>c.id===internal(id)));
 if(selected.some(c=>!c||c.includeDraft||c.expected!=='generate'||c.origin!=='public_archive'))fail('INVALID_CASES');
 return {manifest,hash:hash(raw),cases:selected,corpus:JSON.parse(await readFile('evaluation/assistant/public-archive.json'))};
}
