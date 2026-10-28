import nodeAssert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {gzipSync} from 'node:zlib';
import {loadTestModules} from './test-module-loader.mjs';
let assertions=0;
const assert=new Proxy(nodeAssert,{apply(t,s,a){assertions++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{assertions++;return t[k](...a);}:t[k];}});
const paths=['assistant/provider','assistant/provider-profile','assistant/token-budget','assistant/output-validation','assistant/output-schema','assistant/prompt'];
const loaded=await loadTestModules(paths.map(p=>'lib/'+p+'.ts'),{externals:['js-tiktoken/lite','js-tiktoken/ranks/o200k_base']}),m=p=>loaded.modules['lib/'+p+'.ts'];
const profile=m('assistant/provider-profile').providerProfile(m('assistant/provider-profile').ASSISTANT_PROFILE,'qa'),error=c=>e=>e.code===c;
const article={evidenceId:'a',articleId:'a',storyId:'topic',title:'스타파이터 제작',summary:'공식 발표했다.',source:{id:'starwars',label:'StarWars.com',sourceClass:'official',displayClass:'공식 채널',certainty:'unclear'},published:'2026-10-15',category:'영화',orderUncertain:true,truncated:{title:false,summary:false},url:'https://example.com/news'};
const selection={request:{mode:'qa',query:'스타파이터',filters:{}},evidence:[{storyId:'topic',evidence:[article],representative:article,omittedArticleCount:0,orderUncertain:true,sourceCount:1,workIds:[],independentVerification:false}],archiveWindow:{from:'2026-07-18T07:00:00.000Z',to:'2026-10-16T07:00:00.000Z'},asOf:'2026-10-16T07:00:00.000Z'};
const input={mode:'qa',instructions:'',includeDraft:false,selectedStoryIds:['topic'],requestId:crypto.randomUUID(),receipt:'synthetic'};
const good={status:'ok',answer:'공식 발표했다.',evidenceIds:['a'],limitations:[]};
const vectors=JSON.parse(await readFile('scripts/fixtures/assistant/token-vectors.json','utf8')).vectors;
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler')),{build}=wr('esbuild'),{Miniflare}=wr('miniflare');
let mf;
try{
 for(const vector of vectors)assert.equal(m('assistant/token-budget').countTokens(vector.text,profile),vector.tokens.length);
 for(const changed of [{...profile,tokenizer:'cl100k_base'},{...profile,model:'unknown'},{...profile,id:'unknown'}])assert.throws(()=>m('assistant/token-budget').countTokens('x',changed),error('INVALID_COST_PROFILE'));
 const budget=m('assistant/prompt').prepareProviderInput(selection,input,profile);assert.equal(budget.inputTokens,m('assistant/token-budget').countTokens(budget.serialized,profile)+1024);assert(budget.inputTokens<16000);assert(budget.evidenceTokens<12000);assert.equal(budget.bytes,new TextEncoder().encode(budget.serialized).length);
 assert.throws(()=>m('assistant/token-budget').checkInputBudget({text:'x'.repeat(49152)},[],profile),error('EVIDENCE_TOO_LARGE'));
 assert.throws(()=>m('assistant/token-budget').checkInputBudget({text:' a'.repeat(16000)},[],profile),error('EVIDENCE_TOO_LARGE'));
 assert.throws(()=>m('assistant/token-budget').checkInputBudget({},' a'.repeat(12001),profile),error('EVIDENCE_TOO_LARGE'));
 for(const url of [null,'javascript:alert(1)','https://u:p@example.com','https://example.com/\n']){const s=structuredClone(selection);s.evidence[0].evidence[0].url=url;assert.throws(()=>m('assistant/prompt').prepareProviderInput(s,input,profile),error('EVIDENCE_CHANGED'));}
 // Minimal output keeps selected IDs, server URLs and basic official/numeric checks.
 assert.equal(m('assistant/output-validation').validateGroundedOutput(good,input,selection).status,'ok');
 const media=structuredClone(selection);media.evidence[0].evidence[0].source.sourceClass='media';assert.throws(()=>m('assistant/output-validation').validateGroundedOutput(good,input,media),error('INVALID_OUTPUT'));
 const unrelated=structuredClone(selection);unrelated.evidence[0].evidence[0].summary='공식 발표했다. 그러나 공개일은 확정되지 않았다.';assert.equal(m('assistant/output-validation').validateGroundedOutput(good,input,unrelated).status,'ok');
 const invented={...good,answer:'2035년 개봉한다.'};assert.throws(()=>m('assistant/output-validation').validateGroundedOutput(invented,input,selection),error('INVALID_OUTPUT'));
 // Plain shape bounds are shared with the exact strict schema submitted to OpenAI.
 for(const mode of ['qa','script']){const visit=s=>{if(s.type==='object'){assert.equal(s.additionalProperties,false);assert.deepEqual(s.required,Object.keys(s.properties));Object.values(s.properties).forEach(visit);}if(s.type==='array')visit(s.items);};visit(m('assistant/output-schema').outputSchema(mode));}
 // Responses may include reasoning items before or after the single answer.
 const message={type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(good),annotations:[]}]};
 const reasoning={type:'reasoning',id:'rs_synthetic',summary:[]};
 const envelope=items=>Response.json({status:'completed',model:profile.model,error:null,incomplete_details:null,usage:{input_tokens:100,output_tokens:100},output:items});
 for(const items of [[reasoning,message],[message,reasoning],[{...reasoning,summary:[{type:'summary_text',text:'Synthetic'}]},message]]){
  const value=await m('assistant/provider').callResponses('{}',profile,'synthetic-only-key',new AbortController().signal,async()=>envelope(items));assert.deepEqual(value.output,good);assert.equal(value.usage.outputTokens,100);
 }
 for(const items of [[message,message],[reasoning],[{type:'function_call'},message],[{...reasoning,summary:'bad'},message],[{...message,content:[...message.content,...message.content]}],[{...message,content:[{type:'refusal',refusal:'no'}]}]]){
  await assert.rejects(m('assistant/provider').callResponses('{}',profile,'synthetic-only-key',new AbortController().signal,async()=>envelope(items)),e=>['INVALID_OUTPUT','PROVIDER_REFUSAL'].includes(e.code));
 }
 // Actual workerd execution: pure JS tokenizer (no fs/WASM/CDN), native fetch and manual redirects.
 const bundled=await build({stdin:{contents:`import {countTokens} from './lib/assistant/token-budget.ts';import {callResponses} from './lib/assistant/provider.ts';import {prepareProviderInput} from './lib/assistant/prompt.ts';import {validateGroundedOutput} from './lib/assistant/output-validation.ts';
export default {async fetch(request){const scenario=new URL(request.url).searchParams.get('case');const profile=${JSON.stringify(profile)},selection=${JSON.stringify(selection)},input=${JSON.stringify(input)};try{const counts=${JSON.stringify(vectors.map(v=>v.text))}.map(t=>countTokens(t,profile));if(scenario==='tokens')return Response.json({counts});const prepared=prepareProviderInput(selection,input,profile);const result=await callResponses(prepared.serialized,profile,'synthetic-only-key',request.signal,fetch,scenario==='timeout'?15:1000);return Response.json({status:validateGroundedOutput(result.output,input,selection).status,usage:result.usage});}catch(e){return Response.json({code:e.code});}}};`,resolveDir:process.cwd()},bundle:true,minify:true,write:false,format:'esm',platform:'browser'});
 let scenario='success',calls=0;
 const script=bundled.outputFiles[0].text;
 mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',script,outboundService:async request=>{
  calls++;assert.equal(request.url,'https://api.openai.com/v1/responses');assert.equal(request.headers.get('authorization'),'Bearer synthetic-only-key');const payload=await request.json();assert.equal(payload.model,profile.model);assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);assert(!('conversation' in payload));
  if(scenario==='redirect')return new Response(null,{status:307,headers:{Location:'https://evil.invalid'}});
  if(scenario==='timeout')await new Promise(resolve=>setTimeout(resolve,70));
  if(scenario==='body-timeout')return new Response(new ReadableStream({start(c){setTimeout(()=>{try{c.enqueue(new TextEncoder().encode('{}'));c.close();}catch{}},1200);}}),{headers:{'Content-Type':'application/json'}});
  return Response.json({model:profile.model,status:'completed',error:null,incomplete_details:null,usage:{input_tokens:100,output_tokens:100},output:[{type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:JSON.stringify(good),annotations:[]}]}]});
 }});
 assert.deepEqual((await (await mf.dispatchFetch('https://local.test/?case=tokens')).json()).counts,vectors.map(v=>v.tokens.length));assert.equal(calls,0);
 for(const test of ['success','redirect','timeout','body-timeout']){scenario=test;calls=0;const r=await (await mf.dispatchFetch('https://local.test/?case='+test)).json();assert.equal(calls,1);assert.equal(test==='success'?r.status:r.code,test==='success'?'ok':test==='redirect'?'PROVIDER_UNAVAILABLE':'PROVIDER_TIMEOUT');}
 console.log(`Assistant provider: ${assertions} assertions PASS; ${vectors.length} official o200k reference vectors in Node + real workerd, minimal schema/reference/basic uncertainty checks, input guards, native one-call fetch/redirect/timeout/body deadline. Worker test bundle ${Buffer.byteLength(script)} bytes / ${gzipSync(script).byteLength} gzip. Live provider calls ZERO.`);
}finally{if(mf)await mf.dispose();await loaded.dispose();}
