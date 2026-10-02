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
equal(domain.parseSeoulDateTime('2026-10-02','19:00'),'2026-10-02T10:00:00.000Z','KST input is stored as canonical UTC ISO');
equal(domain.parseSeoulDateTime('2026-10-02','00:00'),'2026-10-01T15:00:00.000Z','KST midnight supports whole-day recovery');
assert.throws(()=>domain.parseSeoulDateTime('2026-02-30','19:00'),/유효한 날짜/);assertions++;
assert.throws(()=>domain.parseSeoulDateTime('2026-10-02','25:70'),/유효한 날짜/);assertions++;
equal(domain.analyticsPeriodState(null,new Date('2026-10-02T09:00:00Z')).period,'qa','missing start setting keeps QA period');
equal(domain.analyticsPeriodState('2026-10-02T10:00:00.000Z',new Date('2026-10-02T09:59:59Z')).mode,'scheduled','future start reports scheduled mode');
equal(domain.analyticsPeriodState('2026-10-02T10:00:00.000Z',new Date('2026-10-02T09:59:59Z')).period,'qa','future start records pre-start views as QA');
equal(domain.analyticsPeriodState('2026-10-02T10:00:00.000Z',new Date('2026-10-02T10:00:00Z')).period,'2026-10-02T10:00:00.000Z','exact start boundary records Beta');
equal(domain.analyticsPeriodState('2026-10-02T10:00:00.000Z',new Date('2026-10-02T10:00:01Z')).mode,'beta','post-start traffic reports active Beta');

const reconciliationUrl=await transpile('../lib/analytics/reconciliation.ts',{'./domain':domainUrl});
const reconciliation=await import(reconciliationUrl);
const oldPeriod='2026-10-02T12:00:00.000Z';
const newPeriod='2026-10-02T10:00:00.000Z';
const rows=[
  {period:'qa',day:'2026-10-02',route:'all',sessionHash:'qa-before',pageViews:2,firstSeenAt:'2026-10-02T08:00:00.000Z',lastSeenAt:'2026-10-02T09:00:00.000Z'},
  {period:'qa',day:'2026-10-02',route:'all',sessionHash:'merge-beta',pageViews:3,firstSeenAt:'2026-10-02T10:00:00.000Z',lastSeenAt:'2026-10-02T11:00:00.000Z'},
  {period:newPeriod,day:'2026-10-02',route:'all',sessionHash:'merge-beta',pageViews:4,firstSeenAt:'2026-10-02T10:30:00.000Z',lastSeenAt:'2026-10-02T12:00:00.000Z'},
  {period:'qa',day:'2026-10-02',route:'news',sessionHash:'merge-qa',pageViews:2,firstSeenAt:'2026-10-02T08:10:00.000Z',lastSeenAt:'2026-10-02T08:30:00.000Z'},
  {period:oldPeriod,day:'2026-10-02',route:'news',sessionHash:'merge-qa',pageViews:5,firstSeenAt:'2026-10-02T08:00:00.000Z',lastSeenAt:'2026-10-02T09:00:00.000Z'},
  {period:'qa',day:'2026-10-02',route:'quiz',sessionHash:'ambiguous-qa',pageViews:6,firstSeenAt:'2026-10-02T09:00:00.000Z',lastSeenAt:'2026-10-02T11:00:00.000Z'},
  {period:oldPeriod,day:'2026-10-02',route:'works',sessionHash:'ambiguous-beta',pageViews:7,firstSeenAt:'2026-10-02T09:00:00.000Z',lastSeenAt:'2026-10-02T11:00:00.000Z'},
  {period:oldPeriod,day:'2026-10-02',route:'works',sessionHash:'beta-after',pageViews:8,firstSeenAt:'2026-10-02T10:30:00.000Z',lastSeenAt:'2026-10-02T12:30:00.000Z'},
];
const beforeViews=rows.reduce((sum,row)=>sum+row.pageViews,0);
const reconciled=reconciliation.reconcileAnalyticsRows(rows,oldPeriod,newPeriod);
equal(reconciled.report.qaToBetaRows,1,'fully post-start QA row moves to Beta');
equal(reconciled.report.betaToQaRows,1,'fully pre-start old Beta row moves back to QA');
equal(reconciled.report.ambiguousRows,2,'boundary-spanning rows are reported');
equal(reconciled.report.mergedRows,2,'same browser-day-route collisions merge into one visit row');
equal(reconciled.report.preservedPageViews,beforeViews,'total page views remain unchanged');
equal(reconciled.rows.reduce((sum,row)=>sum+row.pageViews,0),beforeViews,'page-view invariant holds after reconciliation');
equal(new Set(reconciled.rows.map(row=>[row.period,row.day,row.route,row.sessionHash].join('|'))).size,reconciled.rows.length,'collision leaves no duplicate visit row');
const mergedBeta=reconciled.rows.find(row=>row.period===newPeriod&&row.sessionHash==='merge-beta');
equal(mergedBeta.pageViews,7,'collision page views are summed');
equal(mergedBeta.firstSeenAt,'2026-10-02T10:00:00.000Z','collision keeps earlier first_seen_at');
equal(mergedBeta.lastSeenAt,'2026-10-02T12:00:00.000Z','collision keeps later last_seen_at');
equal(reconciled.rows.find(row=>row.sessionHash==='ambiguous-qa').period,'qa','ambiguous QA row keeps QA classification');
equal(reconciled.rows.find(row=>row.sessionHash==='ambiguous-beta').period,newPeriod,'ambiguous old Beta row keeps Beta classification under new period');
equal(reconciled.rows.find(row=>row.sessionHash==='beta-after').period,newPeriod,'moving start earlier reclassifies post-start old Beta row to new Beta');
const delayed=reconciliation.reconcileAnalyticsRows([{...rows[7],firstSeenAt:'2026-10-02T10:30:00.000Z',lastSeenAt:'2026-10-02T10:59:00.000Z'}],oldPeriod,'2026-10-02T11:00:00.000Z');
equal(delayed.rows[0].period,'qa','moving start later returns a fully pre-start Beta row to QA');
const idempotent=reconciliation.reconcileAnalyticsRows(reconciled.rows,newPeriod,newPeriod);
equal(idempotent.report.mergedRows,0,'reapplying the same start is idempotent');
equal(idempotent.report.preservedPageViews,beforeViews,'idempotent apply never adds page views');

