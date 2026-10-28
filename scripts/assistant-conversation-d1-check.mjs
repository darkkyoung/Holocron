import assert from 'node:assert/strict';
import {loadUiModules} from './assistant-ui-test-loader.mjs';

// Same hook/API client used by the overlay, with real local-D1 HTTP handlers.
export async function checkConversationD1({fixture,balance,now,handle,creditState,providerCalls,invalidOutput}){
 const states=[],refs=[];let cursor=0,refCursor=0;
 globalThis.__conversationHooks={useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useRef(initial){return refs[refCursor++]??(refs[refCursor-1]={current:initial});}};
 globalThis.__conversationCredit=creditState;
 const loaded=await loadUiModules(['components/assistant/use-assistant-session.ts','components/assistant/assistant-workspace.tsx'],{stubs:{react:"export const useState=(...a)=>globalThis.__conversationHooks.useState(...a);export const useRef=(...a)=>globalThis.__conversationHooks.useRef(...a);export const useEffect=()=>{};",'@/components/credit/client':"export const CREDIT_CHANGED='test';export const initializeGuestCredits=()=>globalThis.__conversationCredit();"}});
 const oldFetch=globalThis.fetch,oldNow=Date.now;Date.now=now;let requests=[];
 globalThis.fetch=async(path,init)=>{requests.push({path,body:JSON.parse(init.body)});return handle(path,JSON.parse(init.body));};
 const render=()=>{cursor=0;refCursor=0;return loaded.modules['components/assistant/use-assistant-session.ts'].useAssistantSession();};
 const tree=()=>{cursor=0;refCursor=0;return loaded.modules['components/assistant/assistant-workspace.tsx'].default({workOptions:[],categories:[],sources:[]});};
 function walk(node,fn){if(!node)return null;if(Array.isArray(node)){for(const child of node){const match=walk(child,fn);if(match)return match;}return null;}if(typeof node!=='object')return null;if(fn(node))return node;if(typeof node.type==='function')return walk(node.type(node.props),fn);return walk(node.props?.children,fn);}

 try{
  for(const question of ['안녕','다스 베이더는 누구야?']){
   states.length=0;refs.length=0;requests=[];await fixture(20);render();states[1]=question;states[13]=await creditState();
   const form=walk(tree(),node=>node.type==='form');assert(form,'actual workspace form');await Promise.all([form.props.onSubmit({preventDefault(){}}),form.props.onSubmit({preventDefault(){}})]);while(states[8]==='generating')await new Promise(resolve=>setTimeout(resolve,0));
   assert.equal(requests.length,1);assert.equal(requests[0].path,'/api/assistant/generate');assert.equal(requests[0].body.mode,'chat');
   assert.equal(providerCalls(),1);assert.equal(await balance(),15);assert.equal(render().chatResult.answer,'안녕하세요! 스타워즈 이야기를 함께 나눠요.');
   const replay=await handle(requests[0].path,requests[0].body);assert.equal((await replay.json()).error.code,'RESULT_NOT_RETAINED');assert.equal(providerCalls(),1);
  }
  for(const mode of ['qa','script']){
   states.length=0;refs.length=0;requests=[];await fixture(20);render();states[0]=mode;states[1]='스타파이터';states[13]=await creditState();
   const c=render();await Promise.all([c.search({preventDefault(){}},true),c.search({preventDefault(){}},true)]);
   assert.equal(requests.length,2);assert.equal(providerCalls(),1);assert.equal(await balance(),mode==='qa'?14:12);assert.equal(states[8],'completed');assert.equal(states[7].credit.charged,mode==='qa'?5:7);assert.equal(requests[1].body.includeDraft,false);
   assert(states[4].receipt);assert(states[4].resultExpiresAt>Date.now());assert.equal(states[4].credit.charged,1);
  }
  states.length=0;refs.length=0;requests=[];await fixture(20);render();states[1]='없는검색어';states[13]=await creditState();await render().search({preventDefault(){}},true);assert.equal(requests.length,1);assert.equal(providerCalls(),0);assert.equal(await balance(),20);
  // Real UI consent -> Account HTTP -> D1 refund. A failed intent cannot silently
  // spend again; only the separately confirmed quote creates a second UUID.
  states.length=0;refs.length=0;requests=[];await fixture(20);invalidOutput();render();states[1]='스타파이터';states[13]=await creditState();
  await render().search({preventDefault(){}},true);
  assert.equal(providerCalls(),1);assert.equal(await balance(),19);assert.equal(states[11].code,'INVALID_OUTPUT');assert.match(states[11].settlement,/실제 적용 5 CR/);
  const firstId=requests[1].body.requestId;
  await render().generate();assert.equal(providerCalls(),1);assert.equal(requests.length,2);assert.equal(await balance(),19);
  const confirmation=render();assert.equal(confirmation.additionalConsent.price,5);
  await Promise.all([confirmation.confirmAdditionalGeneration(),confirmation.confirmAdditionalGeneration()]);
  assert.equal(providerCalls(),2);assert.equal(requests.length,3);assert.notEqual(requests[2].body.requestId,firstId);assert.equal(await balance(),19);
  // Replay the existing UUID at the server: no new Provider call, debit or refund.
  const replay=await handle('/api/assistant/generate',requests[2].body);assert.equal((await replay.json()).error.code,'RESULT_NOT_RETAINED');assert.equal(providerCalls(),2);assert.equal(await balance(),19);
  console.log('PASS conversation UI hook → HTTP → local D1 → mock Responses: QA 1+5 / Guide 1+7, duplicate click, Receipt, no-result, failed/refunded intent + separately confirmed retry + server replay; provider outbound ZERO');
 }finally{globalThis.fetch=oldFetch;Date.now=oldNow;delete globalThis.__conversationHooks;delete globalThis.__conversationCredit;await loaded.dispose();}
}
