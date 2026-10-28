import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
const require=createRequire(import.meta.url),split=require('wrangler').unstable_splitSqlQuery,{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
const names=['assistant/service','assistant/repository','assistant/admission','assistant/account-access','assistant/abuse-identity','assistant/account-search','assistant/search-recovery','assistant/validation','identity/repository','identity/account-session','credit/service','credit/repository','credit/policy-settings/repository','backup/export','backup/validator'];
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
 await m('assistant/repository').insertAdmission(db,old);
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
 const policy=await m('credit/policy-settings/repository').readPolicy(db);await m('credit/policy-settings/repository').savePolicy(db,1,{...policy.values,qaCredits:1},new Date(now+1));
 // Old 5 CR debt remains 5 CR after a new 1 CR policy; no manual wallet adjustment.
 const settled=await m('assistant/repository').failAdmission(db,old.requestId,old.ownerToken,now+2,1500);assert.equal(settled.refund.applied,5);assert.equal((await credit.getBalance(owner)).balance,19);
 const cookie=(await m('identity/account-session').issueAccountSession(user.userId,account,now)).split(';')[0];
 const restored=await m('assistant/account-search').accountSearch(db,new Request('https://local.test',{headers:{cookie}}),{requestId:id,...input},{enabled:true,identitySecrets:{account},secret,abuseSecret,now:()=>now+3});assert.deepEqual(restored,legacy);assert.equal((await credit.getBalance(owner)).balance,19);
 const newFree={...old,requestId:crypto.randomUUID(),ownerToken:crypto.randomUUID(),action:'chat',debitEntryId:null,credits:0,policyVersion:2,now:now+4};
 const columnNames=(await db.prepare('PRAGMA table_info(assistant_admissions)').all()).results.map(r=>r.name);
 const template=(await rows('assistant_admissions'))[0];
 for(const patch of [{debit_entry_id:'forged'},{security_policy:'edge-v1'},{state:'refund_pending'},{principal_id:null},{weight:4}]){const row={...template,action:'chat',debit_entry_id:null,security_policy:'account-v1',state:'started',request_id:crypto.randomUUID(),...patch};await assert.rejects(()=>sql(`INSERT INTO assistant_admissions(${columnNames.join(',')}) VALUES(${columnNames.map(()=>'?').join(',')})`,...columnNames.map(k=>row[k])).run());}
 const startLedger=(await rows('credit_ledger')).length;await m('assistant/repository').insertAdmission(db,newFree);assert.equal((await rows('credit_ledger')).length,startLedger);
 const recovery=await m('assistant/admission').recoverExpiredGeneration(db,newFree.requestId,now+70000);assert.equal(recovery.state,'failed');assert.equal(recovery.refund,null);assert.equal(recovery.actual_cost_micros,null);
 // Expired free UUID proof remains: no debit tombstone exists in the Credit ledger.
 await m('assistant/repository').insertAdmission(db,{...newFree,requestId:crypto.randomUUID(),ownerToken:crypto.randomUUID(),now:now+3*86400000});assert(await m('assistant/repository').readAdmission(db,newFree.requestId));
 const backup=await m('backup/export').exportBackup(db,new Date(now+4*86400000));assert.equal(m('backup/validator').validateBackup(backup).version,11);assert.equal(backup.schema.latestMigration,files.at(-1));assert.equal(Object.keys(backup.tables).length,16);assert(!('assistant_admissions' in backup.tables));
 assert.deepEqual(backup.tables.credit_ledger.slice(0,3),before.credit_ledger.sort((a,b)=>a.wallet_id.localeCompare(b.wallet_id)||a.sequence-b.sequence));
 console.log('PASS 0020 → 0021 D1 transaction/rollback, complete trigger/index/FK retention, old paid search recovery, old 5 CR debt refund after savePolicy(1 CR), free expired recovery/no ledger, v11 ledger audit');
}finally{await mf.dispose();await loaded.dispose();}
