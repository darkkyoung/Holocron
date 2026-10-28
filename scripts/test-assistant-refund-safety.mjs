import nodeAssert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
let assertions=0;
const assert=new Proxy(nodeAssert,{apply(t,s,a){assertions++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{assertions++;return t[k](...a);}:t[k];}});
const paths=['assistant/admission','assistant/repository','assistant/credit','assistant/types','assistant/http','assistant/cost','assistant/limits','identity/repository','identity/service','identity/account-session','credit/service','credit/account-login','backup/export','backup/validator','backup/restore-plan'];
const loaded=await loadTestModules(paths.map(p=>'lib/'+p+'.ts')),m=p=>loaded.modules['lib/'+p+'.ts'];
const repo=m('assistant/repository'),admission=m('assistant/admission'),creditBoundary=m('assistant/credit'),identity=m('identity/repository');
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler')),{Miniflare}=wr('miniflare');
let outbound=0;
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("refund-test-only")}}',compatibilityDate:'2026-05-15',d1Databases:['DB'],outboundService:()=>{outbound++;throw new Error('No provider');}});
const now=Date.parse('2026-10-16T06:00:00.000Z'),MAX=Number.MAX_SAFE_INTEGER,hash=s=>createHash('sha256').update(s).digest('hex'),error=c=>e=>e.code===c;
const profile={id:'synthetic-b1',maxInputTokens:10000,maxOutputTokens:2000,inputMicrosPerMillion:1000000,outputMicrosPerMillion:2000000};
let db,credit;
const run=(sql,...args)=>db.prepare(sql).bind(...args).run(),first=(sql,...args)=>db.prepare(sql).bind(...args).first();
const clear=()=>run('DELETE FROM assistant_admissions'); // local fixture isolation only
const balance=async o=>(await credit.getBalance(o)).balance;
async function account(amount=100){const a=await identity.createAccount(db,new Date(now));if(amount)await credit.credit({owner:a.owner,amount,kind:'reward',idempotencyKey:'seed'});return a;}
async function guest(){const g=await m('identity/service').createGuest(db,'synthetic-guest-signing-secret-32-bytes',now);await credit.credit({owner:g.owner,amount:10,kind:'reward',idempotencyKey:'seed'});return g;}
function input(o,extra={}){return {requestId:crypto.randomUUID(),action:'qa',sessionHash:hash(o.principalId),networkHash:hash('synthetic-network'),previousNetworkHash:hash('synthetic-old-network'),inputHmac:hash('synthetic-input'),ownerToken:crypto.randomUUID(),principalId:o.principalId,debitEntryId:crypto.randomUUID(),weight:1,credits:5,reservedCostMicros:14000,now,...extra};}
const admit=(o,extra)=>repo.insertAdmission(db,input(o,extra));
const failure=(row,time=now+1,actual=null)=>repo.failAdmission(db,row.request_id,row.owner_token,time,actual);
const refunds=row=>first('SELECT count(*) n,COALESCE(sum(applied_amount),0) total FROM credit_ledger WHERE original_entry_id=?',row.debit_entry_id);
const reward=(o,amount,key=crypto.randomUUID())=>credit.credit({owner:o,amount,kind:'reward',idempotencyKey:key});
const debit=(o,amount)=>credit.debit({owner:o,amount,kind:'ai_spend',idempotencyKey:crypto.randomUUID()});
async function cleanupAt(time){const o=(await account()).owner;const row=await admit(o,{now:time});await repo.completeAdmission(db,row.request_id,row.owner_token,null,time+1);}
try{
 db=await mf.getD1Database('DB');
 for(const f of (await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())await db.batch(require('wrangler').unstable_splitSqlQuery(await readFile('drizzle/'+f,'utf8')).map(s=>db.prepare(s)));
 credit=m('credit/service').creditService(db);
 // Guest: all prices, simultaneous requests, zero admission/ledger mutations.
 let g=await guest();const before=(await first('SELECT count(*) n FROM credit_ledger')).n;
 const denied=await Promise.allSettled(Array.from({length:18},(_,n)=>{const action=['qa','planner','draft'][n%3],p=m('assistant/limits').AI_ACTIONS[action];return admit(g.owner,{action,credits:p.credits,weight:p.weight});}));
 assert(denied.every(r=>r.status==='rejected'&&r.reason.code==='LOGIN_REQUIRED'&&r.reason.status===401));assert.equal(await balance(g.owner),10);assert.equal((await first('SELECT count(*) n FROM credit_ledger')).n,before);assert.equal((await first('SELECT count(*) n FROM assistant_admissions')).n,0);
 const response=m('assistant/http').assistantErrorResponse(denied[0].reason);assert.equal(response.status,401);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('vary'),'Cookie');const safe=await response.json();assert.equal(safe.error.code,'LOGIN_REQUIRED');assert.match(safe.error.message,/로그인/);assert(!JSON.stringify(safe).includes(g.owner.principalId));
 // Service rejects before profile, receipt, network and admission paths (no price/owner from client).
 const request=cookie=>new Request('https://local.test',{headers:cookie?{cookie}:undefined});
 const deps={enabled:true,now:()=>now,identitySecrets:{guest:'synthetic-guest-signing-secret-32-bytes'},profiles:{},network(){throw new Error('must not reach network');}};
 const body={requestId:crypto.randomUUID(),action:'qa',receipt:'not-valid',selectedStoryIds:[]};
 for(const cookie of [undefined,g.setCookie.split(';')[0]]){
  const queries=[];const observed={prepare(sql){queries.push(sql);return db.prepare(sql);}};
  await assert.rejects(admission.beginGenerationAdmission(observed,request(cookie),body,deps),error('LOGIN_REQUIRED'));
  assert(queries.every(s=>/^SELECT /i.test(s)));assert(queries.every(s=>!s.includes('assistant_admissions')&&!s.includes('articles')));
 }
 // Defense in depth: even a synthetic old Guest admission cannot authorize a new debit.
 const legacy=input(g.owner);await run(`INSERT INTO assistant_admissions(request_id,action,session_hash,network_hash,input_hmac,owner_token,principal_id,debit_entry_id,weight,reserved_cost_micros,actual_cost_micros,state,created_at,lease_expires_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,NULL,'started',?,?,?)`,legacy.requestId,legacy.action,legacy.sessionHash,legacy.networkHash,legacy.inputHmac,legacy.ownerToken,legacy.principalId,legacy.debitEntryId,1,14000,now,now+60000,now+172800000);
 await creditBoundary.prepareAssistantDebit(db,g.owner.principalId,'qa',legacy.requestId,legacy.ownerToken,legacy.debitEntryId,legacy.inputHmac,now,5).run();assert.equal(await balance(g.owner),10);assert.equal(await first('SELECT id FROM credit_ledger WHERE id=?',legacy.debitEntryId),null);await clear();
 // Migration racing stale Guest service/SQL handles never adopts the destination Account implicitly.
 for(let n=0;n<5;n++){
  g=await guest();const a=await account(0);const results=await Promise.allSettled([admit(g.owner),m('credit/account-login').applyAccountLogin(db,a.owner,g.owner,new Date(now))]);
  assert.equal(results[0].status,'rejected');assert.equal(results[0].reason.code,'LOGIN_REQUIRED');assert.equal(results[1].status,'fulfilled');assert.equal(await balance(a.owner),13);assert.equal((await first('SELECT count(*) n FROM assistant_admissions')).n,0);
  await assert.rejects(admit(g.owner),error('LOGIN_REQUIRED'));assert.equal((await first("SELECT count(*) n FROM credit_ledger WHERE wallet_id=? AND kind='ai_spend'",g.owner.principalId)).n,0);
 }
 // Account refunds exact price despite ordinary intervening rewards, duplicates and cancellation races.
 for(const [action,amount,weight] of [['qa',5,1],['planner',7,4],['draft',15,4]]){
  await clear();const a=await account();const row=await admit(a.owner,{action,credits:amount,weight});assert.equal(await balance(a.owner),100-amount);await reward(a.owner,3);
  const settled=await Promise.all(Array.from({length:12},()=>failure(row)));assert(settled.every(r=>r.state==='failed'));assert.equal(await balance(a.owner),103);assert.deepEqual(await refunds(row),{n:1,total:amount});
  assert.equal((await admission.recoverExpiredGeneration(db,row.request_id,now+180000000)).state,'failed');assert.deepEqual(await refunds(row),{n:1,total:amount});
 }
 // SQL exception rolls back state and refund together; later retry recovers exactly once.
 await clear();let a=await account(),row=await admit(a.owner);
 await run("CREATE TRIGGER test_refund_abort BEFORE INSERT ON credit_ledger WHEN NEW.operation='refund' BEGIN SELECT RAISE(ABORT,'synthetic-private-detail'); END");
 await assert.rejects(failure(row),error('ADMISSION_UNAVAILABLE'));assert.equal((await repo.readAdmission(db,row.request_id)).state,'started');assert.equal(await balance(a.owner),95);assert.deepEqual(await refunds(row),{n:0,total:0});
 await cleanupAt(now+3*86400000);assert.equal((await repo.readAdmission(db,row.request_id)).state,'started');await run('DROP TRIGGER test_refund_abort');
 assert.equal((await admission.recoverExpiredGeneration(db,row.request_id,now+3*86400000+1)).state,'failed');assert.equal(await balance(a.owner),100);assert.deepEqual(await refunds(row),{n:1,total:5});
 // A zero-row refund cannot be marked paid, or cleaned as an expired obligation.
 await clear();a=await account();row=await admit(a.owner);
 await run("CREATE TRIGGER test_refund_ignore BEFORE INSERT ON credit_ledger WHEN NEW.operation='refund' BEGIN SELECT RAISE(IGNORE); END");
 assert.equal((await failure(row)).state,'refund_pending');assert.equal(await balance(a.owner),95);await cleanupAt(now+3*86400000);assert.equal((await repo.readAdmission(db,row.request_id)).state,'refund_pending');
 await run('DROP TRIGGER test_refund_ignore');const recovered=await Promise.all(Array.from({length:12},()=>admission.recoverExpiredGeneration(db,row.request_id,now+3*86400000+1)));assert(recovered.every(r=>r.state==='failed'));assert.equal(await balance(a.owner),100);assert.deepEqual(await refunds(row),{n:1,total:5});
 // Loss of a successful refund response: replay sees the durable refund, never appends again.
 await clear();a=await account();row=await admit(a.owner);let calls=0;
 const ambiguous={prepare:s=>db.prepare(s),async batch(statements){const result=await db.batch(statements);if(++calls===2)throw new Error('synthetic-lost-reply');return result;}};
 await assert.rejects(repo.failAdmission(ambiguous,row.request_id,row.owner_token,now+1),error('ADMISSION_UNAVAILABLE'));assert.equal(await balance(a.owner),100);assert.equal((await failure(row)).state,'failed');assert.deepEqual(await refunds(row),{n:1,total:5});
 // Usage validation failure must refund with unknown billing, including a nominally valid outcome.
 for(const valid of [true,false])for(const usage of [{inputTokens:-1,outputTokens:0},{inputTokens:10001,outputTokens:0},{inputTokens:NaN,outputTokens:0},{inputTokens:1.5,outputTokens:0}]){
  await clear();a=await account();row=await admit(a.owner);assert.equal((await admission.settleGeneration(db,{row,profile},{valid,usage},now+1)).status,'failed');assert.equal(await balance(a.owner),100);assert.equal((await repo.readAdmission(db,row.request_id)).actual_cost_micros,null);assert.deepEqual(await refunds(row),{n:1,total:5});
 }
 for(const actual of [-1,NaN,Infinity,1.5,14001]){
  await clear();a=await account();row=await admit(a.owner);assert.equal((await failure(row,now+1,actual)).state,'failed');assert.equal(await balance(a.owner),100);assert.equal((await repo.readAdmission(db,row.request_id)).actual_cost_micros,null);
 }
 // Expired lease + late success refund once; newer request retains its ownership token and state.
 await clear();a=await account();row=await admit(a.owner);const next=await admit(a.owner,{now:now+60000});assert.equal((await admission.settleGeneration(db,{row,profile},{valid:true},now+60001)).status,'failed');assert.equal((await repo.readAdmission(db,next.request_id)).state,'started');assert.equal(await balance(a.owner),95);await failure(next,now+60002);assert.equal(await balance(a.owner),100);
 // Simultaneous completed vs failed cannot both spend successfully and refund.
 for(let n=0;n<8;n++){
  await clear();a=await account();row=await admit(a.owner);await Promise.all([repo.completeAdmission(db,row.request_id,row.owner_token,null,now+1),failure(row)]);const final=await repo.readAdmission(db,row.request_id);
  assert(['completed','failed'].includes(final.state));assert.equal(await balance(a.owner),final.state==='completed'?95:100);assert.equal((await refunds(row)).n,final.state==='completed'?0:1);
 }
 // Retention is lazy, not a 48-hour physical deletion guarantee.
 await clear();a=await account();const completed=await admit(a.owner);await repo.completeAdmission(db,completed.request_id,completed.owner_token,null,now+1);
 assert.equal((await repo.readAdmission(db,completed.request_id)).expires_at,now+172800000);await cleanupAt(now+172799999);assert(await repo.readAdmission(db,completed.request_id));
 // Merely reading at/after expiry never performs cleanup.
 assert(await repo.readAdmission(db,completed.request_id));await cleanupAt(now+172800000);assert.equal(await repo.readAdmission(db,completed.request_id),undefined);
 const failedOwner=(await account()).owner;const failed=await admit(failedOwner,{now:now+1000});await failure(failed,now+1001);await cleanupAt(now+172801000);assert.equal(await repo.readAdmission(db,failed.request_id),undefined);assert.deepEqual(await refunds(failed),{n:1,total:5});
 // A damaged terminal label without its durable refund must not hide an obligation.
 await clear();a=await account();row=await admit(a.owner);await run("UPDATE assistant_admissions SET state='failed' WHERE request_id=?",row.request_id);await cleanupAt(now+3*86400000);assert(await repo.readAdmission(db,row.request_id));assert.equal(await balance(a.owner),95);
 await run("UPDATE assistant_admissions SET state='refund_pending' WHERE request_id=?",row.request_id);await failure(row,now+3*86400000+1);await cleanupAt(now+3*86400000+2);assert.equal(await repo.readAdmission(db,row.request_id),undefined);assert.deepEqual(await refunds(row),{n:1,total:5});
 // Genuine Account numeric boundary: all balances established through protected Credit APIs.
 await clear();a=await account(MAX);row=await admit(a.owner);assert.equal(await balance(a.owner),MAX-5);assert.equal((await failure(row)).state,'failed');assert.equal(await balance(a.owner),MAX);
 await assert.rejects(reward(a.owner,1),error('OVERFLOW'));assert.equal(await balance(a.owner),MAX);
 // B.4: rewards take balance capacity; 0018 permits terminal Account partial refunds.
 await clear();a=await account(MAX);row=await admit(a.owner);
 await reward(a.owner,1,'ordinary-plus-one');assert.equal(await balance(a.owner),MAX-4);
 assert.equal((await failure(row)).state,'failed');assert.deepEqual((await failure(row)).refund,{requested:5,applied:4,forfeited:1,full:false});assert.deepEqual(await refunds(row),{n:1,total:4});
 await cleanupAt(now+3*86400000);assert.equal(await repo.readAdmission(db,row.request_id),undefined);
 // Migration consumes actual available capacity normally; no refund-priority rejection.
 await clear();a=await account(MAX-12);g=await guest();row=await admit(a.owner);
 const migrated=await m('credit/account-login').applyAccountLogin(db,a.owner,g.owner,new Date(now+1));
 assert.equal(migrated.notice.migrated,10);assert.equal(migrated.notice.firstLogin,3);assert.equal(await balance(a.owner),MAX-4);
 assert.equal((await failure(row)).state,'failed');assert.deepEqual(await refunds(row),{n:1,total:4});
 // Existing safety triggers remain enabled. No direct mutation/history edits to solve overflow.
 await assert.rejects(run('UPDATE credit_wallets SET balance=0 WHERE principal_id=?',a.owner.principalId));await assert.rejects(run('DELETE FROM credit_ledger WHERE id=?',row.debit_entry_id));
 assert.equal((await first("SELECT count(*) n FROM sqlite_master WHERE type='trigger' AND name LIKE 'credit_%' AND name NOT LIKE 'credit_policy_%'")).n,8);
 // Reconcile every sequence using BigInt; floats and an audit of only final balances are insufficient.
 const wallets=(await db.prepare('SELECT * FROM credit_wallets').all()).results;
 for(const wallet of wallets){const entries=(await db.prepare('SELECT * FROM credit_ledger WHERE wallet_id=? ORDER BY sequence').bind(wallet.principal_id).all()).results;let total=BigInt(0);for(let n=0;n<entries.length;n++){const e=entries[n];total+=BigInt(e.applied_amount);assert.equal(e.sequence,n+1);assert.equal(total,BigInt(e.resulting_balance));}assert.equal(total,BigInt(wallet.balance));assert.equal(entries.length,wallet.version);}
 const backup=await m('backup/export').exportBackup(db,new Date());assert.equal(m('backup/validator').validateBackup(backup).version,12);assert.equal(backup.schema.latestMigration,'0022_paid_chat_admissions.sql');assert.equal(Object.keys(backup.tables).length,16);assert(!Object.hasOwn(backup.tables,'assistant_admissions'));assert.equal(m('backup/restore-plan').buildRestorePlan(backup).executable,false);
 assert.equal(outbound,0);
 console.log(`Assistant refund safety: ${assertions} assertions PASS; real D1 Guest denial, Account settlement/rollback/recovery/retention and full ledger audit. Capacity-first policy reconciled; Account full/partial/zero refunds evaluated by test:assistant-headroom. Provider calls ZERO.`);
}finally{await mf.dispose();loaded.dispose();}
