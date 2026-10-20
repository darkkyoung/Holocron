import {readFile,readdir} from 'node:fs/promises';
import {liveHashes} from '../assistant-mvp/live-revision.mjs';
import {hash,fail,MODEL,PROFILE} from '../assistant-eval/budget.mjs';
import {loadTestModules} from '../test-module-loader.mjs';
export const ID='E.6B-pilot4-v1',DIRECTORY='mvp-pilot4-e6b-v1',MANIFEST='evaluation/assistant-mvp/e6b-revision.json';
export const DATASET='evaluation/assistant-mvp/e6a-cases.json',HISTORICAL='36797d08aab875b709b1a746ba1c48a2e11730a6';
export const SCOPE=Object.freeze({'E6B-P84':19200,'E6B-P66':19200,'E6B-P65':33600,'E6B-P81':33600}),ORDER=Object.freeze(Object.keys(SCOPE));
export const internal=id=>Object.hasOwn(SCOPE,id)?id.slice(4):fail('CASE_NOT_AUTHORIZED');
export const accepted=(id,code)=>{internal(id);return code==='OK'||id==='E6B-P66'&&code==='INSUFFICIENT_EVIDENCE';};
export async function hashes(){
 const files=[];
 for(const dir of ['scripts/assistant-e6b','scripts/assistant-e5j','scripts/assistant-e5h','scripts/assistant-e5f','scripts/assistant-e5d'])for(const n of (await readdir(dir)).filter(n=>n.endsWith('.mjs')).sort())files.push(dir+'/'+n);
 return {...await liveHashes(),datasetHash:hash(await readFile(DATASET)),handoffHash:hash((await Promise.all(files.map(async p=>p+'\n'+await readFile(p,'utf8')))).join('\n'))};
}
export async function revision(){
 const raw=await readFile(MANIFEST,'utf8'),manifest=JSON.parse(raw),actual=await hashes(),dataset=JSON.parse(await readFile(DATASET));
 if(manifest.version!==ID||manifest.sourceRevision!=='b6cde3c50542b20a79264c593104729edbe2ca26'||manifest.historyRevision!==HISTORICAL||manifest.model!==MODEL||manifest.profile!==PROFILE||JSON.stringify(manifest.scope)!==JSON.stringify(SCOPE)||JSON.stringify(manifest.order)!==JSON.stringify(ORDER)||manifest.maxCalls!==4||manifest.maxMicros!==105600||Object.entries(actual).some(([k,v])=>manifest[k]!==v)||actual.datasetHash!=='b5b18bdaae5e02aed01ff02357fdfbeb9edda6bf536e19a030fbd8846cc7254f'||actual.runtimeHash!==dataset.runtimeHash||actual.pipelineHash!==dataset.pipelineHash)fail('E6B_INTEGRITY_FAILED');
 for(const [p,digest] of Object.entries(dataset.protectedHashes))if(hash(await readFile(p))!==digest)fail('E6B_INTEGRITY_FAILED');
 const cases=ORDER.map(id=>dataset.cases.find(c=>c.id===internal(id)));
 if(cases.some(c=>!c||c.includeDraft||c.expected!=='generate'||c.origin!=='public_archive'||c.reviewStatus!=='NOT_REVIEWED')||JSON.stringify(cases.map(c=>c.mode))!==JSON.stringify(['qa','qa','script','script']))fail('INVALID_CASES');
 const loaded=await loadTestModules(['lib/assistant/provider-profile.ts','lib/assistant/cost.ts']);
 try{for(const [i,id] of ORDER.entries()){const p=loaded.modules['lib/assistant/provider-profile.ts'].providerProfile(PROFILE,i<2?'qa':'planner');if(p.model!==MODEL||p.cost.inputMicrosPerMillion!==750000||p.cost.outputMicrosPerMillion!==4500000||loaded.modules['lib/assistant/cost.ts'].reserveCost(p.cost)!==SCOPE[id])fail('MODEL_PROFILE_MISMATCH');}}finally{await loaded.dispose();}
 return {manifest,hash:hash(raw),cases,corpus:JSON.parse(await readFile('evaluation/assistant/public-archive.json'))};
}
