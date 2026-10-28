import nodeAssert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
let assertions=0;
const assert=new Proxy(nodeAssert,{apply(t,s,a){assertions++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{assertions++;return t[k](...a);}:t[k];}});
const paths=['assistant/repository','assistant/admission','assistant/abuse-identity','assistant/cost','assistant/limits','assistant/identity','assistant/service','assistant/http','identity/service','identity/repository','identity/account-session','credit/service','credit/account-login','credit/repository','backup/export','backup/validator','backup/restore-plan'];
const loaded=await loadTestModules(paths.map(p=>'lib/'+p+'.ts')),m=p=>loaded.modules['lib/'+p+'.ts'];
const repo=m('assistant/repository'),admission=m('assistant/admission'),cost=m('assistant/cost'),abuse=m('assistant/abuse-identity');
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler')),{Miniflare}=wr('miniflare'),split=require('wrangler').unstable_splitSqlQuery;
let outbound=0;
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("local")}}',compatibilityDate:'2026-05-15',d1Databases:['DB','UPGRADE'],outboundService:()=>{outbound++;throw new Error('No provider/network');}});
const now=Date.parse('2026-10-16T12:00:00Z'),hash=s=>createHash('sha256').update(s).digest('hex'),error=code=>e=>e.code===code;
const profile={id:'synthetic-only-v1',maxInputTokens:10000,maxOutputTokens:2000,inputMicrosPerMillion:1000000,outputMicrosPerMillion:2000000};
const secret='synthetic-assistant-signing-secret-32-bytes',abuseSecret='synthetic-abuse-secret-is-not-a-production-key';
let db,credit;
const run=(sql,...args)=>db.prepare(sql).bind(...args).run();
const first=(sql,...args)=>db.prepare(sql).bind(...args).first();
const reset=()=>run('DELETE FROM assistant_admissions');
const balance=async owner=>(await credit.getBalance(owner)).balance;
async function owner(type='account',amount=100){
 const o=type==='guest'?(await m('identity/service').createGuest(db,'synthetic-guest-secret-at-least-32-bytes',now)).owner:(await m('identity/repository').createAccount(db,new Date(now))).owner;
 if(amount)await credit.credit({owner:o,amount,kind:'reward',idempotencyKey:'fixture'});
 return o;
}
function input(o,overrides={}){return {requestId:crypto.randomUUID(),action:'qa',sessionHash:hash(o.principalId),networkHash:hash('network'),previousNetworkHash:hash('old-network'),inputHmac:hash('input'),ownerToken:crypto.randomUUID(),principalId:o.principalId,debitEntryId:crypto.randomUUID(),weight:1,credits:5,reservedCostMicros:cost.reserveCost(profile),now,...overrides};}
const admit=(o,overrides)=>repo.insertAdmission(db,input(o,overrides));
const finish=(row,time=now+1,actual=null)=>repo.completeAdmission(db,row.request_id,row.owner_token,actual,time);
const fail=(row,time=now+1)=>repo.failAdmission(db,row.request_id,row.owner_token,time);
async function generationFixture(o,extra={}){const time=extra.created_at??now;const r=await admit(o,{now:time,...(extra.network_hash?{networkHash:extra.network_hash}:{})});await finish(r,time+1);return r;}
try{
 db=await mf.getD1Database('DB');const upgrade=await mf.getD1Database('UPGRADE');
 const files=(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort();assert.equal(files.at(-1),'0021_free_chat_admissions.sql');
 for(const f of files){const bytes=await readFile('drizzle/'+f,'utf8');await db.batch(split(bytes).map(s=>db.prepare(s)));if(f<'0017')await upgrade.batch(split(bytes).map(s=>upgrade.prepare(s)));}
 const migration=await readFile('drizzle/0017_assistant_admissions.sql','utf8');assert(!migration.includes('\r'));assert.doesNotMatch(migration,/\bCASE\b|CREATE TRIGGER/i);assert.equal(split(migration).length,6);assert.equal(split(migration).length,migration.split('--> statement-breakpoint').length);
 assert.equal(createHash('sha256').update(await readFile('drizzle/0016_account_credit_foundation.sql')).digest('hex'),'4077c5a0db8bdf20263bcb1cc44592c8890b983af8cc1b21711403001fe4dcea');
 await upgrade.prepare("INSERT INTO settings VALUES ('upgrade_sentinel','preserved')").run();
 const upgradedOwner=await m('identity/repository').createAccount(upgrade,new Date(now));
 // Seed the pre-0017 upgrade fixture through the original audit triggers, not new runtime SQL.
 await upgrade.prepare("INSERT INTO credit_ledger(id,wallet_id,sequence,operation,kind,idempotency_key,requested_amount,applied_amount,resulting_balance,created_at) VALUES(?,?,1,'credit','reward','upgrade-fixture',9,9,9,?)").bind(crypto.randomUUID(),upgradedOwner.owner.principalId,new Date(now).toISOString()).run();
 await upgrade.batch(split(migration).map(s=>upgrade.prepare(s)));
 await upgrade.batch(split(await readFile('drizzle/0018_account_partial_refund.sql','utf8')).map(s=>upgrade.prepare(s)));
 await upgrade.batch(split(await readFile('drizzle/0019_credit_policy_budget.sql','utf8')).map(s=>upgrade.prepare(s)));
 await upgrade.batch(split(await readFile('drizzle/0020_account_assistant_access.sql','utf8')).map(s=>upgrade.prepare(s)));
 await upgrade.batch(split(await readFile('drizzle/0021_free_chat_admissions.sql','utf8')).map(s=>upgrade.prepare(s)));
 assert.equal((await upgrade.prepare("SELECT value FROM settings WHERE key='upgrade_sentinel'").first()).value,'preserved');
 assert.equal((await m('credit/service').creditService(upgrade).getBalance(upgradedOwner.owner)).balance,9);
 assert.deepEqual((await db.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all()).results,(await upgrade.prepare("SELECT name,sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all()).results);
 credit=m('credit/service').creditService(db);
 assert.equal(cost.reserveCost(profile),14000);assert.equal(cost.estimatedCost(profile,{inputTokens:1,outputTokens:1}),3);
 for(const p of [undefined,{...profile,id:''},{...profile,maxInputTokens:0},{...profile,outputMicrosPerMillion:-1},{...profile,maxOutputTokens:1.1},{...profile,clientPrice:1}])assert.throws(()=>cost.reserveCost(p),error('INVALID_COST_PROFILE'));
 assert.throws(()=>cost.estimatedCost(profile,{inputTokens:10001,outputTokens:0}),error('INVALID_COST_PROFILE'));
 assert.throws(()=>cost.reserveCost({...profile,inputMicrosPerMillion:1_000_000_000}),error('INVALID_COST_PROFILE'));
 assert.equal(cost.estimatedCost({...profile,inputMicrosPerMillion:1,outputMicrosPerMillion:1},{inputTokens:1,outputTokens:1}),1);
 const identity=await abuse.admissionIdentity('session','synthetic-ip',abuseSecret,now);
 const tomorrow=await abuse.admissionIdentity('session','synthetic-ip',abuseSecret,now+86400000);
 assert.equal(identity.sessionHash,tomorrow.sessionHash);assert.notEqual(identity.networkHash,tomorrow.networkHash);assert.equal(identity.networkHash,tomorrow.previousNetworkHash);
 assert.notEqual(identity.sessionHash,await abuse.admissionHmac(abuseSecret,'other-domain','session'));
 await assert.rejects(abuse.admissionIdentity('s',null,abuseSecret,now),error('NETWORK_UNAVAILABLE'));
 const networkRequest=new Request('https://local.test',{headers:{'CF-Connecting-IP':'192.0.2.1','X-Forwarded-For':'203.0.113.9'}});
 assert.equal(abuse.trustedEdgeNetwork(networkRequest),null);Object.defineProperty(networkRequest,'cf',{value:{colo:'TEST'}});assert.equal(abuse.trustedEdgeNetwork(networkRequest),'192.0.2.1');
 const missing=new Request('https://local.test',{headers:{'X-Forwarded-For':'203.0.113.9'}});Object.defineProperty(missing,'cf',{value:{colo:'TEST'}});assert.equal(abuse.trustedEdgeNetwork(missing),null);
 // Atomic insert/debit, concurrent duplicate + input/owner collision.
 let a=await owner(),i=input(a);const duplicates=await Promise.allSettled(Array.from({length:16},()=>repo.insertAdmission(db,{...i,ownerToken:crypto.randomUUID(),debitEntryId:crypto.randomUUID()})));
 assert.equal(duplicates.filter(r=>r.status==='fulfilled').length,1);assert(duplicates.filter(r=>r.status==='rejected').every(r=>r.reason.code==='REQUEST_IN_PROGRESS'));assert.equal(await balance(a),95);
 let row=duplicates.find(r=>r.status==='fulfilled').value;
 await assert.rejects(repo.insertAdmission(db,{...i,inputHmac:hash('different')}),error('REQUEST_CONFLICT'));
 const other=await owner();await assert.rejects(repo.insertAdmission(db,{...input(other),requestId:i.requestId}),error('REQUEST_CONFLICT'));
 assert.equal((await first('SELECT count(*) n FROM credit_ledger WHERE reference_id=?',i.requestId)).n,1);
 assert.equal((await finish(row)).completed,true);await assert.rejects(repo.insertAdmission(db,i),error('RESULT_NOT_RETAINED'));
 assert.equal((await fail(row)).state,'completed');assert.equal(await balance(a),95);
 // Replaying after operational cleanup is permanently fenced by the authoritative ledger.
 await reset();await assert.rejects(repo.insertAdmission(db,{...i,now:now+3*86400000}),error('RESULT_NOT_RETAINED'));assert.equal(await balance(a),95);
 await assert.rejects(repo.insertAdmission(db,{...i,inputHmac:hash('changed-after-cleanup'),now:now+3*86400000}),error('REQUEST_CONFLICT'));
 await assert.rejects(repo.insertAdmission(db,{...input(other),requestId:i.requestId,now:now+3*86400000}),error('REQUEST_CONFLICT'));
 // Wallet concurrency even when sessions differ; admission cannot exceed available funds.
 a=await owner('account',5);const racing=await Promise.allSettled(Array.from({length:12},(_,n)=>admit(a,{sessionHash:hash('session'+n)})));
 assert.equal(racing.filter(r=>r.status==='fulfilled').length,1);assert.equal(await balance(a),0);assert.equal((await first('SELECT count(*) n FROM assistant_admissions')).n,1);
 assert(racing.filter(r=>r.status==='rejected').every(r=>r.reason.code==='INSUFFICIENT_BALANCE'));
 await reset();a=await owner('account',4);await assert.rejects(admit(a),error('INSUFFICIENT_BALANCE'));assert.equal((await first('SELECT count(*) n FROM assistant_admissions')).n,0);assert.equal(await balance(a),4);
 // Debit insert fails/no-ops: SQL invariant aborts whole transaction, not orphan admission.
 a=await owner();i=input(a);await run(`CREATE TRIGGER test_reject_debit BEFORE INSERT ON credit_ledger WHEN NEW.kind='ai_spend' BEGIN SELECT RAISE(IGNORE); END`);
 await assert.rejects(repo.insertAdmission(db,i),error('ADMISSION_UNAVAILABLE'));assert.equal(await balance(a),100);assert.equal(await first('SELECT * FROM assistant_admissions WHERE request_id=?',i.requestId),null);await run('DROP TRIGGER test_reject_debit');
 const broken={prepare:s=>db.prepare(s),batch:stmts=>db.batch([...stmts,db.prepare("SELECT json('rollback-test')")])};
 await assert.rejects(repo.insertAdmission(broken,i),error('ADMISSION_UNAVAILABLE'));assert.equal(await balance(a),100);assert.equal(await first('SELECT * FROM assistant_admissions WHERE request_id=?',i.requestId),null);
 await assert.rejects(repo.insertAdmission({prepare(){throw new Error('private SQL');}},i));
 // Ambiguous transport after COMMIT cannot cause a second debit on retry.
 const ambiguous={prepare:s=>db.prepare(s),async batch(stmts){await db.batch(stmts);throw new Error('lost response');}};
 i=input(a);await assert.rejects(repo.insertAdmission(ambiguous,i),error('ADMISSION_UNAVAILABLE'));assert.equal(await balance(a),95);
 await assert.rejects(repo.insertAdmission(db,{...i,ownerToken:crypto.randomUUID(),debitEntryId:crypto.randomUUID()}),error('REQUEST_IN_PROGRESS'));
 await reset();
 // Guest eligibility and exact Account prices. Rejection never charges.
 for(const [action,credits,weight] of [['qa',5,1],['planner',7,4],['draft',15,4]]){
  await reset();a=await owner();row=await admit(a,{action,credits,weight});assert.equal(await balance(a),100-credits);assert.equal(row.weight,weight);await finish(row);
  await assert.rejects(admit(a,{action,credits:1,weight}),error('PRICE_CHANGED'));
 }
 await reset();const g=await owner('guest',10);for(const [action,credits,weight] of [['qa',5,1],['planner',7,4],['draft',15,4]])await assert.rejects(admit(g,{action,credits,weight}),error('LOGIN_REQUIRED'));
 assert.equal(await balance(g),10);assert.equal((await first('SELECT count(*) n FROM assistant_admissions')).n,0);
 const refundAccount=await owner('account',10);row=await admit(refundAccount);assert.equal(await balance(refundAccount),5);
 const refunds=await Promise.all(Array.from({length:12},()=>fail(row)));assert(refunds.every(r=>r.state==='failed'));assert.equal(await balance(refundAccount),10);assert.equal((await first('SELECT count(*) n FROM credit_ledger WHERE original_entry_id=?',row.debit_entry_id)).n,1);
 // Deliberate regenerate after success is a new request/debit; quota is still consumed.
 await reset();a=await owner();row=await admit(a);await finish(row);const regenerated=await admit(a);assert.notEqual(row.request_id,regenerated.request_id);assert.equal(await balance(a),90);await fail(regenerated);
 // Completion vs cancellation linearizes to one final state, never success AND refund.
 await reset();a=await owner();row=await admit(a);await Promise.all([finish(row),fail(row)]);let final=await repo.readAdmission(db,row.request_id);assert(['completed','failed'].includes(final.state));assert.equal(await balance(a),final.state==='completed'?95:100);
 // Lease expiry frees concurrency but not quota or reservations; late owner cannot alter newer row.
 await reset();a=await owner();row=await admit(a);await assert.rejects(admit(a,{now:now+59999}),error('ADMISSION_LIMIT'));
 let newer=await admit(a,{now:now+60000});assert.equal((await finish(row,now+60000)).completed,false);assert.equal((await fail(row,now+60001)).state,'failed');assert.equal((await repo.readAdmission(db,newer.request_id)).state,'started');assert.equal(await balance(a),95);
 assert.equal((await repo.completeAdmission(db,newer.request_id,crypto.randomUUID(),null,now+60002)).completed,false);
 await assert.rejects(admission.recoverExpiredGeneration(db,newer.request_id,now+60001),error('REQUEST_IN_PROGRESS'));
 assert.equal((await admission.recoverExpiredGeneration(db,newer.request_id,now+120000)).state,'failed');assert.equal(await balance(a),100);
 // Global concurrent cap: real simultaneous batches, distinct owners/sessions/networks.
 await reset();const owners=await Promise.all(Array.from({length:8},()=>owner()));const global=await Promise.allSettled(owners.map((o,n)=>admit(o,{networkHash:hash('global-network'+n)})));
 assert.equal(global.filter(r=>r.status==='fulfilled').length,3);assert(global.filter(r=>r.status==='rejected').every(r=>r.reason.code==='ADMISSION_LIMIT'));
 for(let n=0;n<owners.length;n++)assert.equal(await balance(owners[n]),global[n].status==='fulfilled'?95:100);
 // Session rolling hour and UTC day independently (strict boundary semantics).
 await reset();a=await owner();for(let n=0;n<5;n++){row=await admit(a);await fail(row);}await assert.rejects(admit(a),error('ADMISSION_LIMIT'));assert.equal(await balance(a),100);
 await assert.rejects(admit(a,{now:now+3599999}),error('ADMISSION_LIMIT'));row=await admit(a,{now:now+3600000});await fail(row,now+3600001);
 for(let n=0;n<6;n++){row=await admit(a,{now:now+(n+2)*3600000});await finish(row,now+(n+2)*3600000+1);}
 await assert.rejects(admit(a,{now:now+9*3600000}),error('ADMISSION_LIMIT'));row=await admit(a,{now:now+12*3600000});assert.equal(row.state,'started');
 // Individual SQL quota predicates tested with local operational fixtures at exact ceilings.
 for(const [scope,limit] of [['network_hour',30],['network_day',80],['global_day',200]]){
  await reset();a=await owner();const seed=await generationFixture(a);await run('DELETE FROM assistant_admissions');
  const age=scope==='network_hour'?1000:2*3600000;
  await run(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<?)
    INSERT INTO assistant_admissions(request_id,action,session_hash,network_hash,input_hmac,owner_token,principal_id,debit_entry_id,weight,reserved_cost_micros,actual_cost_micros,state,created_at,lease_expires_at,expires_at) SELECT printf('fixture-%s-%d',?,x),'qa',?, ?, ?, ?, ?, ?,1,1,1,'failed',?,0,? FROM n`,limit,scope,hash('different-session'),scope==='global_day'?hash('other-network'):hash('network'),hash('input'),seed.owner_token,a.principalId,seed.debit_entry_id,now-age,now+86400000);
  const target=await owner();await assert.rejects(admit(target),error('ADMISSION_LIMIT'));assert.equal(await balance(target),100);
  if(scope==='network_hour'){row=await admit(target,{now:now+3600000-age});assert.equal(row.state,'started');}
 }
 // Rotation must not reset the network rolling hour at midnight.
 await reset();a=await owner();const midnight=Date.parse('2026-10-17T00:00:00Z');
 row=await generationFixture(a,{created_at:midnight-1000,network_hash:identity.networkHash});
 await run(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<29) INSERT INTO assistant_admissions(request_id,action,session_hash,network_hash,input_hmac,owner_token,principal_id,debit_entry_id,weight,reserved_cost_micros,actual_cost_micros,state,created_at,lease_expires_at,expires_at) SELECT printf('rotation-%d',x),action,session_hash,network_hash,input_hmac,owner_token,principal_id,debit_entry_id,weight,reserved_cost_micros,actual_cost_micros,state,created_at,lease_expires_at,expires_at FROM assistant_admissions CROSS JOIN n WHERE request_id=?`,row.request_id);
 await assert.rejects(admit(await owner(),{...tomorrow,now:midnight}),error('ADMISSION_LIMIT'));
 // Cost ceiling: unknown reservation stays; known usage releases only proven unused budget.
 await reset();a=await owner();row=await admit(a,{reservedCostMicros:2_000_000});await finish(row);const b=await owner();await assert.rejects(admit(b),error('ADMISSION_LIMIT'));assert.equal(await balance(b),100);
 await reset();row=await admit(a,{reservedCostMicros:2_000_000});await finish(row,now+1,100);assert.equal((await admit(b)).state,'started');
 await reset();row=await admit(a,{reservedCostMicros:2_000_000});await assert.rejects(admit(b,{now:now+86400000}),error('ADMISSION_LIMIT'),'unresolved cost retained across day');
 // Retention, bounded cleanup, fail-closed capacity; unresolved refunds never silently deleted.
 await reset();await run(`WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<10000)
 INSERT INTO assistant_admissions(request_id,action,session_hash,network_hash,input_hmac,owner_token,principal_id,debit_entry_id,weight,reserved_cost_micros,actual_cost_micros,state,created_at,lease_expires_at,expires_at) SELECT printf('capacity-%d',x),'retrieve',?,?,?,printf('token-%d',x),NULL,NULL,0,0,NULL,'completed',?,0,? FROM n`,hash('old-session'),hash('old-network'),hash('old-input'),now-3600000,now+1);
 await assert.rejects(admit(await owner()),error('ADMISSION_CAPACITY'));assert.equal((await first('SELECT count(*) n FROM assistant_admissions')).n,10000);
 row=await admit(await owner(),{now:now+1});assert.equal((await first('SELECT count(*) n FROM assistant_admissions')).n,9901);
 await run(`CREATE TRIGGER test_cleanup_failure BEFORE DELETE ON assistant_admissions BEGIN SELECT RAISE(ABORT,'test'); END`);
 const cleanOwner=await owner();await assert.rejects(admit(cleanOwner,{now:now+2}),error('ADMISSION_UNAVAILABLE'));assert.equal(await balance(cleanOwner),100);await run('DROP TRIGGER test_cleanup_failure');
 // Mock lifecycle: no provider code, refund for every technical failure category.
 for(const reason of ['timeout','unavailable','malformed','internal','evidence_changed','cancelled']){
  await reset();a=await owner();row=await admit(a);const result=await admission.settleGeneration(db,{row,profile},{valid:false},now+1);assert.equal(result.status,'failed',reason);assert.equal(await balance(a),100);
  assert.equal((await repo.readAdmission(db,row.request_id)).actual_cost_micros,null);
 }
 await reset();a=await owner();row=await admit(a);assert.equal((await admission.settleGeneration(db,{row,profile},{valid:true,usage:{inputTokens:50,outputTokens:25}},now+1)).status,'completed');assert.equal((await repo.readAdmission(db,row.request_id)).actual_cost_micros,100);assert.equal(await balance(a),95);
 assert.equal((await admission.settleGeneration(db,{row,profile},{valid:false},now+2)).status,'result_not_retained');assert.equal(await balance(a),95);
 // Guest spending is deferred; underlying cap/refund semantics remain unchanged.
 // Demonstrate current protected service really clamps a refund; not a hypothetical blocker.
 const raw=await owner('guest',10),spent=await credit.debit({owner:raw,amount:5,kind:'ai_spend',idempotencyKey:'raw-spend'});await credit.credit({owner:raw,amount:4,kind:'reward',idempotencyKey:'raw-reward'});
 const capped=await credit.refund({owner:raw,amount:5,idempotencyKey:'raw-refund',originalEntryId:spent.entryId});assert.equal(capped.appliedAmount,1);assert.equal(capped.capped,true);
 // Account-only denies Guest spending regardless of migration ordering.
 for(let n=0;n<6;n++){
  await reset();const g=await owner('guest',10),a=await owner('account',0);const results=await Promise.allSettled([admit(g),m('credit/account-login').applyAccountLogin(db,a,g,new Date(now+1))]);
  assert.equal(results[1].status,'fulfilled');assert.equal(results[0].status,'rejected');assert.equal(results[0].reason.code,'LOGIN_REQUIRED');assert.equal(await balance(a),13);assert.equal((await first('SELECT count(*) n FROM assistant_admissions')).n,0);
 }
 // Retrieval rates are free, distributed, and independent of generation weights.
 const retrievalInput=(n,overrides={})=>({requestId:crypto.randomUUID(),action:'retrieve',sessionHash:hash('r-session'+n),networkHash:hash('r-network'+n),previousNetworkHash:hash('r-old'+n),inputHmac:hash('r-input'),ownerToken:crypto.randomUUID(),principalId:null,debitEntryId:null,weight:0,credits:0,reservedCostMicros:0,now,...overrides});
 for(const [scope,limit] of [['session',10],['network',40],['global',200]]){
  await reset();const before=(await first('SELECT count(*) n FROM credit_ledger')).n;
  const requests=Array.from({length:limit+5},(_,n)=>retrievalInput(n,scope==='session'?{sessionHash:hash('same')} : scope==='network'?{networkHash:hash('same')} : {}));
  const results=await Promise.allSettled(requests.map(i=>repo.insertAdmission(db,i)));
  assert.equal(results.filter(r=>r.status==='fulfilled').length,limit,scope);assert(results.filter(r=>r.status==='rejected').every(r=>r.reason.code==='ADMISSION_LIMIT'));
  assert.equal((await first('SELECT count(*) n FROM credit_ledger')).n,before);assert.equal((await first('SELECT count(*) n FROM assistant_admissions')).n,limit);
  await assert.rejects(repo.insertAdmission(db,{...requests.at(-1),requestId:crypto.randomUUID(),now:now+59999}),error('ADMISSION_LIMIT'));
  assert.equal((await repo.insertAdmission(db,{...requests.at(-1),requestId:crypto.randomUUID(),now:now+60000})).action,'retrieve');
 }
 // Concurrent reservations cannot pass the same daily budget read.
 await reset();const budgetOwners=await Promise.all(Array.from({length:8},()=>owner()));
 const budgetResults=await Promise.allSettled(budgetOwners.map(o=>admit(o,{reservedCostMicros:1_000_000})));
 assert.equal(budgetResults.filter(r=>r.status==='fulfilled').length,2);assert.equal((await first('SELECT sum(reserved_cost_micros) n FROM assistant_admissions')).n,2_000_000);
 // Internal service resolves identity and receipts, not caller-supplied amounts/owners.
 await reset();const guestKey='synthetic-guest-secret-at-least-32-bytes',accountKey='synthetic-account-secret-at-least-32-bytes';
 const guestCreated=await m('identity/service').createGuest(db,guestKey,now);await credit.credit({owner:guestCreated.owner,amount:10,kind:'reward',idempotencyKey:'fixture'});
 const sessionCreated=await m('assistant/identity').assistantSession(new Request('https://local.test'),secret,now);
 const cookies=sessionCreated.setCookie.split(';')[0]+'; '+guestCreated.setCookie.split(';')[0];
 const browser=cookie=>new Request('https://local.test/api/assistant/retrieve',{method:'POST',headers:{cookie,origin:'https://local.test','content-type':'application/json'},body:JSON.stringify({mode:'qa',query:'스타파이터',filters:{}})});
 const deps={enabled:true,secret,abuseSecret,network:()=> 'synthetic-only-network',now:()=>now,identitySecrets:{guest:guestKey,account:accountKey},profiles:{qa:profile,planner:profile,draft:profile}};
 await run("INSERT INTO articles (id,topic,title,summary,image,url,source,published,category,status) VALUES ('admission-evidence','opaque-admission-story','스타파이터 새 소식','보도에 따르면 예정이다.','','https://example.com/evidence','StarWars.com',?,'영화','published')",new Date(now-1000).toISOString());
 const selection=async mode=>m('assistant/service').retrieveArchive(db,{mode,query:'스타파이터',filters:{}},sessionCreated.binding,secret,now);
 let selected=await selection('qa');assert.equal(selected.status,'ready');
 const generation={action:'qa',requestId:crypto.randomUUID(),receipt:selected.receipt,selectedStoryIds:['opaque-admission-story']};
 for(const extra of [{price:1},{owner:other},{amount:1},{instructions:'unreviewed'}])await assert.rejects(admission.beginGenerationAdmission(db,browser(cookies),{...generation,...extra},deps),error('INVALID_REQUEST'));
 await assert.rejects(admission.beginGenerationAdmission(db,browser(cookies),generation,{...deps,enabled:false}),error('ASSISTANT_UNAVAILABLE'));
 for(const action of ['qa','planner','draft'])await assert.rejects(admission.beginGenerationAdmission(db,browser(cookies),{...generation,action},deps),error('LOGIN_REQUIRED'));
 assert.equal(await balance(guestCreated.owner),10);assert.equal((await first('SELECT count(*) n FROM assistant_admissions')).n,0);
 const serviceAccount=await m('identity/repository').createAccount(db,new Date(now));await credit.credit({owner:serviceAccount.owner,amount:50,kind:'reward',idempotencyKey:'fixture'});
 const accountCookie=(await m('identity/account-session').issueAccountSession(serviceAccount.userId,accountKey,now)).split(';')[0];
 const loggedIn=()=>browser(cookies+'; '+accountCookie);
 await assert.rejects(admission.beginGenerationAdmission(db,loggedIn(),generation,{...deps,profiles:{}}),error('INVALID_COST_PROFILE'));
 await assert.rejects(admission.beginGenerationAdmission(db,loggedIn(),generation,{...deps,network:()=>null}),error('NETWORK_UNAVAILABLE'));
 await assert.rejects(admission.beginGenerationAdmission(db,loggedIn(),{...generation,selectedStoryIds:['not-selected']},deps),error('EVIDENCE_CHANGED'));
 let handle=await admission.beginGenerationAdmission(db,loggedIn(),generation,deps);assert.equal(handle.row.principal_id,serviceAccount.owner.principalId);assert.equal(await balance(serviceAccount.owner),45);
 await assert.rejects(admission.beginGenerationAdmission(db,loggedIn(),generation,deps),error('REQUEST_IN_PROGRESS'));
 await admission.settleGeneration(db,handle,{valid:false},now+1);assert.equal(await balance(serviceAccount.owner),50);assert.equal(await balance(guestCreated.owner),10);
 await reset();selected=await selection('script');
 handle=await admission.beginGenerationAdmission(db,browser(cookies+'; '+accountCookie),{...generation,action:'draft',requestId:crypto.randomUUID(),receipt:selected.receipt},deps);
 assert.equal(handle.row.principal_id,serviceAccount.owner.principalId);assert.equal(await balance(serviceAccount.owner),35);assert.equal(await balance(guestCreated.owner),10);
 await admission.settleGeneration(db,handle,{valid:true},now+1);
 await assert.rejects(admission.beginGenerationAdmission(db,browser(cookies+'; __Host-holocron_account=invalid'),{...generation,requestId:crypto.randomUUID()},deps));assert.equal(await balance(guestCreated.owner),10);
 await run("UPDATE articles SET summary='수정된 요약' WHERE id='admission-evidence'");
 await assert.rejects(admission.beginGenerationAdmission(db,loggedIn(),{...generation,requestId:crypto.randomUUID()},deps),error('EVIDENCE_CHANGED'));assert.equal(await balance(guestCreated.owner),10);
 // HTTP quotas have bounded Retry-After, private errors, and no raw identity exposure.
 await reset();const httpDeps={...deps,database:()=>db};
 for(let n=0;n<10;n++)assert.equal((await m('assistant/http').handleRetrieve(browser(cookies),httpDeps)).status,200);
 const denied=await m('assistant/http').handleRetrieve(browser(cookies),httpDeps);assert.equal(denied.status,429);assert.equal(denied.headers.get('Retry-After'),'60');assert.equal(denied.headers.get('Cache-Control'),'private, no-store');assert.equal(denied.headers.get('Vary'),'Cookie');assert.equal((await denied.json()).error.code,'ADMISSION_LIMIT');
 const unavailable=await m('assistant/http').handleRetrieve(browser(cookies),{...httpDeps,network:()=>null});assert.equal(unavailable.status,503);assert.equal((await unavailable.json()).error.code,'NETWORK_UNAVAILABLE');
 assert.equal((await m('assistant/http').handleRetrieve(browser(cookies),{...httpDeps,enabled:false,database(){throw new Error('must not read');}})).status,503);
 const stored=JSON.stringify((await db.prepare('SELECT * FROM assistant_admissions').all()).results);
 for(const forbidden of [cookies,'synthetic-only-network',secret,abuseSecret,'스타파이터','example.com','보도에','opaque-admission-story'])assert(!stored.includes(forbidden));
 const columns=(await db.prepare('PRAGMA table_info(assistant_admissions)').all()).results.map(r=>r.name);
 assert.deepEqual(columns,['request_id','action','session_hash','network_hash','input_hmac','owner_token','principal_id','debit_entry_id','weight','reserved_cost_micros','actual_cost_micros','state','created_at','lease_expires_at','expires_at','security_policy']);
 // Actual D1 v8 export carries exact 16 durable datasets and historical contracts, no operation rows.
 const exported=await m('backup/export').exportBackup(db,new Date());assert.equal(exported.version,11);assert.equal(exported.schema.latestMigration,'0021_free_chat_admissions.sql');assert.equal(Object.keys(exported.tables).length,16);assert(!Object.hasOwn(exported.tables,'assistant_admissions'));
 const plan=m('backup/restore-plan').buildRestorePlan(exported);assert.equal(plan.executable,false);assert.equal(plan.dryRun,true);assert(Object.hasOwn(plan.excludedTables,'assistant_admissions'));assert(!plan.insertOrder.includes('assistant_admissions'));
 assert.equal(m('backup/validator').validateBackup(exported).version,11);
 const historicalV7=structuredClone(exported);historicalV7.version=7;historicalV7.schema.latestMigration='0019_credit_policy_budget.sql';assert.equal(m('backup/validator').validateBackup(historicalV7).version,7);assert.equal(m('backup/restore-plan').buildRestorePlan(historicalV7).sourceVersion,7);
 const historical=structuredClone(exported);historical.version=4;historical.schema.latestMigration='0016_account_credit_foundation.sql';for(const name of ['credit_policy_revisions','assistant_monthly_costs']){delete historical.tables[name];delete historical.counts[name];}assert.equal(m('backup/validator').validateBackup(historical).version,4);assert.equal(m('backup/restore-plan').buildRestorePlan(historical).sourceVersion,4);
 // Authoritative ledger audit across every real wallet, including retired Guests and refunds.
 const audit=await db.prepare(`SELECT w.principal_id FROM credit_wallets w WHERE w.balance<>COALESCE((SELECT sum(applied_amount) FROM credit_ledger WHERE wallet_id=w.principal_id),0) OR w.version<>(SELECT count(*) FROM credit_ledger WHERE wallet_id=w.principal_id) OR EXISTS (SELECT 1 FROM credit_ledger e WHERE e.wallet_id=w.principal_id AND e.resulting_balance<>(SELECT sum(p.applied_amount) FROM credit_ledger p WHERE p.wallet_id=e.wallet_id AND p.sequence<=e.sequence))`).all();assert.deepEqual(audit.results,[]);
 assert.equal(outbound,0);
 console.log(`Assistant admission PASS: ${assertions} assertions; real Miniflare clean 0000–0019 + 0016 upgrade, atomic concurrency/rollback, quotas, leases, replay, cost reservation, ledger audit; provider calls ZERO. Guest AI spending denied; Account numeric/refund closure evaluated by test:assistant-refund-safety.`);
}finally{await mf.dispose();loaded.dispose();}
