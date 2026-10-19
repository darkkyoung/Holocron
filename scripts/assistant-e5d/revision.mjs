import {readFile,readdir} from 'node:fs/promises';
import {liveHashes} from '../assistant-mvp/live-revision.mjs';
import {hash,fail,MODEL,PROFILE} from '../assistant-eval/budget.mjs';
import {loadTestModules} from '../test-module-loader.mjs';
export const ID='E.5D-smoke-v1',DIRECTORY='mvp-smoke-e5d-v1',MANIFEST='evaluation/assistant-mvp/e5d-revision.json';
export const SCOPE=Object.freeze({'E5D-P41':19200,'E5D-P44':33600});
export const internal=id=>Object.hasOwn(SCOPE,id)?id.slice(4):fail('CASE_NOT_AUTHORIZED');
export async function hashes(){
 const files=(await readdir('scripts/assistant-e5d')).filter(n=>n.endsWith('.mjs')).sort();
 return {...await liveHashes(),handoffHash:hash((await Promise.all(files.map(async n=>n+'\n'+await readFile('scripts/assistant-e5d/'+n,'utf8')))).join('\n'))};
}
export async function revision(){
 const raw=await readFile(MANIFEST,'utf8'),manifest=JSON.parse(raw),actual=await hashes(),e4=JSON.parse(await readFile('evaluation/assistant-mvp/manifest.json'));
 if(manifest.version!==ID||manifest.model!==MODEL||manifest.profile!==PROFILE||manifest.historyRevision!=='be6965ab058291b107b5767201e400386829e5c7'||JSON.stringify(manifest.scope)!==JSON.stringify(SCOPE)||manifest.maxCalls!==2||manifest.maxMicros!==52800||Object.entries(actual).some(([k,v])=>manifest[k]!==v)||['corpusHash','casesHash','rubricHash'].some(k=>actual[k]!==e4[k]))fail('E5D_INTEGRITY_FAILED');
 const loaded=await loadTestModules(['lib/assistant/provider-profile.ts','lib/assistant/cost.ts']);
 try{for(const [id,action] of [['E5D-P41','qa'],['E5D-P44','planner']]){const p=loaded.modules['lib/assistant/provider-profile.ts'].providerProfile(PROFILE,action);if(p.model!==MODEL||p.cost.inputMicrosPerMillion!==750000||p.cost.outputMicrosPerMillion!==4500000||loaded.modules['lib/assistant/cost.ts'].reserveCost(p.cost)!==SCOPE[id])fail('MODEL_PROFILE_MISMATCH');}}finally{await loaded.dispose();}
 const {cases}=JSON.parse(await readFile('evaluation/assistant-mvp/cases.json'));
 const selected=Object.keys(SCOPE).map(id=>cases.find(c=>c.id===internal(id)));
 if(selected.some(c=>!c||c.includeDraft||c.expected!=='generate'||c.origin!=='public_archive'))fail('INVALID_CASES');
 return {manifest,hash:hash(raw),cases:selected,corpus:JSON.parse(await readFile('evaluation/assistant/public-archive.json'))};
}
