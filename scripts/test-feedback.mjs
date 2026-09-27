import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

let assertions=0;
function equal(actual,expected,message){assert.equal(actual,expected,message);assertions++;}
function check(value,message){assert.ok(value,message);assertions++;}
async function source(path){return readFile(new URL(path,import.meta.url),'utf8');}
async function transpile(path,replacements={}){
  let output=ts.transpileModule(await source(path),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [specifier,url] of Object.entries(replacements))output=output.replaceAll(`'${specifier}'`,`'${url}'`).replaceAll(`"${specifier}"`,`"${url}"`);
  return `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
}
const dataUrl=value=>'data:text/javascript;base64,'+Buffer.from(value).toString('base64');

const domainUrl=await transpile('../lib/feedback/domain.ts');
const domain=await import(domainUrl);
equal(domain.parseFeedbackInput({message:'  좋습니다  ',page:'news'}).message,'좋습니다','valid feedback is trimmed');
equal(domain.parseFeedbackInput({message:'작품 의견',page:'works'}).page,'works','works page is accepted');
assert.throws(()=>domain.parseFeedbackInput({message:'   ',page:'news'}),/메모를 입력/);assertions++;
assert.throws(()=>domain.parseFeedbackInput({message:'x'.repeat(domain.FEEDBACK_MAX_LENGTH+1),page:'news'}),/이하/);assertions++;
assert.throws(()=>domain.parseFeedbackInput({message:'ok',page:'/admin'}),/페이지/);assertions++;
assert.throws(()=>domain.parseFeedbackInput(null),/형식/);assertions++;

const service=await import(await transpile('../lib/feedback/service.ts'));
let delivered=null;
await service.deliverFeedback({message:'@everyone 테스트',page:'news'},{webhookUrl:'https://discord.com/api/webhooks/id/token',now:()=>new Date('2026-09-27T02:00:00Z'),fetcher:async(url,init)=>{delivered={url,init,body:JSON.parse(init.body)};return new Response(null,{status:204});}});
equal(delivered.url,'https://discord.com/api/webhooks/id/token','configured webhook is used server-side');
equal(delivered.body.allowed_mentions.parse.length,0,'Discord mentions are disabled');
equal(delivered.body.embeds[0].description,'@everyone 테스트','feedback text is delivered');
equal(delivered.body.embeds[0].title,'HOLOCRON Beta Feedback','Discord message has beta context');
check(delivered.body.embeds[0].fields.some(field=>field.value.includes('News Archive')),'current page is included');
await assert.rejects(()=>service.deliverFeedback({message:'test',page:'news'},{webhookUrl:undefined,now:()=>new Date(),fetcher:fetch}),/설정되지/);assertions++;
await assert.rejects(()=>service.deliverFeedback({message:'test',page:'news'},{webhookUrl:'https://example.com/hook',now:()=>new Date(),fetcher:fetch}),/설정/);assertions++;
await assert.rejects(()=>service.deliverFeedback({message:'test',page:'news'},{webhookUrl:'https://discord.com/api/webhooks/id/token',now:()=>new Date(),fetcher:async()=>new Response('bad',{status:500})}),/전달하지 못/);assertions++;

const sessionStub=dataUrl('export async function anonymousSession(){return {sessionHash:"hash",setCookie:"cookie=value"}};export function withAnonymousSession(response,setCookie){if(setCookie)response.headers.set("Set-Cookie",setCookie);return response}');
const repoStub=dataUrl('export async function acquireFeedbackWindow(){return {acquired:true,nextAllowedAt:"later"}};export async function releaseFeedbackWindow(){}');
const successService=dataUrl('export async function deliverFeedback(){}');
async function route(envValue,delivery=successService){
  const envStub=dataUrl(`export const env=${JSON.stringify(envValue)}`);
  return import(await transpile('../app/api/feedback/route.ts',{'cloudflare:workers':envStub,'@/lib/beta/anonymous-session':sessionStub,'@/lib/feedback/domain':domainUrl,'@/lib/feedback/repository':repoStub,'@/lib/feedback/service':delivery}));
}
const missing=await route({});
equal((await missing.GET()).status,405,'non-POST request is rejected');
equal((await missing.POST(new Request('https://example.test/api/feedback',{method:'POST',body:'{}'}))).status,415,'non-JSON request is rejected');
equal((await missing.POST(new Request('https://example.test/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'}))).status,400,'malformed JSON is rejected');
equal((await missing.POST(new Request('https://example.test/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'hello',page:'news'})}))).status,503,'missing Discord environment fails closed');
const working=await route({HOLOCRON_DISCORD_FEEDBACK_WEBHOOK_URL:'https://discord.com/api/webhooks/id/token'});
equal((await working.POST(new Request('https://example.test/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'hello',page:'news'})}))).status,200,'successful Discord delivery returns success');
const failingService=dataUrl('export async function deliverFeedback(){throw new Error("delivery failed")}');
const failing=await route({HOLOCRON_DISCORD_FEEDBACK_WEBHOOK_URL:'https://discord.com/api/webhooks/id/token'},failingService);
equal((await failing.POST(new Request('https://example.test/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'hello',page:'news'})}))).status,502,'Discord failure is not reported as success');

const routeSource=await source('../app/api/feedback/route.ts');
const clientSource=await source('../components/feedback/feedback-dialog.tsx');
const newsroomSource=await source('../app/newsroom.tsx');
const feedbackCss=await source('../components/feedback/feedback.css');
check(routeSource.includes('HOLOCRON_DISCORD_FEEDBACK_WEBHOOK_URL'),'server reads the named Discord secret');
check(!clientSource.includes('HOLOCRON_DISCORD_FEEDBACK_WEBHOOK_URL')&&!clientSource.includes('discord.com/api/webhooks'),'client does not contain the webhook or secret name');
check(!routeSource.includes('webhookUrl:'),'API response does not serialize the webhook');
check(newsroomSource.includes('<FeedbackDialog variant="rail"/>'),'News Archive renders the dedicated feedback CTA rail');
check(newsroomSource.includes("archive==='works'&&<FeedbackDialog/>") ,'header feedback entry remains on Works only');
check(feedbackCss.includes('.feedback-entry-rail')&&feedbackCss.includes('position:sticky'),'feedback CTA has a visible desktop rail treatment');
console.log(`Beta feedback: ${assertions} assertions passed`);
