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
 for(const file of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){const sql=await readFile('drizzle/'+file,'utf8');await db.batch(split(sql).map(s=>db.prepare(s)));if(file<'0017')await old.batch(split(sql).map(s=>old.prepare(s)));}
 credit=m('credit/service').creditService(db);
 // New runtime requires 0017; no fallback may silently disable reservation enforcement.
 const oldAccount=await identity.createAccount(old,new Date(now));await assert.rejects(m('credit/service').creditService(old).credit({owner:oldAccount.owner,amount:1,kind:'reward',idempotencyKey:'unsupported-schema'}),error('UNAVAILABLE'));
 assert.equal((await old.prepare('SELECT count(*) n FROM credit_ledger').first()).n,0);
 assert.equal(createHash('sha256').update(await readFile('drizzle/0016_account_credit_foundation.sql')).digest('hex'),'4077c5a0db8bdf20263bcb1cc44592c8890b983af8cc1b21711403001fe4dcea');
 assert.equal(createHash('sha256').update(await readFile('drizzle/0017_assistant_admissions.sql')).digest('hex'),'24c6398caf81c2306d50cf5054351b85dd27ee1c2cf83249da5a5c6a5c1e7e16');
 const originalTriggers=(await db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND name LIKE 'credit_%' ORDER BY name").all()).results;assert.equal(originalTriggers.length,8);
 // Account: immediate full refund works. Capacity is NOT reserved against rewards.
 await clear();let o=await account(MAX),r=await admit(o),rows=[];
 assert.equal(await balance(o),MAX-5);let settled=await fail(r);
 assert.equal(settled.state,'failed');assert.deepEqual(settled.refund,{requested:5,applied:5,forfeited:0,full:true});assert.equal(await balance(o),MAX);
 // Account capacity-first full/partial/zero settlement with exact durable accounting.
 for(const competing of [1,5]){
  await clear();o=await account(MAX);r=await admit(o);await reward(o,competing,'ordinary-reward');
  const expected={requested:5,applied:5-competing,forfeited:competing,full:false};
  const results=await Promise.all(Array.from({length:12},()=>fail(r)));assert(results.every(x=>x.state==='failed'));for(const result of results)assert.deepEqual(result.refund,expected);
  assert.equal(await balance(o),MAX);assert.deepEqual(await refundCount(r),{n:1,amount:5-competing});
  await credit.debit({owner:o,amount:5,kind:'admin_adjustment',idempotencyKey:'later-space'});
  assert.deepEqual((await admission.recoverExpiredGeneration(db,r.request_id,now+3*86400000)).refund,expected);assert.equal(await balance(o),MAX-5);
  await assert.rejects(credit.refund({owner:o,amount:1,originalEntryId:r.debit_entry_id,idempotencyKey:'no-top-up'}),error('INVALID_REFUND'));
 }
 // Serialize both possible orders and race real D1 transactions; no unrecorded effect.
 for(const order of ['reward-first','refund-first','concurrent']){
  await clear();o=await account(MAX);r=await admit(o);
  if(order==='reward-first'){await reward(o,1,'competing');await fail(r);}
  else if(order==='refund-first'){await fail(r);await assert.rejects(reward(o,1,'competing'),error('OVERFLOW'));}
  else{const result=await Promise.allSettled([reward(o,1,'competing'),fail(r)]);assert.equal(result[1].status,'fulfilled');if(result[0].status==='rejected')assert.equal(result[0].reason.code,'OVERFLOW');}
  const paid=await refundCount(r);assert.equal(await balance(o),MAX);assert.equal((await repo.readAdmission(db,r.request_id)).state,'failed');assert.equal(paid.n,1);assert([4,5].includes(paid.amount));
 }
 // Multiple expired obligations still protect sequence slots, not numeric balance.
 await clear();o=await account(MAX);rows=[];for(let n=0;n<3;n++)rows.push(await admit(o,{now:now+n*60000}));
 await reward(o,1);await Promise.all(rows.flatMap(row=>Array.from({length:4},()=>admission.recoverExpiredGeneration(db,row.request_id,now+180000))));
 assert.equal(await balance(o),MAX);assert.equal((await first("SELECT count(*) n FROM assistant_admissions WHERE state='refund_pending'")).n,0);assert.equal((await first("SELECT count(*) n FROM assistant_admissions WHERE state='failed'")).n,3);assert.equal((await first("SELECT sum(requested_amount-applied_amount) n FROM credit_ledger WHERE wallet_id=? AND operation='refund'",o.principalId)).n,1);
 // A zero-row SQL fault stays recoverable; no artificial reward balance reservation.
 await clear();o=await account(100);r=await admit(o);
 await run("CREATE TRIGGER test_headroom_refund_ignore BEFORE INSERT ON credit_ledger WHEN NEW.operation='refund' BEGIN SELECT RAISE(IGNORE); END");
 assert.equal((await fail(r)).state,'refund_pending');await reward(o,1);assert.deepEqual(await refundCount(r),{n:0,amount:0});await run('DROP TRIGGER test_headroom_refund_ignore');
 assert.equal((await admission.recoverExpiredGeneration(db,r.request_id,now+3*86400000)).state,'failed');assert.equal(await balance(o),101);
 // Unrelated smaller refunds cannot consume a pending request's reserved sequence.
 await clear();o=await account(MAX);r=await admit(o);await run("UPDATE assistant_admissions SET state='refund_pending' WHERE request_id=?",r.request_id);
 await assert.rejects(credit.refund({owner:o,amount:1,idempotencyKey:'unrelated-refund',originalEntryId:r.debit_entry_id}),error('INVALID_REFUND'));assert.equal((await fail(r)).state,'failed');
 // Completion remains immutable; rewards and duplicate keys keep their ordinary semantics.
 await clear();o=await account(MAX);r=await admit(o);assert.equal((await reward(o,1,'same-key')).status,'applied');assert.equal((await reward(o,1,'same-key')).status,'duplicate');assert.equal((await complete(r)).completed,true);assert.equal((await fail(r)).state,'completed');assert.equal((await fail(r)).refund,null);
 for(const kind of ['reward','migration','race_payout','admin_adjustment']){await clear();o=await account(MAX);r=await admit(o);assert.equal((await credit.credit({owner:o,amount:1,kind,idempotencyKey:'allowed'})).appliedAmount,1);assert.equal((await fail(r)).state,'failed');assert.equal((await fail(r)).refund.applied,4);}
 // Incoming migration/first-login claims are no longer postponed for refund balance priority.
 await clear();o=await account(MAX-12);let g=await guest();r=await admit(o);const migrated=await login(o,g);
 assert.equal(migrated.notice.migrated,10);assert.equal(migrated.notice.firstLogin,3);assert.equal(await balance(o),MAX-4);assert.equal((await first('SELECT retired_at FROM credit_principals WHERE id=?',g.principalId)).retired_at,new Date(now).toISOString());assert.equal((await login(o,g)).notice.firstLogin,0);assert.equal((await fail(r)).state,'failed');assert.deepEqual((await fail(r)).refund,{requested:5,applied:4,forfeited:1,full:false});
 // Actual overflow still rolls back the complete login batch, preserving both claims.
 await clear();o=await account(MAX-7);g=await guest();r=await admit(o);await assert.rejects(login(o,g),error('UNAVAILABLE'));assert.equal(await balance(g),10);for(const key of ['guest_migration_v1','account_first_login_v1'])assert.equal((await first('SELECT count(*) n FROM credit_ledger WHERE wallet_id=? AND idempotency_key=?',o.principalId,key)).n,0);
 await clear();o=await account(MAX-13);g=await guest();r=await admit(o);const race=await Promise.all([login(o,g),fail(r)]);assert.equal(race[0].notice.migrated,10);assert.equal(race[1].state,'failed');assert.equal(await balance(o),MAX);
 await clear();o=await account(MAX-2);r=await admit(o);assert.equal((await login(o,null)).notice.firstLogin,3);assert.equal((await login(o,null)).notice.firstLogin,0);
 // Time-limited attendance/Quiz claims are consumed only with their actual reward.
 await clear();o=await account(MAX);r=await admit(o);assert.equal((await visit(o)).rewards[0].applied,1);assert.equal((await visit(o)).rewards.length,0);
 await clear();o=await account(MAX);const q=await quiz();r=await admit(o);assert.equal((await answer(o,q)).credit.applied,3);assert.equal((await answer(o,q)).credit.newlyApplied,false);await run("UPDATE quizzes SET status='draft' WHERE id=?",q.id);assert.equal((await first('SELECT count(*) n FROM credit_ledger WHERE wallet_id=? AND idempotency_key=?',o.principalId,policy.quizRewardKey(q.id))).n,1);
 await clear();const midnight=Date.parse('2026-10-16T14:59:59.500Z');o=await account(MAX);r=await admit(o,{now:midnight});assert.equal((await visit(o,midnight)).rewards[0].applied,1);const nextDay=await visit(o,midnight+1000);assert.equal(nextDay.attendance.streak,2);assert.equal(nextDay.attendance.days.find(d=>d.date==='2026-10-16').missed,false);
 await clear();o=await account(MAX-6);const monday=Date.parse('2026-10-11T15:00:00Z');for(let d=0;d<6;d++)assert.equal((await visit(o,monday+d*86400000)).rewards[0].applied,1);
 const sunday=Date.parse('2026-10-18T14:59:59.500Z');r=await admit(o,{now:sunday});assert.equal((await visit(o,sunday)).rewards[0].applied,5);assert.equal((await visit(o,sunday)).rewards.length,0);assert.equal(await balance(o),MAX);
 // Synthetic legacy Guest admissions exercise compatibility ONLY; current admission denies Guest.
 // The debit is created through audited Credit SQL, never an edited balance or disabled trigger.
 async function legacyGuest(target){await clear();const owner=await guest(),i=input(owner);await assert.rejects(repo.insertAdmission(db,i),error('LOGIN_REQUIRED'));
  const debit=await credit.debit({owner,amount:5,kind:'ai_spend',idempotencyKey:m('assistant/credit').spendKey(i.requestId,i.inputHmac),reference:{type:'assistant_request',id:i.requestId}});
  await run("INSERT INTO assistant_admissions(request_id,action,session_hash,network_hash,input_hmac,owner_token,principal_id,debit_entry_id,weight,reserved_cost_micros,state,created_at,lease_expires_at,expires_at) VALUES(?,'qa',?,?,?,?,?,?,1,10000,'started',?,?,?)",i.requestId,i.sessionHash,i.networkHash,i.inputHmac,i.ownerToken,owner.principalId,debit.entryId,now,now+60000,now+172800000);
  if(target>5)await reward(owner,target-5);return {owner,row:await repo.readAdmission(db,i.requestId)};}
 for(const target of [5,8,10]){
  const {owner,row}=await legacyGuest(target),expected={requested:5,applied:10-target,forfeited:target-5,full:target===5};
  const results=await Promise.all(Array.from({length:8},()=>fail(row)));assert(results.every(x=>x.state==='failed'));for(const result of results)assert.deepEqual(result.refund,expected);
  assert.equal(await balance(owner),10);assert.deepEqual(await refundCount(row),{n:1,amount:10-target});
  await credit.debit({owner,amount:5,kind:'admin_adjustment',idempotencyKey:'later-space'});
  assert.deepEqual((await admission.recoverExpiredGeneration(db,row.request_id,now+180000)).refund,expected);assert.equal(await balance(owner),5);
  await assert.rejects(credit.refund({owner,amount:1,originalEntryId:row.debit_entry_id,idempotencyKey:'forfeited-never-retried'}),error('INVALID_REFUND'));
  const reader=await account();await admit(reader,{now:now+3*86400000});assert.equal(await repo.readAdmission(db,row.request_id),undefined);assert.deepEqual(await refundCount(row),{n:1,amount:10-target});
  await assert.rejects(admit(owner,{requestId:row.request_id,now:now+3*86400000}),error('RESULT_NOT_RETAINED'));
  await assert.rejects(admit(owner,{requestId:row.request_id,inputHmac:hash('changed'),now:now+3*86400000}),error('REQUEST_CONFLICT'));
 }
 // Service settlement exposes partial accounting, without any provider integration.
 {const {row}=await legacyGuest(8);const profile={id:'synthetic-b3',maxInputTokens:1,maxOutputTokens:1,inputMicrosPerMillion:1,outputMicrosPerMillion:1};
 const result=await admission.settleGeneration(db,{row,profile},{valid:false},now+1);assert.equal(result.status,'failed');assert.deepEqual(result.refund,{requested:5,applied:2,forfeited:3,full:false});}
 // Guest refund/reward serialize under real D1; either result is accurately terminal.
 for(let n=0;n<4;n++){const {owner,row}=await legacyGuest(8);await Promise.all([reward(owner,1),fail(row)]);const result=await repo.readAdmission(db,row.request_id);assert.equal(result.state,'failed');assert([1,2].includes(result.refund.applied));assert.equal(result.refund.forfeited,5-result.refund.applied);assert.equal(await balance(owner),10);assert.equal((await refundCount(row)).n,1);}
 // Lost partial-refund response and expired-lease recovery retain the exact ledger outcome.
 {const {owner,row}=await legacyGuest(8);let calls=0;const lost={prepare:s=>db.prepare(s),async batch(statements){const result=await db.batch(statements);if(++calls===2)throw new Error('local-lost-response');return result;}};
 await assert.rejects(repo.failAdmission(lost,row.request_id,row.owner_token,now+1),error('ADMISSION_UNAVAILABLE'));assert.deepEqual((await admission.recoverExpiredGeneration(db,row.request_id,now+60001)).refund,{requested:5,applied:2,forfeited:3,full:false});assert.equal(await balance(owner),10);assert.deepEqual(await refundCount(row),{n:1,amount:2});}
 {const {row}=await legacyGuest(8);assert.deepEqual((await admission.recoverExpiredGeneration(db,row.request_id,now+60001)).refund,{requested:5,applied:2,forfeited:3,full:false});}
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
   const guard=m('credit/refund-headroom').refundSequencePredicate(c.command,next.debitEntryId),b=MAX-room,v=MAX-remaining;
   const result=await first(`WITH w AS (SELECT ? AS principal_id,? AS balance,? AS version),input AS (SELECT ? AS amount) SELECT ${guard.sql} AS allowed FROM w CROSS JOIN input`,o.principalId,b,v,c.amount,...guard.bindings);
   const postSlots=BigInt(n+c.newSlots-c.released);
   const expected=postSlots<=BigInt(MAX)-BigInt(v)-1n;
   assert.equal(result.allowed,expected?1:0);sequenceCases++;
  }
  // Concrete SQL boundary examples: last slot is reserved for its own full refund.
  if(n===1){const c=cases.at(-1),guard=m('credit/refund-headroom').refundSequencePredicate(c.command,next.debitEntryId);assert.equal((await first(`WITH w AS(SELECT ? AS principal_id,? AS balance,? AS version),input AS(SELECT 5 AS amount) SELECT ${guard.sql} allowed FROM w CROSS JOIN input`,o.principalId,MAX-5,MAX-1,...guard.bindings)).allowed,1);}
  await run('DELETE FROM assistant_admissions WHERE request_id=?',next.requestId);for(const row of rows)assert.equal((await fail(row,now+300000)).state,'failed');
 }
 // No mutation of safety triggers, no direct balance change, reviewed Account refund guard remains unchanged by runtime operations.
 assert.deepEqual((await db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' AND name LIKE 'credit_%' ORDER BY name").all()).results,originalTriggers);
 await assert.rejects(run('UPDATE credit_wallets SET version=? WHERE principal_id=?',MAX,o.principalId));await audit();
 await clear();const backupOwner=await account(),backupAdmission=await admit(backupOwner);await fail(backupAdmission);
 const backup=await m('backup/export').exportBackup(db,new Date(now));assert.equal(m('backup/validator').validateBackup(backup).version,6);assert.equal(Object.keys(backup.tables).length,14);assert(!Object.hasOwn(backup.tables,'assistant_admissions'));assert.equal(m('backup/restore-plan').buildRestorePlan(backup).executable,false);assert.equal(outbound,0);
 // Even v6 rejects arbitrary underpayment when full capacity is available.
 const invalid=structuredClone(backup),entry=invalid.tables.credit_ledger.find(e=>e.original_entry_id===backupAdmission.debit_entry_id),wallet=invalid.tables.credit_wallets.find(w=>w.principal_id===backupOwner.principalId);
 entry.applied_amount=4;entry.resulting_balance=99;wallet.balance=99;
 assert.throws(()=>m('backup/validator').validateBackup(invalid),/Invalid Credit ledger effect/);
 console.log(`Assistant headroom: ${assertions} assertions PASS; real D1 balance/refund/reward/migration/rollback and full ledger audit; ${sequenceCases} simulated sequence/balance SQL boundary cases (not real MAX-length history). Capacity-first Account/Guest settlement and sequence protection PASS; historical v4/v5 rejection separately verified by test:account-partial-refund. Provider calls ZERO.`);
}finally{await mf.dispose();loaded.dispose();}
