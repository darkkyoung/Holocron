import assert from 'node:assert/strict';
import {loadUiModules} from './assistant-ui-test-loader.mjs';

// Same hook/API client used by the overlay, with real local-D1 HTTP handlers.
export async function checkConversationD1({fixture,balance,now,handle,creditState,providerCalls}){
 const states=[],refs=[];let cursor=0,refCursor=0;
 globalThis.__conversationHooks={useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useRef(initial){return refs[refCursor++]??(refs[refCursor-1]={current:initial});}};
 globalThis.__conversationCredit=creditState;
 const loaded=await loadUiModules(['components/assistant/use-assistant-session.ts'],{stubs:{react:"export const useState=(...a)=>globalThis.__conversationHooks.useState(...a);export const useRef=(...a)=>globalThis.__conversationHooks.useRef(...a);export const useEffect=()=>{};",'@/components/credit/client':"export const CREDIT_CHANGED='test';export const initializeGuestCredits=()=>globalThis.__conversationCredit();"}});
 const oldFetch=globalThis.fetch,oldNow=Date.now;Date.now=now;let requests=[];
 globalThis.fetch=async(path,init)=>{requests.push({path,body:JSON.parse(init.body)});return handle(path,JSON.parse(init.body));};
 const render=()=>{cursor=0;refCursor=0;return loaded.modules['components/assistant/use-assistant-session.ts'].useAssistantSession();};
 try{
  for(const mode of ['qa','script']){
   states.length=0;refs.length=0;requests=[];await fixture(20);render();states[0]=mode;states[1]='스타파이터';states[13]=await creditState();
   const c=render();await Promise.all([c.search({preventDefault(){}},true),c.search({preventDefault(){}},true)]);
   assert.equal(requests.length,2);assert.equal(providerCalls(),1);assert.equal(await balance(),mode==='qa'?14:12);assert.equal(states[8],'completed');assert.equal(states[7].credit.charged,mode==='qa'?5:7);assert.equal(requests[1].body.includeDraft,false);
   assert(states[4].receipt);assert(states[4].resultExpiresAt>Date.now());assert.equal(states[4].credit.charged,1);
  }
  states.length=0;refs.length=0;requests=[];await fixture(20);render();states[1]='없는검색어';states[13]=await creditState();await render().search({preventDefault(){}},true);assert.equal(requests.length,1);assert.equal(providerCalls(),0);assert.equal(await balance(),20);
  console.log('PASS conversation UI hook → HTTP → local D1 → mock Responses: QA 1+5 / Guide 1+7, duplicate click, Receipt, no-result; provider outbound ZERO');
 }finally{globalThis.fetch=oldFetch;Date.now=oldNow;delete globalThis.__conversationHooks;delete globalThis.__conversationCredit;await loaded.dispose();}
}
