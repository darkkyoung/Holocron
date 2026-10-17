import {randomUUID} from 'node:crypto';
import {seedCorpus,syntheticCorpus,secrets,request} from './local-runtime.mjs';
import {checkWire,mockResponse} from './transport.mjs';
import {PROFILE,fail} from './budget.mjs';
/** Executes existing HTTP/service/domain/repository contracts with local D1.
 * The only injected AI behavior is the outbound HTTP transport. */
export async function evaluateCase(runtime,corpus,c,{mode='mock',budget,liveKey,liveFetch=globalThis.fetch,mockFetch,onResult,signal}={}){
  if(!['dry-run','mock','live'].includes(mode))fail('INVALID_MODE');
  if(mode==='live'&&(!budget||!liveKey))fail('LIVE_AUTHORIZATION_REQUIRED');
  const {db,m,credit}=runtime,start=Date.now();let offset=0;
  const clock=()=>Date.parse(corpus.capturedAt)+(Date.now()-start)+offset;
  const data=c.origin==='public_archive'?{articles:corpus.articles,works:[],relations:[]}:syntheticCorpus(c.scenario,corpus.capturedAt);
  await seedCorpus(db,data.articles,data.works,data.relations);
  const account=await m('identity/repository').createAccount(db,new Date(clock()));
  const funding=c.scenario==='insufficient-credit'?4:100;
  await credit.credit({owner:account.owner,amount:funding,kind:'reward',idempotencyKey:'evaluation-fixture-funding'});
  let cookie=(await m('identity/account-session').issueAccountSession(account.userId,secrets.identitySecrets.account,clock())).split(';')[0];
  if(c.scenario==='guest')cookie=(await m('identity/service').createGuest(db,secrets.identitySecrets.guest,clock())).setCookie.split(';')[0];
  const deps={...secrets,enabled:true,profileId:PROFILE,apiKey:mode==='live'?liveKey:'synthetic-evaluation-NOT-A-REAL-KEY',network:()=> 'synthetic-network-'+c.id,database:()=>db,now:clock};
  const retrieve=await m('assistant/http').handleRetrieve(request('/api/assistant/retrieve',{mode:c.mode,query:c.query,filters:c.filters},cookie),deps);
  const found=await retrieve.json();
  const basic={caseId:c.id,mode:c.mode,origin:c.origin,retrieval:found.status,providerAttempts:0,realOutbound:0,semanticReview:'NOT_REVIEWED'};
  if(found.status!=='ready')return {...basic,code:found.error?.code??found.status,expected:c.expected,pass:found.status===c.expected,charged:0};
  const selected=c.selectedStoryIds;
  if(selected.some(id=>!found.candidates.some(s=>s.storyId===id)))fail('REVIEWED_SELECTION_NOT_RETRIEVED');
  cookie+='; '+retrieve.headers.get('set-cookie').split(';')[0];
  const input={requestId:randomUUID(),mode:c.mode,receipt:found.receipt,selectedStoryIds:selected,instructions:c.instructions,includeDraft:c.includeDraft};
  const action=c.mode==='qa'?'qa':c.includeDraft?'draft':'planner',profile=m('assistant/provider-profile').providerProfile(PROFILE,action),reservation=m('assistant/cost').reserveCost(profile.cost);
  const session=await m('assistant/identity').assistantSession(request('/',{},cookie),secrets.secret,clock());
  const evidence=await m('assistant/service').reloadSelectedEvidence(db,input.receipt,selected,session.binding,secrets.secret,clock());
  const available=evidence.evidence.flatMap(s=>s.evidence.map(a=>a.articleId));
  if(available.some(id=>!c.allowedArticleIds.includes(id)))fail('UNREVIEWED_EVIDENCE');
  const prepared=m('assistant/prompt').prepareProviderInput(evidence,input,profile);
  const preparedMetrics={estimatedInputTokens:prepared.inputTokens,evidenceTokens:prepared.evidenceTokens,inputBytes:prepared.bytes,reservationMicros:reservation,evidenceArticleCount:available.length};
  if(mode==='dry-run')return {...basic,...preparedMetrics,code:'PREPARED',pass:true,charged:0};
  if(c.scenario==='expired-receipt')offset+=600001;
  if(c.scenario==='unrelated-selection')input.selectedStoryIds=['not-a-candidate'];
  // Check aggregate capacity before spending. Exclusive coordinator lock prevents races.
  budget?.canReserve(reservation);
  let attempts=0,attemptId,bodySeen,usage=null;
  deps.fetcher=async(url,init)=>{
    if(++attempts!==1)fail('DUPLICATE_PROVIDER_ATTEMPT');
    bodySeen=checkWire(url,init,profile);
    // This fsync completes before any external fetch; uncertain attempts stay consumed.
    attemptId=await budget?.reserve(c.id,reservation);
    const response=await (mode==='live'?liveFetch(url,init):mockFetch?mockFetch(bodySeen,init):mockResponse(bodySeen,c.scenario));
    // Observe bounded usage in the same response stream; no clone, raw-output log or extra API.
    if(!response.body)return response;
    let chunks=[],bytes=0;
    const observed=response.body.pipeThrough(new TransformStream({transform(chunk,controller){bytes+=chunk.byteLength;if(bytes<=128*1024)chunks.push(chunk);else chunks=[];controller.enqueue(chunk);},flush(){try{if(bytes>128*1024)return;const buffer=new Uint8Array(bytes);let at=0;for(const part of chunks){buffer.set(part,at);at+=part.byteLength;}const u=JSON.parse(new TextDecoder().decode(buffer)).usage;const candidate={inputTokens:u?.input_tokens,outputTokens:u?.output_tokens};m('assistant/cost').estimatedCost(profile.cost,candidate);usage=candidate;}catch{/* Unknown usage keeps full reservation. */}finally{chunks=[];}}}));
    return new Response(observed,{status:response.status,headers:response.headers});
  };
  const response=await m('assistant/generate-http').handleGenerate(request('/api/assistant/generate',input,cookie,signal),deps),result=await response.json();
  const row=await db.prepare('SELECT state,actual_cost_micros FROM assistant_admissions WHERE request_id=?').bind(input.requestId).first();
  const wallet=await credit.getBalance(account.owner),charged=row?({qa:5,planner:7,draft:15}[action]):0;
  const refund=result.credit?.refund??null,code=result.error?.code??result.status.toUpperCase();
  const metrics={code,latencyMs:Date.now()-start,inputTokens:usage?.inputTokens??null,outputTokens:usage?.outputTokens??null,actualMicros:row?.actual_cost_micros??null,charged,refund};
  if(attemptId)await budget.finish(attemptId,metrics);
  if(wallet.balance!==funding-charged+(refund?.applied??0))fail('SETTLEMENT_AUDIT_FAILED');
  const expected=c.expected.startsWith('reject:')?c.expected.slice(7):null;
  const pass=expected?code===expected&&attempts===0&&charged===0:['OK','INSUFFICIENT_EVIDENCE'].includes(code)&&attempts===1;
  // Exercise replay through the unchanged service. No new ID, no new debit or transport.
  if(attempts&&['completed','failed'].includes(row?.state)){const replay=await (await m('assistant/generate-http').handleGenerate(request('/api/assistant/generate',input,cookie),deps)).json();if(replay.error?.code!==(code==='EVIDENCE_CHANGED'?'EVIDENCE_CHANGED':'RESULT_NOT_RETAINED')||attempts!==1)fail('REPLAY_AUDIT_FAILED');}
  if(mode==='live'&&onResult&&['ok','insufficient_evidence'].includes(result.status))await onResult(c.id,result);
  return {...basic,...preparedMetrics,...metrics,providerAttempts:attempts,realOutbound:mode==='live'?attempts:0,settlement:row?.state??'not_admitted',expected:c.expected,pass,wireContractChecked:!!bodySeen};
}
