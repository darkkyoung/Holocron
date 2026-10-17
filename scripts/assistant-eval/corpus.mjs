import {readFile,readdir} from 'node:fs/promises';
import {hash,fail} from './budget.mjs';
export async function loadCorpus(){
  const names=['public-archive','cases','rubric'],raw=await Promise.all(names.map(n=>readFile(`evaluation/assistant/${n}.json`,'utf8')));
  const pipelineFiles=(await readdir('lib/assistant')).filter(n=>n.endsWith('.ts')).sort();
  const pipeline=await Promise.all(pipelineFiles.map(async n=>n+'\n'+await readFile('lib/assistant/'+n,'utf8')));
  const [corpus,set,rubric]=raw.map(JSON.parse),hashes={corpusHash:hash(raw[0]),casesHash:hash(raw[1]),rubricHash:hash(raw[2]),pipelineHash:hash(pipeline.join('\n'))};
  const manifest=JSON.parse(await readFile('evaluation/assistant/manifest.json','utf8'));
  if(Object.entries(hashes).some(([k,v])=>manifest[k]!==v)||!Number.isFinite(Date.parse(corpus.capturedAt))||corpus.source!=='https://holocron.kr/'||corpus.initialFallback!==false)fail('CORPUS_INTEGRITY_FAILED');
  const fields='category,id,published,source,summary,title,topic,url';
  if(!Array.isArray(corpus.articles)||corpus.articles.length>2000||corpus.articles.some(a=>Object.keys(a).sort().join()!==fields||Object.values(a).some(v=>typeof v!=='string')||!a.id||!a.topic||!/^https:\/\//.test(a.url))||new Set(corpus.articles.map(a=>a.id)).size!==corpus.articles.length)fail('INVALID_PUBLIC_CORPUS');
  if(set.cases.length<30||new Set(set.cases.map(c=>c.id)).size!==set.cases.length)fail('INVALID_CASE_SET');
  for(const c of set.cases){if(!/^[PS][0-9]{2}$/.test(c.id)||!['public_archive','synthetic_adversarial'].includes(c.origin)||!['normal','negative'].includes(c.qualityClass)||!c.allowedClaims?.length||!c.mandatoryCaveats?.length||!c.forbiddenClaims?.length)fail('UNREVIEWED_CASE');}
  return {corpus,cases:set.cases,rubric,hashes};
}
