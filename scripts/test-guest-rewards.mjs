import nodeAssert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
let assertions=0;
const assert=new Proxy(nodeAssert,{apply(target,self,args){assertions++;return Reflect.apply(target,self,args);},get(target,key){return typeof target[key]==='function'?(...args)=>{assertions++;return target[key](...args);}:target[key];}});
const secret='local-rewards-only-secret-at-least-32-bytes';
globalThis.__rewardEnv={HOLOCRON_GUEST_SIGNING_SECRET:secret};
const loaded=await loadTestModules(['lib/backup/format.ts','lib/backup/validator.ts','lib/backup/restore-plan.ts','lib/credit/rewards/policy.ts','lib/credit/rewards/repository.ts','lib/credit/rewards/service.ts','lib/credit/service.ts','lib/identity/service.ts','lib/quiz/credit-response.ts','lib/quiz/service.ts','app/api/credit/visit/route.ts','app/api/quiz/route.ts'],{stubs:{'@/lib/news':'export function db(){return globalThis.__rewardDb}', 'cloudflare:workers':'export const env=globalThis.__rewardEnv;'}});
const m=loaded.modules,policy=m['lib/credit/rewards/policy.ts'],rewards=m['lib/credit/rewards/repository.ts'],guest=m['lib/identity/service.ts'],quiz=m['lib/quiz/credit-response.ts'],quizService=m['lib/quiz/service.ts'];
const visitApi=m['app/api/credit/visit/route.ts'],quizApi=m['app/api/quiz/route.ts'];
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("local-rewards")}}',compatibilityDate:'2026-05-15',d1Databases:['DB']});
try{
  const db=await mf.getD1Database('DB');globalThis.__rewardDb=db;
  for(const file of ['0011_daily_quiz.sql','0012_quiz_image_crop.sql','0016_account_credit_foundation.sql']){
    const sql=await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8');
    for(const statement of sql.split('--> statement-breakpoint').map(value=>value.trim()).filter(Boolean))await db.prepare(statement).run();
  }
  const service=m['lib/credit/service.ts'].creditService(db),monday=new Date('2026-10-11T15:00:00.000Z');
  const newGuest=()=>guest.createGuest(db,secret,monday.getTime());
  const balance=async owner=>(await service.getBalance(owner)).balance;
  const credit=(owner,amount,key)=>service.credit({owner,amount,idempotencyKey:key,kind:'reward'});
  const spend=(owner,amount,key)=>service.debit({owner,amount,idempotencyKey:key,kind:'admin_adjustment'});
  const count=async(table,where='',args=[])=>Number((await db.prepare(`SELECT COUNT(*) AS n FROM ${table} ${where}`).bind(...args).first()).n);
  const ledger=owner=>db.prepare('SELECT * FROM credit_ledger WHERE wallet_id=? ORDER BY sequence').bind(owner.principalId).all();
  const nextDay=(days)=>new Date(monday.getTime()+days*86400000);
  assert.equal(policy.kstDate(new Date('2026-10-11T14:59:59Z')),'2026-10-11');
  assert.equal(policy.kstDate(monday),'2026-10-12');
  assert.equal(policy.kstWeek(new Date('2026-10-11T14:59:59Z')).week,'2026-10-05');
  assert.equal(policy.kstWeek(monday).week,'2026-10-12');
  assert.equal(policy.shiftDate('2026-03-01',-1),'2026-02-28');
  const first=await newGuest();assert.equal(await balance(first.owner),0);
  const initial=await rewards.claimVisitRewards(db,first.owner,monday);
  assert.equal(initial.balance,3);assert.deepEqual(initial.rewards.map(row=>row.applied),[1,1,1]);
  assert.equal(initial.attendance.streak,1);assert.equal(initial.attendance.claimedToday,true);
  assert.equal(new Set((await ledger(first.owner)).results.map(row=>row.idempotency_key)).size,3);
  const duplicates=await Promise.all(Array.from({length:20},()=>rewards.claimVisitRewards(db,first.owner,monday)));
  assert(duplicates.every(row=>row.balance===3&&row.rewards.length===0));
  const fresh=await newGuest(),races=await Promise.all(Array.from({length:20},()=>rewards.claimVisitRewards(db,fresh.owner,monday)));
  assert.equal(races.reduce((sum,row)=>sum+row.rewards.length,0),3);assert.equal(await balance(fresh.owner),3);
  for(let day=1;day<7;day++){
    const state=await rewards.claimVisitRewards(db,first.owner,nextDay(day));
    assert.equal(state.attendance.streak,day+1);assert.equal(state.rewards.length,1);assert.equal(state.rewards[0].requested,day===6?5:1);
  }
  const weekRows=(await ledger(first.owner)).results.filter(row=>row.reference_type==='attendance');
  assert.equal(weekRows.length,7);assert.equal(weekRows.reduce((sum,row)=>sum+row.requested_amount,0),11);assert.equal(await balance(first.owner),10);
  assert.equal(weekRows[6].applied_amount,2);
  await spend(first.owner,5,'after-week');
  assert.equal((await rewards.claimVisitRewards(db,first.owner,nextDay(6))).rewards.length,0);assert.equal(await balance(first.owner),5);
  const reset=await rewards.claimVisitRewards(db,first.owner,nextDay(7));assert.equal(reset.attendance.streak,1);assert.equal(reset.rewards.length,1);assert.equal(reset.attendance.days.filter(row=>row.claimed).length,1);
  assert.equal((await ledger(first.owner)).results.filter(row=>row.idempotency_key===policy.FIRST_VISIT_KEY).length,1);
  assert.equal((await ledger(first.owner)).results.filter(row=>row.idempotency_key===policy.OPENING_KEY).length,1);
  const midnight=await newGuest();await rewards.claimVisitRewards(db,midnight.owner,new Date('2026-10-13T14:59:59Z'));
  const afterMidnight=await rewards.claimVisitRewards(db,midnight.owner,new Date('2026-10-13T15:00:00Z'));assert.equal(afterMidnight.attendance.streak,2);assert.equal(afterMidnight.rewards.length,1);
  const missed=await newGuest();await rewards.claimVisitRewards(db,missed.owner,monday);await rewards.claimVisitRewards(db,missed.owner,nextDay(1));
  const thursday=await rewards.claimVisitRewards(db,missed.owner,nextDay(3));assert.equal(thursday.attendance.streak,1);assert.equal(thursday.attendance.days[2].missed,true);
  for(let day=4;day<=6;day++)await rewards.claimVisitRewards(db,missed.owner,nextDay(day));
  assert.equal((await ledger(missed.owner)).results.filter(row=>row.reference_type==='attendance').at(-1).requested_amount,1);
  const capped=await newGuest();await credit(capped.owner,10,'seed');
  const full=await rewards.claimVisitRewards(db,capped.owner,monday);assert.equal(full.balance,10);assert(full.rewards.every(row=>row.applied===0));assert.equal(full.attendance.claimedToday,true);
  await spend(capped.owner,10,'empty');assert.equal((await rewards.claimVisitRewards(db,capped.owner,monday)).balance,0);
  assert.equal((await rewards.claimVisitRewards(db,capped.owner,nextDay(1))).balance,1);
  async function createQuiz(id,status='published',publishAt=null){
    await db.prepare('INSERT INTO quizzes (id,title,question,explanation,status,publish_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,'compat','Question','Explanation',status,publishAt,monday.toISOString(),monday.toISOString()).run();
    for(let i=0;i<2;i++)await db.prepare('INSERT INTO quiz_options (id,quiz_id,label,position,is_correct) VALUES (?,?,?,?,?)').bind(id+'-'+i,id,'Choice '+i,i,i).run();
  }
  let q=0;
  async function voteFixture(){const id='q'+(++q);await createQuiz(id);return {id,owner:(await newGuest()).owner,session:'quiz-session-'+q};}
  const vote=(f,correct=true,database=db)=>quiz.insertRewardedQuizResponse(database,f.id,f.session,f.id+'-'+(correct?1:0),f.owner,monday);
  const correct=await voteFixture();const correctResult=await vote(correct);assert.equal(correctResult.credit.requested,3);assert.equal(correctResult.credit.applied,3);assert.equal(await balance(correct.owner),3);
  assert.equal((await vote(correct)).credit.newlyApplied,false);assert.equal(await count('quiz_responses','WHERE quiz_id=?',[correct.id]),1);
  const wrong=await voteFixture();assert.equal((await vote(wrong,false)).credit.requested,0);assert.equal((await vote(wrong,true)).optionId,wrong.id+'-0');assert.equal(await balance(wrong.owner),0);
  assert.equal((await ledger(wrong.owner)).results[0].operation,'claim');
  for(const choices of [Array(20).fill(true),Array.from({length:20},(_,i)=>i%2===0)]){
    const f=await voteFixture(),values=await Promise.all(choices.map(choice=>vote(f,choice)));
    assert.equal(new Set(values.map(row=>row.optionId)).size,1);assert.equal(await count('quiz_responses','WHERE quiz_id=?',[f.id]),1);assert.equal((await ledger(f.owner)).results.length,1);
    assert.equal(await balance(f.owner),values[0].optionId.endsWith('-1')?3:0);
  }
  for(const seed of [9,10]){
    const f=await voteFixture();await credit(f.owner,seed,'seed');const result=await vote(f);assert.equal(result.credit.applied,10-seed);assert.equal(result.credit.capped,true);assert.equal(await balance(f.owner),10);
    await spend(f.owner,5,'later');await vote(f);assert.equal(await balance(f.owner),5);
  }
  const history=await voteFixture();await db.prepare('INSERT INTO quiz_responses(quiz_id,session_hash,option_id,created_at) VALUES (?,?,?,?)').bind(history.id,history.session,history.id+'-1','2026-01-01T00:00:00.000Z').run();
  assert.equal((await vote(history)).credit,null);assert.equal(await balance(history.owner),0);
  const anotherOwner=(await newGuest()).owner;assert.equal((await vote({...correct,owner:anotherOwner})).credit,null);assert.equal(await balance(anotherOwner),0);
  // A new Beta cookie does not reopen the same Credit owner's Quiz entitlement.
  await vote({...wrong,session:'another-beta-session'},true);assert.equal(await balance(wrong.owner),0);
  const integration=await voteFixture();const data=await quizService.submitQuizVote({quizId:integration.id,optionId:integration.id+'-1',correct:false,amount:999},integration.session,integration.owner,monday);
  assert.equal(data.credit.applied,3);assert.equal(data.result.explanation,'Explanation');assert.equal(data.result.totalVotes,1);assert.equal(data.result.options.find(row=>row.isCorrect).percent,100);
  const restored=await quizService.getQuizParticipation(integration.id,integration.session,monday);assert.equal(restored.result.selectedOptionId,integration.id+'-1');assert.equal(restored.result.totalVotes,1);
  const forged=await voteFixture();assert.equal((await quizService.submitQuizVote({quizId:forged.id,optionId:forged.id+'-0',correct:true,amount:999},forged.session,forged.owner,monday)).credit.requested,0);
  // Actual D1 triggers inject failure at either side; all prior statements roll back.
  for(const table of ['credit_ledger','quiz_responses']){
    const f=await voteFixture();await db.prepare(`CREATE TRIGGER injected_failure BEFORE INSERT ON ${table} BEGIN SELECT RAISE(ABORT,'private-sentinel'); END`).run();
    await assert.rejects(vote(f),error=>error.code==='UNAVAILABLE'&&!error.message.includes('sentinel'));
    assert.equal(await count('quiz_responses','WHERE quiz_id=?',[f.id]),0);assert.equal((await ledger(f.owner)).results.length,0);assert.equal(await balance(f.owner),0);
    await db.prepare('DROP TRIGGER injected_failure').run();assert.equal((await vote(f)).credit.applied,3);
  }
  const ignored=await voteFixture();await db.prepare("CREATE TRIGGER ignored_response BEFORE INSERT ON quiz_responses BEGIN SELECT RAISE(IGNORE); END").run();
  await assert.rejects(vote(ignored));assert.equal(await balance(ignored.owner),0);assert.equal((await ledger(ignored.owner)).results.length,0);await db.prepare('DROP TRIGGER ignored_response').run();
  const laterFailure=await voteFixture();
  const failAfterBoth={prepare:db.prepare.bind(db),batch:statements=>db.batch([...statements,db.prepare('UPDATE credit_wallets SET balance=-1 WHERE principal_id=?').bind(laterFailure.owner.principalId)])};
  await assert.rejects(vote(laterFailure,true,failAfterBoth));assert.equal(await balance(laterFailure.owner),0);assert.equal(await count('quiz_responses','WHERE quiz_id=?',[laterFailure.id]),0);
  const lost=await voteFixture(),ambiguous={prepare:db.prepare.bind(db),batch:async statements=>{await db.batch(statements);throw new Error('response lost');}};
  await assert.rejects(vote(lost,true,ambiguous));assert.equal((await vote(lost)).credit.newlyApplied,false);assert.equal(await balance(lost.owner),3);
  const broken=await voteFixture(),failure={prepare:db.prepare.bind(db),batch:async()=>{throw new Error('private-sentinel');}};await assert.rejects(vote(broken,true,failure));assert.equal(await balance(broken.owner),0);
  const unavailable=await newGuest();await assert.rejects(rewards.claimVisitRewards(failure,unavailable.owner,monday));assert.equal(await balance(unavailable.owner),0);
  // HTTP handlers against real D1, only infrastructure binding replaced.
  const request=(path,body={},cookie='',extra={})=>new Request('https://holocron.kr'+path,{method:'POST',headers:{origin:'https://holocron.kr','content-type':'application/json',...(cookie?{cookie}:{}),...extra},body:typeof body==='string'?body:JSON.stringify(body)});
  const usersBefore=await count('credit_principals');assert.equal(visitApi.GET,undefined);assert.equal(await count('credit_principals'),usersBefore);
  for(const bad of [{amount:50},{date:'2000-01-01'},{owner:'arbitrary'},{cap:999},null,[],{streak:7}])assert.equal((await visitApi.POST(request('/api/credit/visit',bad))).status,400);
  assert.equal((await visitApi.POST(request('/api/credit/visit','{'))).status,400);
  assert.equal((await visitApi.POST(request('/api/credit/visit',' '.repeat(2000)))).status,413);
  assert.equal((await visitApi.POST(request('/api/credit/visit',{},'',{origin:'https://other.example'}))).status,403);
  assert.equal((await visitApi.POST(request('/api/credit/visit',{},'',{'content-type':'text/plain'}))).status,415);
  assert.equal((await visitApi.POST(request('/api/credit/visit',{},'__Host-holocron_guest=forged'))).status,401);
  const failedCreationCount=await count('credit_principals');let batchCalls=0;
  const failNewReward={prepare:db.prepare.bind(db),batch:statements=>{batchCalls++;if(batchCalls===2)throw new Error('local-reward-failure');return db.batch(statements);}};
  const pendingVisit=await m['lib/credit/rewards/service.ts'].visitGuest(request('/api/credit/visit'),failNewReward,secret,monday);
  assert.equal(pendingVisit.error,true);assert.match(pendingVisit.setCookie,/__Host-holocron_guest=/);assert.equal(await count('credit_principals'),failedCreationCount+1);
  const retryVisit=await m['lib/credit/rewards/service.ts'].visitGuest(request('/api/credit/visit',{},pendingVisit.setCookie.split(';')[0]),db,secret,monday);
  assert.equal(retryVisit.state.balance,3);assert.equal(await count('credit_principals'),failedCreationCount+1);
  const httpFirst=await visitApi.POST(request('/api/credit/visit'));assert.equal(httpFirst.status,200);const state=await httpFirst.json();assert.equal(state.balance,3);
  const cookies=httpFirst.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');assert.match(cookies,/__Host-holocron_guest=/);assert.match(cookies,/holocron_beta_session=/);
  assert.doesNotMatch(JSON.stringify(state),/principalId|walletId|guest_key_hash|idempotency|secret|v1\./);
  assert.equal(httpFirst.headers.get('cache-control'),'private, no-store');
  const httpAgain=await Promise.all(Array.from({length:10},()=>visitApi.POST(request('/api/credit/visit',{},cookies))));
  for(const response of httpAgain){const body=await response.json();assert.equal(body.balance,3);assert.equal(body.rewards.length,0);}
  const httpQuiz='http-quiz';await createQuiz(httpQuiz);const post={quizId:httpQuiz,optionId:httpQuiz+'-0',correct:true,amount:99};
  assert.equal((await quizApi.POST(request('/api/quiz',post))).status,409);
  assert.equal((await quizApi.POST(request('/api/quiz',post,'holocron_beta_session='+crypto.randomUUID()))).status,409);
  assert.equal((await quizApi.POST(request('/api/quiz',post,cookies,{origin:'https://other.example'}))).status,403);
  const voted=await quizApi.POST(request('/api/quiz',post,cookies));assert.equal(voted.status,200);const answer=await voted.json();assert.equal(answer.credit.requested,0);assert.equal(answer.result.selectedOptionId,httpQuiz+'-0');
  assert.doesNotMatch(JSON.stringify(answer),/principalId|walletId|guest_key_hash|idempotency|secret|v1\./);
  const getResponse=await quizApi.GET(new Request('https://holocron.kr/api/quiz?quizId='+httpQuiz,{headers:{cookie:cookies}}));const getData=await getResponse.json();assert.equal(getData.result.selectedOptionId,httpQuiz+'-0');
  globalThis.__rewardDb=failure;const failed=await visitApi.POST(request('/api/credit/visit',{},cookies));assert.equal(failed.status,503);assert.doesNotMatch(await failed.text(),/private-sentinel|balance/);globalThis.__rewardDb=db;
  globalThis.__rewardEnv.HOLOCRON_GUEST_SIGNING_SECRET=undefined;assert.equal((await visitApi.POST(request('/api/credit/visit'))).status,503);globalThis.__rewardEnv.HOLOCRON_GUEST_SIGNING_SECRET=secret;
  assert.equal(await count('credit_principals'),usersBefore+2,'invalid/malformed/GET requests never create identities');
  const audit=await db.prepare('SELECT w.balance,COALESCE(SUM(e.applied_amount),0) AS total FROM credit_wallets w LEFT JOIN credit_ledger e ON e.wallet_id=w.principal_id GROUP BY w.principal_id').all();
  for(const row of audit.results){assert.equal(row.balance,row.total);assert(row.balance<=10&&row.balance>=0);}
  const format=m['lib/backup/format.ts'],tables=Object.fromEntries(format.BACKUP_TABLES.map(name=>[name,[]]));
  for(const name of [...format.CREDIT_BACKUP_TABLES,'quizzes','quiz_options','quiz_responses'])tables[name]=(await db.prepare('SELECT * FROM '+name).all()).results;
  const backup={format:format.BACKUP_FORMAT,version:4,application:'HOLOCRON',createdAt:monday.toISOString(),schema:{latestMigration:format.BACKUP_MIGRATION},consistency:'d1-read-batch',tables,counts:Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.length]))};
  assert.equal(m['lib/backup/validator.ts'].validateBackup(backup).version,4);
  const plan=m['lib/backup/restore-plan.ts'].buildRestorePlan(backup);assert.equal(plan.counts.credit_ledger,tables.credit_ledger.length);
  console.log(`Guest rewards: ${assertions} assertions passed (real local D1, visit/Quiz routes, races, rollback, KST, cap and security)`);
}finally{await mf.dispose();await loaded.dispose();delete globalThis.__rewardDb;delete globalThis.__rewardEnv;}