const qaRows=[
  {day:'2026-09-26',route:'all',pageViews:5,visits:2},{day:'2026-09-26',route:'news',pageViews:3,visits:2},{day:'2026-09-26',route:'works',pageViews:1,visits:1},{day:'2026-09-26',route:'quiz',pageViews:1,visits:1},
  {day:'2026-09-27',route:'all',pageViews:9,visits:3},{day:'2026-09-27',route:'news',pageViews:5,visits:3},{day:'2026-09-27',route:'works',pageViews:2,visits:1},{day:'2026-09-27',route:'quiz',pageViews:2,visits:2},
];
const qaRepo=dataUrl(`export async function getAnalyticsPeriodState(){return {mode:'qa',period:'qa',startedAt:null}};export async function loadAnalyticsRows(){return ${JSON.stringify(qaRows)}};export async function reconcileBetaAnalyticsStart(){return {}}`);
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

const scheduledRepo=dataUrl(`export async function getAnalyticsPeriodState(){return {mode:'scheduled',period:'qa',startedAt:'${newPeriod}'}};export async function loadAnalyticsRows(){return []};export async function reconcileBetaAnalyticsStart(){return {}}`);
const scheduledService=await import(await transpile('../lib/analytics/service.ts',{'./repository':scheduledRepo,'./domain':domainUrl}));
equal((await scheduledService.getAnalyticsReport(new Date('2026-10-02T09:00:00Z'))).mode,'scheduled','future start is visible as scheduled');
const betaRepo=dataUrl(`export async function getAnalyticsPeriodState(){return {mode:'beta',period:'${newPeriod}',startedAt:'${newPeriod}'}};export async function loadAnalyticsRows(){return []};export async function reconcileBetaAnalyticsStart(){return {}}`);
const betaService=await import(await transpile('../lib/analytics/service.ts',{'./repository':betaRepo,'./domain':domainUrl}));
equal((await betaService.getAnalyticsReport(new Date(newPeriod))).mode,'beta','active Beta report mode remains available');

