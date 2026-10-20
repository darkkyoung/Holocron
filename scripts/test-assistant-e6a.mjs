import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadTestModules} from './test-module-loader.mjs';
import {liveHashes} from './assistant-mvp/live-revision.mjs';
import {localRuntime,audit} from './assistant-eval/local-runtime.mjs';
import {evaluateCase} from './assistant-eval/evaluate.mjs';
import {mockResponse} from './assistant-eval/transport.mjs';
import {MODEL,PROFILE} from './assistant-eval/budget.mjs';

// Dataset validation, not an execution/authorization CLI. Every response below
// is synthetic; no approval, journal, persistent stateDir or API key is read.
const raw=await readFile('evaluation/assistant-mvp/e6a-cases.json');
const dataset=JSON.parse(raw),corpus=JSON.parse(await readFile(dataset.snapshot.path));
const original=JSON.parse(await readFile('evaluation/assistant/cases.json')).cases;
const pilot=JSON.parse(await readFile('evaluation/assistant-mvp/cases.json')).cases;
const sha=value=>createHash('sha256').update(value).digest('hex');
const loaded=await loadTestModules(['lib/assistant/validation.ts','lib/assistant/retrieval.ts','lib/assistant/evidence.ts','lib/assistant/output-validation.ts']);
const retrieval=loaded.modules['lib/assistant/retrieval.ts'],evidence=loaded.modules['lib/assistant/evidence.ts'];
const snapshot={articles:corpus.articles.map(a=>({...a,status:'published'})),works:[],relations:[],asOf:corpus.capturedAt};
const articles=new Map(corpus.articles.map(a=>[a.id,a]));
function selection(c){
 const found=retrieval.retrieveStories(snapshot,{mode:c.mode,query:c.query,filters:c.filters??{}});
 return c.selectedStoryIds.map(id=>{const candidate=found.candidates.find(s=>s.story.topic===id);assert(candidate,`${c.id}: selected Story not retrieved`);return evidence.storyEvidence(candidate.story,found.terms);});
}
function checkCase(c){
 assert.equal(c.origin,'public_archive');assert.equal(c.reviewStatus,'NOT_REVIEWED');assert.equal(c.requiresProvider,true);assert.equal(c.includeDraft,false);
 assert(['qa','script'].includes(c.mode));assert(['MODEL_GENERATION','MODEL_LIMITED_RESPONSE'].includes(c.executionPath));
 assert(original.some(o=>o.id===c.sourceCaseId&&o.origin==='public_archive'));
 for(const field of ['query','label','reviewFocus','dispositionReason'])assert(c[field]?.trim(),`${c.id}: ${field}`);
 for(const field of ['allowedClaims','mandatoryCaveats','forbiddenClaims','speakerAttributionRequirements','certaintyRequirements','dateNumberRestrictions','expectedCitationBehavior','coverage'])assert(c[field]?.length,`${c.id}: ${field}`);
 const selected=selection(c),available=selected.flatMap(s=>s.evidence);
 assert.deepEqual(available.map(a=>a.articleId),c.allowedArticleIds);
 assert.deepEqual(selected.map(s=>({storyId:s.storyId,articleIds:s.evidence.map(a=>a.articleId),omittedArticleCount:s.omittedArticleCount,orderUncertain:s.orderUncertain,independentVerification:s.independentVerification})),c.selectionContract);
 assert(selected.every(s=>s.evidence.length<=3&&!s.independentVerification));
 for(const a of available){assert(c.storyArticlePool.includes(a.articleId));assert(c.selectedStoryIds.includes(a.storyId));assert(a.url);assert.notEqual(a.source.sourceClass,'unclassified');assert(Date.parse(a.published)>=Date.parse(corpus.capturedAt)-90*86400000&&Date.parse(a.published)<=Date.parse(corpus.capturedAt));}
 assert.equal(c.claimSupport.length,c.allowedClaims.length);
 for(const [i,support] of c.claimSupport.entries()){
  const a=available.find(a=>a.articleId===support.articleId);assert(a,`${c.id}: claim outside selected evidence`);
  assert.equal(support.claimIndex,i);assert.equal(support.source,a.source.label);assert(['title','summary'].includes(support.field));
  assert(support.spans.length);assert(support.spans.every(span=>span.length<=140&&span.length>0&&a[support.field].includes(span)));
  // This proves provenance, not entailment or truth of the archived report.
  assert.equal(c.allowedClaims[i],`${a.source.label}의 선택 요약이 전한 내용으로만 귀속: ${support.spans.join('')}`);
 }
 assert.equal(c.evidenceSource.capturedAt,corpus.capturedAt);assert.equal(c.evidenceSource.livePrimaryD1Verified,false);
 assert.equal(c.historicalComparability.countedAsCurrentPass,false);
 return selected;
}
let outbound=0,transportCalls=0,publicGuides=0,publicErrors=0;
const savedFetch=globalThis.fetch;globalThis.fetch=()=>{outbound++;throw Error('REAL_OUTBOUND_FORBIDDEN');};
try{
 for(const [file,digest] of Object.entries(dataset.protectedHashes))assert.equal(sha(await readFile(file)),digest,`${file}: historical bytes changed`);
 const hashes=await liveHashes();assert.equal(hashes.runtimeHash,dataset.runtimeHash);assert.equal(hashes.pipelineHash,dataset.pipelineHash);
 assert.equal(dataset.model,MODEL);assert.equal(dataset.profile,PROFILE);assert.equal(dataset.proposal.authorized,false);
 assert.equal(dataset.snapshot.capturedAt,corpus.capturedAt);assert.equal(dataset.snapshot.windowDays,90);
 assert.deepEqual(dataset.cases.map(c=>c.id),Array.from({length:30},(_,i)=>`P${61+i}`));
 assert.equal(new Set(dataset.cases.map(c=>c.sourceCaseId)).size,30);
 assert.equal(new Set(dataset.cases.map(c=>JSON.stringify([c.mode,c.query,c.selectedStoryIds]))).size,30);
 assert.equal(dataset.cases.filter(c=>c.mode==='qa').length,18);assert.equal(dataset.cases.filter(c=>c.mode==='script').length,12);
 assert.equal(dataset.cases.filter(c=>c.qualityClass==='normal').length,24);
 assert.equal(dataset.cases.filter(c=>c.executionPath==='MODEL_LIMITED_RESPONSE').length,6);
 assert.equal(dataset.cases.filter(c=>c.disposition==='DIRECT_REUSE').length,20);
 assert.equal(dataset.cases.filter(c=>c.disposition==='ADAPT_TO_GUIDE').length,7);
 assert.equal(dataset.cases.filter(c=>c.disposition==='REPLACE').length,3);
 for(const c of dataset.cases)checkCase(c);
 const oldDrafts=original.filter(c=>c.origin==='public_archive'&&c.includeDraft);
 assert.equal(oldDrafts.length,8);assert.deepEqual(dataset.controls[0].basisCaseIds,oldDrafts.map(c=>c.id));
 for(const old of oldDrafts){const c=dataset.cases.find(c=>c.sourceCaseId===old.id);assert.equal(c.mode,'script');assert(['ADAPT_TO_GUIDE','REPLACE'].includes(c.disposition));assert.notEqual(c.query,old.query);assert.match(c.query,/구성/);}
 for(const [id,basis] of [['P61','P41'],['P84','P42'],['P66','P43'],['P74','P44'],['P65','P45'],['P81','P46']]){
  const c=dataset.cases.find(c=>c.id===id),p=pilot.find(c=>c.id===basis);assert.equal(c.basisCaseId,basis);
  for(const key of ['mode','query','instructions','includeDraft','selectedStoryIds'])assert.deepEqual(c[key],p[key]);
 }
 const cost=cases=>cases.reduce((total,c)=>total+dataset.proposal.perCaseReservationMicros[c.mode],0);
 const batch=dataset.proposal.firstBatch.map(id=>dataset.cases.find(c=>c.id===id));
 assert.equal(batch.length,4);assert.equal(batch.filter(c=>c.mode==='qa').length,2);assert.equal(cost(batch),105600);
 const reduced=dataset.cases.filter(c=>!['P61','P64','P69','P74','P77','P89'].includes(c.id));assert.equal(reduced.length,24);assert.equal(reduced.filter(c=>c.mode==='qa').length,16);assert.equal(cost(reduced),576000);
 assert.equal(cost(dataset.cases.filter(c=>!['P61','P74'].includes(c.id))),696000);
 assert.equal(cost(dataset.cases),748800);assert.equal(dataset.history.attempts+batch.length,14);assert.equal(dataset.history.reservedMicros+cost(batch),384000);
 assert.equal(dataset.history.attempts+dataset.cases.length,40);assert.equal(dataset.history.reservedMicros+cost(dataset.cases),1027200);
 assert.equal(dataset.proposal.globalCalls,40);assert.equal(dataset.proposal.globalReservedMicros,2000000);assert.equal(dataset.proposal.automaticContinuation,false);
 // Invalid dataset bindings fail before any mock generation; never edit a frozen file.
 for(const mutate of [c=>c.selectedStoryIds=['missing'],c=>c.allowedArticleIds=['missing'],c=>c.claimSupport[0].spans=['fabricated support'],c=>c.claimSupport[0].articleId='unselected',c=>c.includeDraft=true,c=>c.requiresProvider=false,c=>c.reviewStatus='OWNER_PASS']){
  const c=structuredClone(dataset.cases[0]);mutate(c);assert.throws(()=>checkCase(c));
 }
 const runtime=await localRuntime(),originalModule=runtime.m;let activeCase;
 runtime.m=path=>{const m=originalModule(path);if(path!=='assistant/generate-http')return m;return {...m,handleGenerate:async(req,deps)=>{
  if(activeCase?.scenario==='forged-receipt'){
   const input=await req.clone().json();input.receipt=input.receipt.slice(0,-1)+(input.receipt.endsWith('a')?'b':'a');
   req=new Request(req.url,{method:'POST',headers:req.headers,body:JSON.stringify(input)});
  }
  const response=await m.handleGenerate(req,deps),body=await response.clone().json();
  if(body.error){publicErrors++;assert.doesNotMatch(JSON.stringify(body),/diagnostic|OFFICIAL_PROMOTION|\$\.caveats/);}
  else if(body.mode==='script'){publicGuides++;assert(body.result.caveats.length);assert.deepEqual(body.result.draft,[]);assert(body.result.caveats.every(c=>Object.keys(c).sort().join()==='evidenceIds,text'));}
  return response;
 }};};
 const results=[];
 try{
  for(const c of dataset.cases){activeCase=c;
   const prepared=await evaluateCase(runtime,corpus,c,{mode:'dry-run'});assert.equal(prepared.code,'PREPARED');assert.equal(prepared.providerAttempts,0);assert.equal(prepared.charged,0);
   let mockFailure;
   const result=await evaluateCase(runtime,corpus,c,{mockFetch:async body=>{try{
    transportCalls++;assert.equal(body.text.format.strict,true);assert.equal(body.model,dataset.model);assert.match(body.instructions,/발언자·발언 대상·주장·보도 매체/);
    const data=JSON.parse(body.input[0].content[0].text);assert.equal(data.query,loaded.modules['lib/assistant/validation.ts'].validateRetrieval({mode:c.mode,query:c.query,filters:c.filters},Date.parse(corpus.capturedAt)).query);assert.equal(data.includeDraft,false);
    assert.deepEqual(data.evidence.map(a=>a.articleId),c.allowedArticleIds);
    if(c.mode==='script'){assert.equal(body.text.format.schema.properties.caveats.maxItems,0);assert.match(body.instructions,/caveats는 status와 관계없이 반드시 \[\]/);}
    const envelope=await mockResponse(body,c.id==='P82'?'thin':undefined).json();
    const output=JSON.parse(envelope.output[0].content[0].text);
    if(output.status==='ok'){
     // Deterministic excerpts exercise all relevant sources. NOT a model answer
     // or proof that this output satisfies the human quality criteria.
     const facts=[];
     for(const id of [...new Set(c.claimSupport.map(s=>s.articleId))]){
      const one=structuredClone(body);one.input[0].content[0].text=JSON.stringify({...data,evidence:[data.evidence.find(a=>a.articleId===id)]});
      const part=await mockResponse(one).json(),parsed=JSON.parse(part.output[0].content[0].text);
      facts.push(c.mode==='script'?{...parsed.facts[0],factId:`f${facts.length+1}`}:parsed.answer[0]);
     }
     if(c.mode==='qa')output.answer=facts;else{output.facts=facts;
     output.outline=['보도 소개','근거별 핵심 내용','정보 범위와 마무리'].map(heading=>({heading,factIds:output.facts.map(f=>f.factId),creativeNote:'구성 제안: 출처별 표현을 구분하여 소개한다.'}));
     assert.deepEqual(output.caveats,[]);assert.deepEqual(output.draft,[]);}
    }
    envelope.output[0].content[0].text=JSON.stringify(output);return Response.json(envelope);
   }catch(error){mockFailure=error;throw error;}}});
   if(mockFailure)throw mockFailure;
   assert(c.expectedBehavior.programCodes.includes(result.code),`${c.id}: ${result.code} ${JSON.stringify(result.diagnostic)}`);
   assert.equal(result.providerAttempts,1);assert.equal(result.realOutbound,0);assert.equal(result.charged,c.mode==='qa'?5:7);
   assert.equal(result.reservationMicros,dataset.proposal.perCaseReservationMicros[c.mode]);assert.equal(result.semanticReview,'NOT_REVIEWED');
   if(result.code==='INSUFFICIENT_EVIDENCE'){assert.equal(result.refund.applied,result.charged);assert.equal(result.settlement,'failed');}
   else{assert.equal(result.settlement,'completed');assert.equal(result.refund,null);}
   results.push({id:c.id,code:result.code});
  }
  const countAI=async()=>Number((await runtime.db.prepare("SELECT COUNT(*) AS n FROM credit_ledger WHERE kind IN ('ai_spend','ai_refund')").first()).n);
  const before=await countAI();
  for(const c of dataset.controls.filter(c=>c.id!=='C66')){
   assert.equal(c.requiresProvider,false);activeCase=c;
   // Explicit test-only projection keeps the REAL archive and adds a synthetic
   // boundary condition; it never masquerades as a quality case in the dataset.
   const result=await evaluateCase(runtime,corpus,{...c,origin:'public_archive',filters:{},instructions:''},{mockFetch:()=>{throw Error('CONTROL_MUST_NOT_CALL_PROVIDER');}});
   assert.equal(result.pass,true,`${c.id}: ${result.code}`);assert.equal(result.providerAttempts,0);assert.equal(result.charged,0);
  }
  assert.equal(await countAI(),before);
  const control=dataset.controls.find(c=>c.id==='C66'),selected=selection(control),a=selected[0].evidence[0];assert.equal(a.published,articles.get(a.articleId).published);assert.match(a.published,/^\d{4}-\d{2}-\d{2}$/);assert.equal(a.orderUncertain,false);
  const answer={status:'ok',answer:[{text:'이 소식을 최초로 보도했다.',evidenceIds:[a.evidenceId],certainty:'attributed_report',supports:[{evidenceId:a.evidenceId,field:'title',span:a.title}]}],limitations:[]};
  // Single-article Story has no overlapping publication ranges. The lexical
  // guard does NOT prove a first-report assertion here: record the gap honestly.
  assert.doesNotThrow(()=>loaded.modules['lib/assistant/output-validation.ts'].validateGroundedOutput(answer,control,{evidence:selected}));
  const checked=await audit(runtime,corpus.capturedAt);assert.equal(checked.operationalOutbound,0);assert.equal(transportCalls,30);assert.equal(publicGuides,12);assert(publicErrors>=30);
  assert.equal(outbound,0);
  console.log(JSON.stringify({dataset:30,qa:18,guide:12,uniqueStories:new Set(dataset.cases.flatMap(c=>c.selectedStoryIds)).size,preparations:30,mockResults:results,freeControls:6,ledger:'PASS',replay:'PASS',outbound:0,semanticReview:'NOT_REVIEWED',datasetSha256:sha(raw)}));
 }finally{await runtime.close();}
 console.log('E.6A dataset / CURRENT runtime mock PASS; LIVE NOT AUTHORIZED; actual model quality NOT TESTED.');
}finally{globalThis.fetch=savedFetch;await loaded.dispose();}
