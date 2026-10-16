import nodeAssert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
let assertions=0;
const assert=new Proxy(nodeAssert,{apply(t,s,a){assertions++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{assertions++;return t[k](...a);}:t[k];}});
const paths=['assistant/repository','assistant/admission','assistant/credit','credit/refund-headroom','credit/service','credit/account-login','credit/rewards/repository','credit/rewards/policy','identity/repository','identity/service','quiz/credit-response','backup/export','backup/validator','backup/restore-plan'];
const loaded=await loadTestModules(paths.map(p=>'lib/'+p+'.ts')),m=p=>loaded.modules['lib/'+p+'.ts'];
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler')),{Miniflare}=wr('miniflare'),split=require('wrangler').unstable_splitSqlQuery;
let outbound=0;
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("local-headroom")}}',compatibilityDate:'2026-05-15',d1Databases:['DB','OLD'],outboundService:()=>{outbound++;throw new Error('No external calls');}});
const now=Date.parse('2026-10-16T06:00:00Z'),MAX=Number.MAX_SAFE_INTEGER,hash=s=>createHash('sha256').update(s).digest('hex'),error=c=>e=>e.code===c;
const repo=m('assistant/repository'),admission=m('assistant/admission'),identity=m('identity/repository'),policy=m('credit/rewards/policy');
let db,credit,sequenceCases=0;
const first=(sql,...args)=>db.prepare(sql).bind(...args).first(),run=(sql,...args)=>db.prepare(sql).bind(...args).run();
const balance=async o=>(await credit.getBalance(o)).balance;
const clear=()=>run('DELETE FROM assistant_admissions'); // Isolated local scenarios, never runtime cleanup.
const reward=(o,n,key=crypto.randomUUID())=>credit.credit({owner:o,amount:n,kind:'reward',idempotencyKey:key});
async function account(n=100){const a=await identity.createAccount(db,new Date(now));if(n)await reward(a.owner,n);return a.owner;}
async function guest(){const g=await m('identity/service').createGuest(db,'synthetic-local-guest-key-at-least-32-bytes',now);await reward(g.owner,10);return g.owner;}
function input(o,extra={}){return {requestId:crypto.randomUUID(),action:'qa',sessionHash:hash(o.principalId),networkHash:hash('synthetic-network'),previousNetworkHash:hash('previous-synthetic-network'),inputHmac:hash('synthetic-input'),ownerToken:crypto.randomUUID(),principalId:o.principalId,debitEntryId:crypto.randomUUID(),weight:1,credits:5,reservedCostMicros:10000,now,...extra};}
const admit=(o,extra)=>repo.insertAdmission(db,input(o,extra));
const fail=(r,time=now+1)=>repo.failAdmission(db,r.request_id,r.owner_token,time);
const complete=(r,time=now+1)=>repo.completeAdmission(db,r.request_id,r.owner_token,null,time);
const refundCount=r=>first('SELECT count(*) n,COALESCE(sum(applied_amount),0) amount FROM credit_ledger WHERE original_entry_id=?',r.debit_entry_id);
const visit=(o,time=now)=>m('credit/rewards/repository').claimVisitRewards(db,o,new Date(time));
const login=(o,g)=>m('credit/account-login').applyAccountLogin(db,o,g,new Date(now));
async function quiz(){const id=crypto.randomUUID(),yes=crypto.randomUUID(),no=crypto.randomUUID();await run("INSERT INTO quizzes(id,title,question,status,created_at,updated_at) VALUES(?,'local','local','published',?,?)",id,new Date(now).toISOString(),new Date(now).toISOString());for(const [option,correct] of [[yes,1],[no,0]])await run('INSERT INTO quiz_options(id,quiz_id,position,label,is_correct) VALUES(?,?,?,\'local\',?)',option,id,correct,correct);return {id,yes,no};}
const answer=(o,q,option=q.yes)=>m('quiz/credit-response').insertRewardedQuizResponse(db,q.id,'local-session',option,o,new Date(now));
async function audit(){
 const wallets=(await db.prepare('SELECT * FROM credit_wallets').all()).results;
 for(const w of wallets){const rows=(await db.prepare('SELECT * FROM credit_ledger WHERE wallet_id=? ORDER BY sequence').bind(w.principal_id).all()).results;let total=0n;for(let i=0;i<rows.length;i++){total+=BigInt(rows[i].applied_amount);assert.equal(rows[i].sequence,i+1);assert.equal(total,BigInt(rows[i].resulting_balance));}assert.equal(total,BigInt(w.balance));assert.equal(rows.length,w.version);}
}
try{
 db=await mf.getD1Database('DB');const old=await mf.getD1Database('OLD');
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){const sql=await readFile('drizzle/'+file,'utf8');await db.batch(split(sql).map(s=>db.prepare(s)));if(!file.startsWith('0017'))await old.batch(split(sql).map(s=>old.prepare(s)));}
 credit=m('credit/service').creditService(db);
 // New runtime requires 0017; no fallback may silently disable reservation enforcement.
 const oldAccount=await identity.createAccount(old,new Date(now));await assert.rejects(m('credit/service').creditService(old).credit({owner:oldAccount.owner,amount:1,kind:'reward',idempotencyKey:'unsupported-schema'}),error('UNAVAILABLE'));
 assert.equal((await old.prepare('SELECT count(*) n FROM credit_ledger').first()).n,0);
 assert.equal(createHash('sha256').update(await readFile('drizzle/0016_account_credit_foundation.sql')).digest('hex'),'4077c5a0db8bdf20263bcb1cc44592c8890b983af8cc1b21711403001fe4dcea');
 assert.equal(createHash('sha256').update(await readFile('drizzle/0017_assistant_admissions.sql')).digest('hex'),'24c6398caf81c2306d50cf5054351b85dd27ee1c2cf83249da5a5c6a5c1e7e16');
 const originalTriggers=(await db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND name LIKE 'credit_%' ORDER BY name").all()).results;assert.equal(originalTriggers.length,8);
 // Immediate refund, reward-first and refund-first: no competing reward consumes its capacity.
 for(const order of ['immediate','reward-first','refund-first','concurrent']){
  await clear();const o=await account(MAX),r=await admit(o);assert.equal(await balance(o),MAX-5);
  if(order==='reward-first')await assert.rejects(reward(o,1,'competing'),error('REFUND_CAPACITY'));
  if(order==='concurrent'){const results=await Promise.allSettled([reward(o,1,'competing'),fail(r)]);assert.equal(results[0].status,'rejected');assert(['REFUND_CAPACITY','OVERFLOW'].includes(results[0].reason.code));assert.equal(results[1].value.state,'failed');}
  else assert.equal((await fail(r)).state,'failed');
  if(order==='refund-first')await assert.rejects(reward(o,1,'competing'),error('OVERFLOW'));
  assert.equal(await balance(o),MAX);assert.deepEqual(await refundCount(r),{n:1,amount:5});assert.equal((await first("SELECT count(*) n FROM credit_ledger WHERE wallet_id=? AND idempotency_key='competing'",o.principalId)).n,0);
 }
 // Several expired but unsettled debits reserve their total, not just the current lease.
 await clear();let o=await account(MAX),rows=[];
 for(let n=0;n<3;n++)rows.push(await admit(o,{now:now+n*60000}));
 assert.equal(await balance(o),MAX-15);await assert.rejects(reward(o,1),error('REFUND_CAPACITY'));
 const done=await Promise.all(rows.flatMap(r=>Array.from({length:6},()=>admission.recoverExpiredGeneration(db,r.request_id,now+180000))));assert(done.every(r=>r.state==='failed'));assert.equal(await balance(o),MAX);for(const r of rows)assert.deepEqual(await refundCount(r),{n:1,amount:5});
 // Failure with a zero-row injected refund retains reservation, including beyond 48h.
 await clear();o=await account(MAX);let r=await admit(o);
 await run("CREATE TRIGGER test_headroom_refund_ignore BEFORE INSERT ON credit_ledger WHEN NEW.operation='refund' BEGIN SELECT RAISE(IGNORE); END");
 assert.equal((await fail(r)).state,'refund_pending');await assert.rejects(reward(o,1),error('REFUND_CAPACITY'));assert.deepEqual(await refundCount(r),{n:0,amount:0});
 await run('DROP TRIGGER test_headroom_refund_ignore');assert.equal((await admission.recoverExpiredGeneration(db,r.request_id,now+3*86400000)).state,'failed');assert.equal(await balance(o),MAX);
 // Full refund proof, not a failed label; unrelated partial refund cannot steal entitlement.
 await clear();o=await account(MAX);r=await admit(o);await run("UPDATE assistant_admissions SET state='failed' WHERE request_id=?",r.request_id);
 await assert.rejects(reward(o,1),error('REFUND_CAPACITY'));await run("UPDATE assistant_admissions SET state='refund_pending' WHERE request_id=?",r.request_id);
 await assert.rejects(credit.refund({owner:o,amount:1,idempotencyKey:'unrelated-refund',originalEntryId:r.debit_entry_id}),error('INVALID_REFUND'));assert.deepEqual(await refundCount(r),{n:0,amount:0});
 assert.equal((await fail(r)).state,'failed');await credit.debit({owner:o,amount:1,kind:'admin_adjustment',idempotencyKey:'legitimate-room'});await reward(o,1);assert.equal(await balance(o),MAX);
 // Successful completion releases reservation: same rejected key can be retried exactly once.
 await clear();o=await account(MAX);r=await admit(o);await assert.rejects(reward(o,1,'retry-same-key'),error('REFUND_CAPACITY'));assert.equal((await complete(r)).completed,true);assert.equal((await reward(o,1,'retry-same-key')).status,'applied');assert.equal((await reward(o,1,'retry-same-key')).status,'duplicate');assert.equal(await balance(o),MAX-4);assert.equal((await fail(r)).state,'completed');assert.deepEqual(await refundCount(r),{n:0,amount:0});
 // Both sides of the capacity edge, across arbitrary legitimate Credit kinds.
 for(const kind of ['reward','migration','race_payout','admin_adjustment']){
  await clear();o=await account(MAX-1);r=await admit(o);await credit.credit({owner:o,amount:1,kind,idempotencyKey:'allowed'});await assert.rejects(credit.credit({owner:o,amount:1,kind,idempotencyKey:'held'}),error('REFUND_CAPACITY'));assert.equal((await fail(r)).state,'failed');assert.equal(await balance(o),MAX);
 }
 // Login/Guest transfer near the reserved boundary: entire batch rolls back, claims remain unconsumed.
 await clear();o=await account(MAX-12);let g=await guest();r=await admit(o);await assert.rejects(login(o,g),error('UNAVAILABLE'));assert.equal(await balance(o),MAX-17);assert.equal(await balance(g),10);assert.equal((await first('SELECT retired_at FROM credit_principals WHERE id=?',g.principalId)).retired_at,null);
 for(const key of ['guest_migration_v1','account_first_login_v1'])assert.equal((await first('SELECT count(*) n FROM credit_ledger WHERE wallet_id=? AND idempotency_key=?',o.principalId,key)).n,0);
 await complete(r);const migrated=await login(o,g);assert.equal(migrated.notice.migrated,10);assert.equal(migrated.notice.firstLogin,3);assert.equal(await balance(o),MAX-4);await login(o,g);assert.equal(await balance(o),MAX-4);
 await clear();o=await account(MAX-13);g=await guest();r=await admit(o);const migrationRace=await Promise.all([login(o,g),fail(r)]);assert.equal(migrationRace[0].notice.migrated,10);assert.equal(migrationRace[0].notice.firstLogin,3);assert.equal(migrationRace[1].state,'failed');assert.equal(await balance(o),MAX);assert.deepEqual(await refundCount(r),{n:1,amount:5});
 // First login without Guest has the same reservation priority and rollback behavior.
 await clear();o=await account(MAX-2);r=await admit(o);await assert.rejects(login(o,null),error('UNAVAILABLE'));assert.equal((await first("SELECT count(*) n FROM credit_ledger WHERE wallet_id=? AND idempotency_key IN ('guest_migration_v1','account_first_login_v1')",o.principalId)).n,0);await complete(r);assert.equal((await login(o,null)).notice.firstLogin,3);
 // Account attendance: rejection writes no claim; same-day retry after completion pays once.
 await clear();o=await account(MAX);r=await admit(o);await assert.rejects(visit(o),error('UNAVAILABLE'));let day=policy.kstWeek(new Date(now));let key=policy.attendanceKey(day.week,day.today);assert.equal((await first('SELECT count(*) n FROM credit_ledger WHERE wallet_id=? AND idempotency_key=?',o.principalId,key)).n,0);await complete(r);assert.equal((await visit(o)).rewards[0].applied,1);assert.equal((await visit(o)).rewards.length,0);
 // Quiz first-answer and its reward roll back together; retried answer stays eligible.
 await clear();o=await account(MAX);let q=await quiz();r=await admit(o);await assert.rejects(answer(o,q),error('UNAVAILABLE'));assert.equal((await first('SELECT count(*) n FROM quiz_responses WHERE quiz_id=?',q.id)).n,0);assert.equal((await first('SELECT count(*) n FROM credit_ledger WHERE wallet_id=? AND idempotency_key=?',o.principalId,policy.quizRewardKey(q.id))).n,0);await complete(r);assert.equal((await answer(o,q)).credit.applied,3);assert.equal((await answer(o,q)).credit.newlyApplied,false);
 // Retrying also depends on the Quiz still being public; no pending entitlement is stored.
 await clear();o=await account(MAX);q=await quiz();r=await admit(o);await assert.rejects(answer(o,q),error('UNAVAILABLE'));await complete(r);await run("UPDATE quizzes SET status='draft' WHERE id=?",q.id);await assert.rejects(answer(o,q),error('UNAVAILABLE'));assert.equal((await first('SELECT count(*) n FROM quiz_responses WHERE quiz_id=?',q.id)).n,0);assert.equal((await first('SELECT count(*) n FROM credit_ledger WHERE wallet_id=? AND idempotency_key=?',o.principalId,policy.quizRewardKey(q.id))).n,0);
 // Guest generation stays denied; its existing cap still consumes a capped reward normally.
 g=await guest();await assert.rejects(admit(g),error('LOGIN_REQUIRED'));assert.equal((await reward(g,3)).appliedAmount,0);assert.equal(await balance(g),10);
 // HARD PRODUCT GATE: rejected attendance cannot be retried for yesterday under current rules.
 await clear();const midnight=Date.parse('2026-10-16T14:59:59.500Z');o=await account(MAX);r=await admit(o,{now:midnight});await assert.rejects(visit(o,midnight),error('UNAVAILABLE'));await complete(r,midnight+250);
 const nextDay=await visit(o,midnight+1000);assert.equal(nextDay.attendance.today,'2026-10-17');assert.equal(nextDay.attendance.days.find(d=>d.date==='2026-10-16').missed,true);assert.equal(nextDay.attendance.streak,1);assert.equal((await first("SELECT count(*) n FROM credit_ledger WHERE wallet_id=? AND reference_type='attendance' AND reference_id='2026-10-16'",o.principalId)).n,0);
 // A delayed Sunday +5 also loses the prior week/streak; no retroactive policy is invented.
 await clear();o=await account(MAX-6);const monday=Date.parse('2026-10-11T15:00:00Z');for(let d=0;d<6;d++)assert.equal((await visit(o,monday+d*86400000)).rewards[0].applied,1);
 const sunday=Date.parse('2026-10-18T14:59:59.500Z');r=await admit(o,{now:sunday});await assert.rejects(visit(o,sunday),error('UNAVAILABLE'));await complete(r,sunday+250);const reset=await visit(o,sunday+1000);assert.equal(reset.attendance.week,'2026-10-19');assert.equal(reset.rewards[0].applied,1);assert.equal((await first("SELECT count(*) n FROM credit_ledger WHERE wallet_id=? AND reference_id='2026-10-18'",o.principalId)).n,0);
 // SQL-level sequence boundary simulation: production predicate, real D1 and real obligations.
 // Only w.balance/version inputs below are hypothetical; no wallet/ledger history is forged.
 // Original audit triggers remain installed throughout. BigInt is the independent oracle.
 for(let n=0;n<=3;n++){
  await clear();o=await account(MAX-20);rows=[];for(let i=0;i<n;i++)rows.push(await admit(o,{now:now+i*60000}));
  if(n)await run("UPDATE assistant_admissions SET state='refund_pending' WHERE request_id=?",rows[0].request_id);
  const next=input(o,{now:now+4*60000});
  await run("INSERT INTO assistant_admissions(request_id,action,session_hash,network_hash,input_hmac,owner_token,principal_id,debit_entry_id,weight,reserved_cost_micros,state,created_at,lease_expires_at,expires_at) VALUES(?,'qa',?,?,?,?,?,?,1,10000,'started',?,?,?)",next.requestId,next.sessionHash,next.networkHash,next.inputHmac,next.ownerToken,next.principalId,next.debitEntryId,next.now,next.now+60000,next.now+172800000);
  const basic={owner:o,kind:'reward',idempotencyKey:'hypothetical-boundary'};
  const cases=[{command:{...basic,operation:'credit',amount:1},amount:1,newSlots:0,released:0},{command:{...basic,operation:'debit',amount:1},amount:-1,newSlots:0,released:0},{command:{...basic,operation:'claim',amount:0},amount:0,newSlots:0,released:0},{command:m('assistant/credit').spendCommand(o.principalId,'qa',next.requestId,next.inputHmac),amount:-5,newSlots:1,released:0}];
  if(n)cases.push({command:{...m('assistant/credit').spendCommand(o.principalId,'qa',rows[0].request_id,rows[0].input_hmac),operation:'refund',kind:'refund',originalEntryId:rows[0].debit_entry_id,idempotencyKey:'assistant:refund:'+rows[0].request_id},amount:5,newSlots:0,released:1});
  for(const c of cases)for(let remaining=0;remaining<=6;remaining++)for(const room of [0,5*n,5*n+1,25]){
   const guard=m('credit/refund-headroom').refundHeadroomPredicate(c.command,next.debitEntryId),b=MAX-room,v=MAX-remaining;
   const result=await first(`WITH w AS (SELECT ? AS principal_id,? AS balance,? AS version),input AS (SELECT ? AS amount) SELECT ${guard.sql} AS allowed FROM w CROSS JOIN input`,o.principalId,b,v,c.amount,...guard.bindings);
   const postLiability=BigInt(5*n+5*c.newSlots-5*c.released),postBalance=BigInt(b)+BigInt(c.amount),postSlots=BigInt(n+c.newSlots-c.released);
   const expected=postLiability<=BigInt(MAX)-postBalance&&postSlots<=BigInt(MAX)-BigInt(v)-1n;
   assert.equal(result.allowed,expected?1:0);sequenceCases++;
  }
  // Concrete SQL boundary examples: last slot is reserved for its own full refund.
  if(n===1){const c=cases.at(-1),guard=m('credit/refund-headroom').refundHeadroomPredicate(c.command,next.debitEntryId);assert.equal((await first(`WITH w AS(SELECT ? AS principal_id,? AS balance,? AS version),input AS(SELECT 5 AS amount) SELECT ${guard.sql} allowed FROM w CROSS JOIN input`,o.principalId,MAX-5,MAX-1,...guard.bindings)).allowed,1);}
  await run('DELETE FROM assistant_admissions WHERE request_id=?',next.requestId);for(const row of rows)assert.equal((await fail(row,now+300000)).state,'failed');
 }
 // No mutation of safety triggers, no direct balance change, no partial refund acceptance.
 assert.deepEqual((await db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND name LIKE 'credit_%' ORDER BY name").all()).results,originalTriggers);
 await assert.rejects(run('UPDATE credit_wallets SET version=? WHERE principal_id=?',MAX,o.principalId));await audit();
 const backup=await m('backup/export').exportBackup(db,new Date(now));assert.equal(m('backup/validator').validateBackup(backup).version,5);assert.equal(Object.keys(backup.tables).length,14);assert(!Object.hasOwn(backup.tables,'assistant_admissions'));assert.equal(m('backup/restore-plan').buildRestorePlan(backup).executable,false);assert.equal(outbound,0);
 console.log(`Assistant headroom: ${assertions} assertions PASS; real D1 balance/refund/reward/migration/rollback and full ledger audit; ${sequenceCases} simulated sequence/balance SQL boundary cases (not real MAX-length history). Numeric reservations PASS; acceptance BLOCKED: time-limited reward entitlement after a rejected claim needs a product decision. Provider calls ZERO.`);
}finally{await mf.dispose();loaded.dispose();}
