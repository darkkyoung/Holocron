import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
const require=createRequire(import.meta.url),split=require('wrangler').unstable_splitSqlQuery,{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
const names=['assistant/admission-sql','assistant/credit','assistant/service','assistant/repository','assistant/admission','assistant/account-access','assistant/abuse-identity','assistant/account-search','assistant/search-recovery','assistant/validation','identity/repository','identity/account-session','credit/service','credit/repository','credit/policy-settings/repository','backup/export','backup/validator'];
const loaded=await loadTestModules(names.map(n=>'lib/'+n+'.ts')),m=n=>loaded.modules['lib/'+n+'.ts'];
const mf=new Miniflare({modules:true,compatibilityDate:'2026-05-15',script:'export default {fetch(){return new Response("local")}}',d1Databases:['DB'],outboundService:()=>{throw Error('NO NETWORK');}});
try{
 const db=await mf.getD1Database('DB'),sql=(s,...args)=>db.prepare(s).bind(...args),rows=async t=>(await db.prepare('SELECT * FROM '+t).all()).results;
 const files=(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort();
 for(const file of files.filter(f=>f<'0021'))await db.batch(split(await readFile('drizzle/'+file,'utf8')).map(s=>db.prepare(s)));
 const now=Date.now()+86400000,account='synthetic-account-secret-at-least-32-bytes',secret='synthetic-signing-secret-at-least-32-bytes',abuseSecret='synthetic-abuse-secret-at-least-32-bytes';
 const user=await m('identity/repository').createAccount(db,new Date(now)),owner=user.owner,credit=m('credit/service').creditService(db);
 await credit.credit({owner,amount:20,kind:'reward',idempotencyKey:'fund'});
 const old={requestId:crypto.randomUUID(),ownerToken:crypto.randomUUID(),action:'qa',securityPolicy:'account-v1',sessionHash:'a'.repeat(64),networkHash:'0'.repeat(64),previousNetworkHash:'0'.repeat(64),inputHmac:'b'.repeat(64),principalId:owner.principalId,debitEntryId:crypto.randomUUID(),weight:1,credits:5,reservedCostMicros:19200,policyVersion:1,now};
 await db.batch([sql(`INSERT INTO assistant_admissions(request_id,action,session_hash,network_hash,input_hmac,owner_token,principal_id,debit_entry_id,weight,reserved_cost_micros,state,created_at,lease_expires_at,expires_at,security_policy) VALUES(?,'qa',?,?,?,?,?,?,1,19200,'started',?,?,?,'account-v1')`,old.requestId,old.sessionHash,old.networkHash,old.inputHmac,old.ownerToken,owner.principalId,old.debitEntryId,now,now+60000,now+172800000),m('assistant/credit').prepareAssistantDebit(db,owner.principalId,'qa',old.requestId,old.ownerToken,old.debitEntryId,old.inputHmac,now,5)]);
 // A historical paid-search result, sealed under its original request identity.
 const id=crypto.randomUUID(),token=crypto.randomUUID(),entry=crypto.randomUUID(),input=m('assistant/validation').validateRetrieval({mode:'qa',query:'스타파이터',filters:{}},now);
 const hash=await m('assistant/abuse-identity').admissionHmac(abuseSecret,'account-search-v1',JSON.stringify({owner:owner.principalId,input}));
 await sql("INSERT INTO articles(id,topic,title,summary,image,url,source,published,category,status) VALUES('old-a','old-story','스타파이터 보도','제작 소식','','https://example.invalid/old','Deadline',?,'영화','published')",new Date(now).toISOString()).run();
 const binding=await m('assistant/account-access').accountBinding(owner.principalId,secret);
 const legacy={...await m('assistant/service').retrieveArchive(db,input,binding,secret,now),credit:{charged:1},requestId:id,resultExpiresAt:now+600000};assert.equal(legacy.status,'ready');assert(legacy.receipt);
 const cipher=await m('assistant/search-recovery').sealSearch(legacy,secret,owner.principalId+':'+id+':'+hash);
 await db.batch([sql("INSERT INTO assistant_searches(request_id,principal_id,input_hmac,owner_token,state,result_cipher,charged,debit_entry_id,created_at,lease_expires_at,result_expires_at) VALUES(?,?,?,?,'completed',?,1,?,?,0,?)",id,owner.principalId,hash,token,cipher,entry,now,now+600000),m('credit/repository').prepareCreditMutation(db,{owner,operation:'debit',kind:'ai_spend',amount:1,idempotencyKey:'assistant:search:'+id,reference:{type:'assistant_search',id}},entry,new Date(now))]);
 const tables=['assistant_admissions','credit_wallets','credit_ledger','assistant_monthly_costs','credit_policy_revisions','assistant_searches'],before=Object.fromEntries(await Promise.all(tables.map(async t=>[t,await rows(t)])));
 const objects=await db.prepare("SELECT type,name,sql FROM sqlite_master WHERE type IN ('trigger','index') AND sql IS NOT NULL ORDER BY name").all();
 const migration=split(await readFile('drizzle/0021_free_chat_admissions.sql','utf8'));
 // D1 transaction rollback also restores dropped triggers/table on failure.
 await assert.rejects(()=>db.batch([...migration.map(s=>db.prepare(s)),db.prepare("SELECT json('force rollback')")]));
 for(const t of tables)assert.deepEqual(await rows(t),before[t]);
 await db.batch(migration.map(s=>db.prepare(s)));
 for(const t of tables)assert.deepEqual(await rows(t),before[t],t+' preserved byte values');
 const after=await db.prepare("SELECT type,name,sql FROM sqlite_master WHERE type IN ('trigger','index') AND sql IS NOT NULL ORDER BY name").all();assert.deepEqual(after.results,objects.results,'all original triggers and indexes retained');
 assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length,0);
 const columns=(await db.prepare('PRAGMA table_info(assistant_admissions)').all()).results.map(r=>r.name),freeId=crypto.randomUUID();
 const freeRow={...before.assistant_admissions[0],request_id:freeId,action:'chat',debit_entry_id:null,state:'started'};
 await sql(`INSERT INTO assistant_admissions(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`,...columns.map(k=>freeRow[k])).run();
 const paidMigration=split(await readFile('drizzle/0022_paid_chat_admissions.sql','utf8'));
 await assert.rejects(()=>db.batch(paidMigration.map(s=>db.prepare(s))),'active legacy chat blocks migration');
 assert.equal((await sql('SELECT state FROM assistant_admissions WHERE request_id=?',freeId).first()).state,'started');
 await sql("UPDATE assistant_admissions SET state='failed',lease_expires_at=0 WHERE request_id=?",freeId).run();
 const legacyClosed=await sql('SELECT * FROM assistant_admissions WHERE request_id=?',freeId).first();
 const beforePaid=Object.fromEntries(await Promise.all(tables.map(async t=>[t,await rows(t)])));
 await assert.rejects(()=>db.batch([...paidMigration.map(s=>db.prepare(s)),db.prepare("SELECT json('force rollback')")]));
 for(const t of tables)assert.deepEqual(await rows(t),beforePaid[t]);
 await db.batch(paidMigration.map(s=>db.prepare(s)));
 for(const t of tables.filter(t=>t!=='assistant_admissions'))assert.deepEqual(await rows(t),beforePaid[t]);
 assert.deepEqual(await rows('assistant_admissions'),before.assistant_admissions);
 assert.deepEqual(JSON.parse((await sql('SELECT record_json FROM assistant_legacy_free_chats WHERE request_id=?',freeId).first()).record_json),legacyClosed);
 for(const query of ['DELETE FROM assistant_legacy_free_chats',"UPDATE assistant_legacy_free_chats SET created_at=0"])await assert.rejects(()=>sql(query).run());
 const retained=(await db.prepare("SELECT type,name,sql FROM sqlite_master WHERE type IN ('trigger','index') AND sql IS NOT NULL ORDER BY name").all()).results;
 assert.deepEqual(retained.filter(o=>objects.results.some(old=>old.name===o.name)),objects.results);
 assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length,0);

 const usageQuery=m('assistant/admission-sql').admissionDecision({...old,action:'chat',credits:5,now:now+1});
 const usage=await db.prepare(usageQuery.sql+' SELECT chat_day,cost,global_day,capacity FROM usage').bind(...usageQuery.bindings).first();
 assert.deepEqual(usage,{chat_day:1,cost:38400,global_day:2,capacity:1},'archived costs and quota retained; archive does not consume active capacity');
 const policy=await m('credit/policy-settings/repository').readPolicy(db);await m('credit/policy-settings/repository').savePolicy(db,1,{...policy.values,qaCredits:1},new Date(now+1));
 // Old 5 CR debt remains 5 CR after a new 1 CR policy; no manual wallet adjustment.
 const settled=await m('assistant/repository').failAdmission(db,old.requestId,old.ownerToken,now+2,1500);assert.equal(settled.refund.applied,5);assert.equal((await credit.getBalance(owner)).balance,19);
 const cookie=(await m('identity/account-session').issueAccountSession(user.userId,account,now)).split(';')[0];
 const restored=await m('assistant/account-search').accountSearch(db,new Request('https://local.test',{headers:{cookie}}),{requestId:id,...input},{enabled:true,identitySecrets:{account},secret,abuseSecret,now:()=>now+3});assert.deepEqual(restored,legacy);assert.equal((await credit.getBalance(owner)).balance,19);
 const newPaid={...old,requestId:crypto.randomUUID(),ownerToken:crypto.randomUUID(),action:'chat',debitEntryId:crypto.randomUUID(),credits:1,policyVersion:2,now:now+4};
 const columnNames=(await db.prepare('PRAGMA table_info(assistant_admissions)').all()).results.map(r=>r.name);
 const template=(await rows('assistant_admissions'))[0];
 for(const patch of [{debit_entry_id:null},{security_policy:'edge-v1'},{principal_id:null},{weight:4}]){const row={...template,action:'chat',debit_entry_id:crypto.randomUUID(),security_policy:'account-v1',state:'started',request_id:crypto.randomUUID(),...patch};await assert.rejects(()=>sql(`INSERT INTO assistant_admissions(${columnNames.join(',')}) VALUES(${columnNames.map(()=>'?').join(',')})`,...columnNames.map(k=>row[k])).run());}
 const startLedger=(await rows('credit_ledger')).length;await m('assistant/repository').insertAdmission(db,newPaid);assert.equal((await rows('credit_ledger')).length,startLedger+1);
 const recovery=await m('assistant/admission').recoverExpiredGeneration(db,newPaid.requestId,now+70000);assert.equal(recovery.state,'failed');assert.equal(recovery.refund.applied,1);assert.equal(recovery.actual_cost_micros,null);
 // Settled paid chat is cleaned; permanent Ledger blocks UUID replay. Frozen legacy UUID also blocks.
 const completedInput={...newPaid,requestId:crypto.randomUUID(),ownerToken:crypto.randomUUID(),debitEntryId:crypto.randomUUID(),now:now+3*86400000};
 await m('assistant/repository').insertAdmission(db,completedInput);assert.equal(await m('assistant/repository').readAdmission(db,newPaid.requestId),undefined);
 assert((await m('assistant/repository').completeAdmission(db,completedInput.requestId,completedInput.ownerToken,500,completedInput.now+1)).completed);
 await db.prepare(m('assistant/admission-sql').cleanupSql).bind(now+6*86400000).run();assert.equal(await m('assistant/repository').readAdmission(db,completedInput.requestId),undefined);
 await assert.rejects(()=>m('assistant/repository').insertAdmission(db,{...completedInput,ownerToken:crypto.randomUUID(),debitEntryId:crypto.randomUUID(),now:now+6*86400000}),e=>e.code==='RESULT_NOT_RETAINED');
 await assert.rejects(()=>m('assistant/repository').insertAdmission(db,{...newPaid,ownerToken:crypto.randomUUID(),debitEntryId:crypto.randomUUID(),now:now+3*86400000}),e=>e.code==='RESULT_NOT_RETAINED');
 await assert.rejects(()=>m('assistant/repository').insertAdmission(db,{...newPaid,requestId:freeId,ownerToken:crypto.randomUUID(),debitEntryId:crypto.randomUUID(),now:now+3*86400000}),e=>e.code==='RESULT_NOT_RETAINED');
 const backup=await m('backup/export').exportBackup(db,new Date(now+4*86400000));assert.equal(m('backup/validator').validateBackup(backup).version,12);assert.equal(backup.schema.latestMigration,files.at(-1));assert.equal(Object.keys(backup.tables).length,16);assert(!('assistant_admissions' in backup.tables));assert(!('assistant_legacy_free_chats' in backup.tables));
 assert.deepEqual(backup.tables.credit_ledger.slice(0,3),before.credit_ledger.sort((a,b)=>a.wallet_id.localeCompare(b.wallet_id)||a.sequence-b.sequence));
 console.log('PASS 0020→0021→0022 transaction/rollback, active legacy gate and immutable archive, trigger/index/FK preservation, paid chat debit/refund/cleanup + permanent Replay proof, old 5 CR refund and paid search recovery, v12 audit');
}finally{await mf.dispose();await loaded.dispose();}