const viewRoute=await source('../app/api/analytics/view/route.ts');
const repoSource=await source('../lib/analytics/repository.ts');
const pageTracker=await source('../components/analytics/page-view-tracker.tsx');
const dashboard=await source('../components/admin/analytics-dashboard.tsx');
const quizPage=await source('../app/quiz/page.tsx');
check(/parseAnalyticsRoute/.test(viewRoute),'public analytics endpoint validates route scope');
check(/value<=\?/.test(repoSource)&&/COALESCE/.test(repoSource),'page-view persistence resolves future start at write time');
check(/db\(\)\.batch/.test(repoSource)&&/page_views=beta_analytics_daily_sessions\.page_views\+excluded\.page_views/.test(repoSource),'reconciliation uses batch-safe collision addition');
check(/first_seen_at=MIN/.test(repoSource)&&/last_seen_at=MAX/.test(repoSource),'collision preserves the full observed time range');
check(/before\.pageViews!==after\.pageViews/.test(repoSource),'repository enforces the page-view total invariant');
check(/useRef<PublicAnalyticsRoute\|null>\(null\)/.test(pageTracker)&&/lastSent\.current===route/.test(pageTracker),'client deduplicates each route while allowing client navigation views');
check(/type="date"/.test(dashboard)&&/type="time"/.test(dashboard)&&/Asia\/Seoul \(KST\)/.test(dashboard),'admin edits an explicit KST date and time');
check(/defaultValue=\{initialFields\.date\}/.test(dashboard)&&/defaultValue=\{initialFields\.time\}/.test(dashboard),'existing start value remains editable in the form');
check(/setPending/.test(dashboard)&&/설정하시겠습니까/.test(dashboard),'admin change requires a confirmation stage');
check(/QA → Beta/.test(dashboard)&&/경계 세션/.test(dashboard)&&/보존된 page views/.test(dashboard),'admin sees reconciliation results');
check(/기준: \{startLabel\(startedAt\)\} KST/.test(dashboard)&&/기존 분류를 유지했습니다/.test(dashboard),'reconciliation result names the applied KST boundary and ambiguous policy');
check(/PageViewTracker route="quiz"/.test(quizPage),'Daily Quiz participates in beta page-view analytics');
check(!repoSource.includes('user-agent')&&!repoSource.includes('cf-connecting-ip'),'analytics stores neither raw IP nor user-agent');

const unauth=dataUrl('export async function getAdminSession(){return null}');
const auth=dataUrl('export async function getAdminSession(){return {sub:"admin"}}');
const serviceStub=dataUrl('export async function getAnalyticsReport(){return {mode:"qa"}};export async function setBetaAnalyticsStart(){return {report:{mode:"scheduled"},reconciliation:{}}}');
const unauthRoute=await import(await transpile('../app/api/admin/analytics/route.ts',{'@/lib/admin/session':unauth,'@/lib/analytics/domain':domainUrl,'@/lib/analytics/service':serviceStub}));
equal((await unauthRoute.GET()).status,401,'unauthenticated analytics API is rejected');
equal((await unauthRoute.POST(new Request('https://holocron.kr/api/admin/analytics',{method:'POST',headers:{origin:'https://holocron.kr','content-type':'application/json'},body:JSON.stringify({action:'set-beta-start',date:'2026-10-02',time:'19:00'})}))).status,401,'unauthenticated analytics mutation remains rejected');
const authRoute=await import(await transpile('../app/api/admin/analytics/route.ts',{'@/lib/admin/session':auth,'@/lib/analytics/domain':domainUrl,'@/lib/analytics/service':serviceStub}));
equal((await authRoute.GET()).status,200,'authenticated analytics API succeeds');
equal((await authRoute.POST(new Request('https://holocron.kr/api/admin/analytics',{method:'POST',headers:{origin:'https://evil.example','content-type':'application/json'},body:JSON.stringify({action:'set-beta-start',date:'2026-10-02',time:'19:00'})}))).status,403,'cross-origin analytics mutation remains rejected');
equal((await authRoute.POST(new Request('https://holocron.kr/api/admin/analytics',{method:'POST',headers:{origin:'https://holocron.kr','content-type':'application/json'},body:JSON.stringify({action:'set-beta-start',date:'2026-10-02',time:'19:00'})}))).status,200,'authenticated same-origin start update succeeds');
const invalidService=dataUrl(`import {AnalyticsInputError} from '${domainUrl}';export async function getAnalyticsReport(){return {}};export async function setBetaAnalyticsStart(){throw new AnalyticsInputError('invalid')}`);
const invalidRoute=await import(await transpile('../app/api/admin/analytics/route.ts',{'@/lib/admin/session':auth,'@/lib/analytics/domain':domainUrl,'@/lib/analytics/service':invalidService}));
equal((await invalidRoute.POST(new Request('https://holocron.kr/api/admin/analytics',{method:'POST',headers:{origin:'https://holocron.kr','content-type':'application/json'},body:JSON.stringify({action:'set-beta-start',date:'2026-02-30',time:'25:70'})}))).status,400,'invalid server-side date/time returns 400');
const adminPage=await source('../app/admin/analytics/page.tsx');
check(adminPage.includes('requireAdminSession'),'analytics page requires the existing admin session');
console.log(`Beta analytics: ${assertions} assertions passed`);
