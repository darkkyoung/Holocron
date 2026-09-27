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
equal(domain.parseFeedbackInput({nickname:'  스카이 워커  ',message:'  좋습니다  ',page:'news'}).nickname,'스카이 워커','nickname is required and normalized');
equal(domain.parseFeedbackInput({nickname:'테스터',message:'작품 의견',page:'works'}).page,'works','works page is accepted');
assert.throws(()=>domain.parseFeedbackInput({nickname:' ',message:'ok',page:'news'}),/유튜브 닉네임/);assertions++;
assert.throws(()=>domain.parseFeedbackInput({nickname:'x'.repeat(domain.FEEDBACK_NICKNAME_MAX_LENGTH+1),message:'ok',page:'news'}),/닉네임/);assertions++;
assert.throws(()=>domain.parseFeedbackInput({nickname:'테스터',message:'   ',page:'news'}),/메모를 입력/);assertions++;
assert.throws(()=>domain.parseFeedbackInput({nickname:'테스터',message:'x'.repeat(domain.FEEDBACK_MAX_LENGTH+1),page:'news'}),/이하/);assertions++;
assert.throws(()=>domain.parseFeedbackInput({nickname:'테스터',message:'ok',page:'/admin'}),/페이지/);assertions++;
equal(domain.feedbackDisplayTag('a'.repeat(64)),'HK-AAAAAAAAAA','session hash becomes a short anonymous tag');

const service=await import(await transpile('../lib/feedback/service.ts'));
let delivered=null;
await service.deliverFeedback({nickname:'스카이워커',message:'@everyone 테스트',page:'news'},{webhookUrl:'https://discord.com/api/webhooks/id/token',userTag:'HK-AAAAAAAAAA',now:()=>new Date('2026-09-27T02:00:00Z'),fetcher:async(url,init)=>{delivered={url,init,body:JSON.parse(init.body)};return new Response(null,{status:204});}});
equal(delivered.url,'https://discord.com/api/webhooks/id/token','configured webhook is used server-side');
equal(delivered.body.allowed_mentions.parse.length,0,'Discord mentions are disabled');
equal(delivered.body.embeds[0].description,'@everyone 테스트','feedback text is delivered');
check(delivered.body.embeds[0].fields.some(field=>field.name==='유튜브 닉네임'&&field.value==='스카이워커'),'YouTube nickname is included');
check(delivered.body.embeds[0].fields.some(field=>field.name==='사용자 태그'&&field.value==='HK-AAAAAAAAAA'),'anonymous browser tag is included');
await assert.rejects(()=>service.deliverFeedback({nickname:'테스터',message:'test',page:'news'},{webhookUrl:undefined,userTag:'HK-AAAAAAAAAA',now:()=>new Date(),fetcher:fetch}),/설정되지/);assertions++;
await assert.rejects(()=>service.deliverFeedback({nickname:'테스터',message:'test',page:'news'},{webhookUrl:'https://example.com/hook',userTag:'HK-AAAAAAAAAA',now:()=>new Date(),fetcher:fetch}),/설정/);assertions++;

const sessionStub=dataUrl(`export async function anonymousSession(){return {sessionHash:"${'a'.repeat(64)}",setCookie:"cookie=value"}};export function withAnonymousSession(response,setCookie){if(setCookie)response.headers.set("Set-Cookie",setCookie);return response}`);
const repoStub=dataUrl('export async function acquireFeedbackWindow(){return {acquired:true,nextAllowedAt:"later"}};export async function releaseFeedbackWindow(){}');
const userStub=dataUrl('export async function ensureFeedbackUser(){return {tag:"HK-AAAAAAAAAA",banned:false}};export async function recordFeedbackDelivery(){}');
const bannedUserStub=dataUrl('export async function ensureFeedbackUser(){return {tag:"HK-AAAAAAAAAA",banned:true}};export async function recordFeedbackDelivery(){}');
const successService=dataUrl('export async function deliverFeedback(){}');
async function route(envValue,delivery=successService,users=userStub){
  const envStub=dataUrl(`export const env=${JSON.stringify(envValue)}`);
  return import(await transpile('../app/api/feedback/route.ts',{'cloudflare:workers':envStub,'@/lib/beta/anonymous-session':sessionStub,'@/lib/feedback/domain':domainUrl,'@/lib/feedback/repository':repoStub,'@/lib/feedback/service':delivery,'@/lib/feedback/users-repository':users}));
}
const missing=await route({});
equal((await missing.GET()).status,405,'non-POST request is rejected');
equal((await missing.POST(new Request('https://example.test/api/feedback',{method:'POST',body:'{}'}))).status,415,'non-JSON request is rejected');
equal((await missing.POST(new Request('https://example.test/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:'테스터',message:'hello',page:'news'})}))).status,503,'missing Discord environment fails closed');
const working=await route({HOLOCRON_DISCORD_FEEDBACK_WEBHOOK_URL:'https://discord.com/api/webhooks/id/token'});
const ok=await working.POST(new Request('https://example.test/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:'테스터',message:'hello',page:'news'})}));
equal(ok.status,200,'successful Discord delivery returns success');
equal((await ok.json()).tag,'HK-AAAAAAAAAA','successful response returns the anonymous tag');
const banned=await route({HOLOCRON_DISCORD_FEEDBACK_WEBHOOK_URL:'https://discord.com/api/webhooks/id/token'},successService,bannedUserStub);
equal((await banned.POST(new Request('https://example.test/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nickname:'테스터',message:'hello',page:'news'})}))).status,403,'banned browser session cannot submit feedback');

const routeSource=await source('../app/api/feedback/route.ts');
const clientSource=await source('../components/feedback/feedback-dialog.tsx');
const usersRepository=await source('../lib/feedback/users-repository.ts');
const adminRoute=await source('../app/api/admin/feedback-users/route.ts');
const adminPage=await source('../app/admin/feedback/page.tsx');
const adminClient=await source('../components/admin/feedback-users-admin.tsx');
const commandRail=await source('../components/admin/admin-command-rail.tsx');
const schema=await source('../db/schema.ts');
const migration=await source('../drizzle/0010_feedback_sessions.sql');
check(clientSource.includes('유튜브 닉네임')&&clientSource.includes('required autoFocus'),'public feedback requires a YouTube nickname');
check(clientSource.includes('실제 YouTube 계정 소유 여부를 인증하지 않습니다'),'nickname is clearly described as unverified');
check(routeSource.includes('ensureFeedbackUser')&&routeSource.includes('user.banned'),'submission checks the cookie-scoped ban before delivery');
check(usersRepository.includes('session_hash')&&usersRepository.includes('display_tag'),'raw cookie is not the displayed administrator identity');
check(usersRepository.includes('message_count=message_count+1'),'successful messages increment a per-session count');
check(adminRoute.includes('getAdminSession')&&adminRoute.includes("request.headers.get('origin')"),'feedback user management API is session and origin protected');
check(adminPage.includes('requireAdminSession'),'feedback user page requires administrator session');
check(adminClient.includes('메모 차단')&&adminClient.includes('차단 해제'),'administrator can ban and unban feedback sessions');
check(commandRail.includes('href="/admin/feedback"'),'control room links to feedback user management');
check(schema.includes("sqliteTable('feedback_sessions'"),'feedback sessions have a dedicated D1 model');
check(migration.includes('CREATE TABLE `feedback_sessions`')&&migration.includes('display_tag'),'feedback session migration is present');
console.log(`Beta feedback identity and ban: ${assertions} assertions passed`);
