import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

let assertions=0;
function equal(actual,expected,message){assert.equal(actual,expected,message);assertions++;}
function check(value,message){assert.ok(value,message);assertions++;}
async function source(path){return readFile(new URL(path,import.meta.url),'utf8');}
async function transpile(path,replacements={}){let output=ts.transpileModule(await source(path),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;for(const [specifier,url]of Object.entries(replacements))output=output.replaceAll(`'${specifier}'`,`'${url}'`).replaceAll(`"${specifier}"`,`"${url}"`);return `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;}
const dataUrl=value=>'data:text/javascript;base64,'+Buffer.from(value).toString('base64');

const domainUrl=await transpile('../lib/analytics/domain.ts');
const domain=await import(domainUrl);
equal(domain.parseAnalyticsRoute('news'),'news','News page event is accepted');
equal(domain.parseAnalyticsRoute('works'),'works','Works page event is accepted');
equal(domain.parseAnalyticsRoute('quiz'),'quiz','Quiz page event is accepted');
assert.throws(()=>domain.parseAnalyticsRoute('admin'),/지원하지/);assertions++;
assert.throws(()=>domain.parseAnalyticsRoute('/api/manage'),/지원하지/);assertions++;
equal(domain.seoulDay(new Date('2026-09-26T16:00:00Z')),'2026-09-27','daily aggregation uses Korea time');
equal(domain.previousDay('2026-10-01'),'2026-09-30','yesterday crosses month boundaries');

const qaRows=[
 {day:'2026-09-26',route:'all',pageViews:5,visits:2},{day:'2026-09-26',route:'news',pageViews:3,visits:2},{day:'2026-09-26',route:'works',pageViews:1,visits:1},{day:'2026-09-26',route:'quiz',pageViews:1,visits:1},
 {day:'2026-09-27',route:'all',pageViews:9,visits:3},{day:'2026-09-27',route:'news',pageViews:5,visits:3},{day:'2026-09-27',route:'works',pageViews:2,visits:1},{day:'2026-09-27',route:'quiz',pageViews:2,visits:2},
];
const qaRepo=dataUrl(`export async function activeAnalyticsPeriod(){return 'qa'};export async function loadAnalyticsRows(){return ${JSON.stringify(qaRows)}};export async function startBetaAnalytics(){return 'unused'}`);
const qaService=await import(await transpile('../lib/analytics/service.ts',{'./repository':qaRepo,'./domain':domainUrl}));
const report=await qaService.getAnalyticsReport(new Date('2026-09-27T02:00:00Z'));
equal(report.mode,'qa','pre-beta traffic is separated as QA');
equal(report.today.pageViews,9,'today page views aggregate');
equal(report.today.visits,3,'today anonymous visits aggregate');
equal(report.yesterday.pageViews,5,'yesterday page views aggregate');
equal(report.total.pageViews,14,'period page views aggregate');
equal(report.total.visits,5,'period visits aggregate by browser-day');
equal(report.news.pageViews,8,'News page views aggregate');
equal(report.works.pageViews,3,'Works page views aggregate');
equal(report.quiz.pageViews,3,'Quiz page views aggregate');
equal(report.daily.length,2,'daily trend includes each day');

const betaRepo=dataUrl('export async function activeAnalyticsPeriod(){return "2026-09-27T03:00:00.000Z"};export async function loadAnalyticsRows(){return []};export async function startBetaAnalytics(){return "2026-09-27T03:00:00.000Z"}');
const betaService=await import(await transpile('../lib/analytics/service.ts',{'./repository':betaRepo,'./domain':domainUrl}));
equal((await betaService.getAnalyticsReport(new Date('2026-09-27T03:00:00Z'))).mode,'beta','beta start creates a separate period');

const viewRoute=await source('../app/api/analytics/view/route.ts');
const repoSource=await source('../lib/analytics/repository.ts');
const pageTracker=await source('../components/analytics/page-view-tracker.tsx');
const quizPage=await source('../app/quiz/page.tsx');
check(/parseAnalyticsRoute/.test(viewRoute),'public analytics endpoint validates route scope');
check(/ON CONFLICT\(period,day,route,session_hash\) DO UPDATE SET page_views=page_views\+1/.test(repoSource),'repeat views increment one browser-day aggregate');
check(/useRef<PublicAnalyticsRoute\|null>\(null\)/.test(pageTracker)&&/lastSent\.current===route/.test(pageTracker),'client deduplicates each route while allowing client navigation views');
check(/PageViewTracker route="quiz"/.test(quizPage),'Daily Quiz participates in beta page-view analytics');
check(!repoSource.includes('user-agent')&&!repoSource.includes('cf-connecting-ip'),'analytics stores neither raw IP nor user-agent');

const unauth=dataUrl('export async function getAdminSession(){return null}');
const auth=dataUrl('export async function getAdminSession(){return {sub:"admin"}}');
const serviceStub=dataUrl('export async function getAnalyticsReport(){return {mode:"qa"}};export async function startBetaAnalytics(){return {mode:"beta"}}');
const unauthRoute=await import(await transpile('../app/api/admin/analytics/route.ts',{'@/lib/admin/session':unauth,'@/lib/analytics/service':serviceStub}));
equal((await unauthRoute.GET()).status,401,'unauthenticated analytics API is rejected');
const authRoute=await import(await transpile('../app/api/admin/analytics/route.ts',{'@/lib/admin/session':auth,'@/lib/analytics/service':serviceStub}));
equal((await authRoute.GET()).status,200,'authenticated analytics API succeeds');
const adminPage=await source('../app/admin/analytics/page.tsx');
check(adminPage.includes('requireAdminSession'),'analytics page requires the existing admin session');
console.log(`Beta analytics: ${assertions} assertions passed`);
