import nodeAssert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
let assertions=0;
const assert=new Proxy(nodeAssert,{apply(t,s,a){assertions++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{assertions++;return t[k](...a);}:t[k];}});
const paths=['credit/service','identity/repository','assistant/repository','assistant/admission','backup/export','backup/validator','backup/restore-plan','backup/format'];
const loaded=await loadTestModules(paths.map(p=>'lib/'+p+'.ts')),m=p=>loaded.modules['lib/'+p+'.ts'];
const require=createRequire(import.meta.url),split=require('wrangler').unstable_splitSqlQuery,{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
let outbound=0;
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("local-only")}}',compatibilityDate:'2026-05-15',d1Databases:['CHAIN','UPGRADE','INTERRUPTED'],outboundService:()=>{outbound++;throw new Error('No provider');}});
const now=Date.parse('2026-10-16T07:00:00Z'),time=new Date(now).toISOString(),MAX=Number.MAX_SAFE_INTEGER,hash=s=>createHash('sha256').update(s).digest('hex'),error=c=>e=>e.code===c;
const sql=await readFile('drizzle/0018_account_partial_refund.sql','utf8'),statements=split(sql),files=(await readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort();
const oldSql=await readFile('drizzle/0016_account_credit_foundation.sql','utf8');
const oldEffect="iif(NEW.requested_amount>0 AND p.type='guest',min(NEW.requested_amount,10-w.balance),NEW.requested_amount)";
const newEffect="iif(NEW.requested_amount>0 AND p.type='guest',min(NEW.requested_amount,10-w.balance),iif(NEW.operation='refund' AND p.type='account',min(NEW.requested_amount,9007199254740991-w.balance),NEW.requested_amount))";
const guard=s=>s.slice(s.indexOf('CREATE TRIGGER credit_ledger_guard'),s.indexOf('--> statement-breakpoint',s.indexOf('CREATE TRIGGER credit_ledger_guard'))).trim();
assert.equal(guard(sql).replace(newEffect,oldEffect),guard(oldSql),'only reviewed applied-effect expression changes');
assert.equal(hash(oldSql),'4077c5a0db8bdf20263bcb1cc44592c8890b983af8cc1b21711403001fe4dcea');
assert.equal(hash(await readFile('drizzle/0017_assistant_admissions.sql','utf8')),'24c6398caf81c2306d50cf5054351b85dd27ee1c2cf83249da5a5c6a5c1e7e16');
assert.equal(require('wrangler/package.json').version,'4.92.0');assert.equal(files.at(-1),'0018_account_partial_refund.sql');assert(!sql.includes('\r'));assert(sql.endsWith('\n'));assert.doesNotMatch(sql,/\bCASE\b/i);assert.equal(statements.length,4);assert.equal(sql.split('--> statement-breakpoint').length,4);
assert.deepEqual(statements.map(s=>(s.match(/\b(CREATE|DROP) TRIGGER (\w+)/)||[]).slice(1)),[['CREATE','credit_ledger_migration_guard'],['DROP','credit_ledger_guard'],['CREATE','credit_ledger_guard'],['DROP','credit_ledger_migration_guard']]);
for(const s of statements.filter(s=>s.includes('CREATE TRIGGER'))){assert.equal((s.match(/\bBEGIN\b/g)||[]).length,1);assert.equal((s.match(/\bEND\b/g)||[]).length,1);}
const journal=JSON.parse(await readFile('drizzle/meta/_journal.json','utf8'));assert.equal(journal.entries.at(-1).idx,18);assert.equal(journal.entries.at(-1).tag,'0018_account_partial_refund');
const previous=JSON.parse(await readFile('drizzle/meta/0017_snapshot.json','utf8')),current=JSON.parse(await readFile('drizzle/meta/0018_snapshot.json','utf8'));assert.equal(current.prevId,previous.id);for(const key of ['id','prevId']){delete previous[key];delete current[key];}assert.deepEqual(current,previous,'trigger-only migration has no table schema changes');
const run=(db,s,...args)=>db.prepare(s).bind(...args).run(),first=(db,s,...args)=>db.prepare(s).bind(...args).first();
const service=db=>m('credit/service').creditService(db),repo=m('assistant/repository'),admission=m('assistant/admission');
const reward=(db,owner,amount,key=crypto.randomUUID())=>service(db).credit({owner,amount,kind:'reward',idempotencyKey:key});
const debit=(db,owner,amount)=>service(db).debit({owner,amount,kind:'admin_adjustment',idempotencyKey:crypto.randomUUID()});
async function account(db,amount=MAX){const {owner}=await m('identity/repository').createAccount(db,new Date(now));if(amount)await reward(db,owner,amount);return owner;}
const input=owner=>({requestId:crypto.randomUUID(),action:'qa',sessionHash:hash(owner.principalId),networkHash:hash('synthetic-network'),previousNetworkHash:hash('old-synthetic-network'),inputHmac:hash('synthetic-input'),ownerToken:crypto.randomUUID(),principalId:owner.principalId,debitEntryId:crypto.randomUUID(),weight:1,credits:5,reservedCostMicros:10000,now});
const triggers=async db=>(await db.prepare("SELECT name,sql FROM sqlite_master WHERE type='trigger' ORDER BY name").all()).results;
async function durable(db){const tables=m('backup/format').BACKUP_TABLES;return Object.fromEntries(await Promise.all(tables.map(async name=>[name,(await db.prepare('SELECT * FROM '+name+' ORDER BY '+m('backup/format').BACKUP_DEFINITIONS[name].order.join(',')).all()).results])));}
const apply=(db,commands)=>db.batch(commands.map(s=>db.prepare(s)));
async function audit(db){for(const w of (await db.prepare('SELECT * FROM credit_wallets').all()).results){let balance=0n;const entries=(await db.prepare('SELECT * FROM credit_ledger WHERE wallet_id=? ORDER BY sequence').bind(w.principal_id).all()).results;for(let n=0;n<entries.length;n++){balance+=BigInt(entries[n].applied_amount);assert.equal(entries[n].sequence,n+1);assert.equal(balance,BigInt(entries[n].resulting_balance));}assert.equal(balance,BigInt(w.balance));assert.equal(entries.length,w.version);}}
try{
 const chain=await mf.getD1Database('CHAIN'),db=await mf.getD1Database('UPGRADE'),interrupted=await mf.getD1Database('INTERRUPTED');
 for(const file of files){const commands=split(await readFile('drizzle/'+file,'utf8'));await apply(chain,commands);if(file<'0018'){await apply(db,commands);await apply(interrupted,commands);}}
 // Populate 0017 with durable and unsettled data before upgrade. Original guards stay active.
 const owner=await account(db),i=input(owner),row=await repo.insertAdmission(db,i);await reward(db,owner,1);
 await run(db,"UPDATE assistant_admissions SET state='refund_pending' WHERE request_id=?",row.request_id);
 await assert.rejects(repo.failAdmission(db,row.request_id,row.owner_token,now+1),error('ADMISSION_UNAVAILABLE'));
 assert.equal((await repo.readAdmission(db,row.request_id)).state,'refund_pending');assert.equal((await service(db).getBalance(owner)).balance,MAX-4);
 await run(db,"INSERT INTO settings VALUES('upgrade-sentinel','preserved')");
 const before=await durable(db),beforeOps=(await db.prepare('SELECT * FROM assistant_admissions').all()).results,oldTriggers=await triggers(db);
 // Failure at every boundary, including after replacement, rolls back all DDL in D1 batch.
 for(let n=1;n<=statements.length;n++){
  await assert.rejects(apply(db,[...statements.slice(0,n),"SELECT json('synthetic-migration-failure')"]));
  assert.deepEqual(await triggers(db),oldTriggers);assert.deepEqual(await durable(db),before);assert.deepEqual((await db.prepare('SELECT * FROM assistant_admissions').all()).results,beforeOps);
 }
 // A runner stopping between autocommitted statements still cannot admit ledger writes.
 const staged=await account(interrupted,9);
 for(let n=0;n<statements.length;n++){
  await run(interrupted,statements[n]);
  if(n<3){
   await assert.rejects(reward(interrupted,staged,1),error('UNAVAILABLE'));
   await assert.rejects(run(interrupted,"UPDATE credit_wallets SET balance=0 WHERE principal_id=?",staged.principalId),/credit_wallet_requires_ledger/);
   assert.equal((await service(interrupted).getBalance(staged)).balance,9);
   assert((await triggers(interrupted)).some(t=>t.name==='credit_ledger_migration_guard'));
  }
 }
 assert.equal((await reward(interrupted,staged,1)).appliedAmount,1);
 // Full upgrade is data preserving and leaves exactly the original eight named guards.
 await apply(db,statements);assert.deepEqual(await durable(db),before);assert.deepEqual((await db.prepare('SELECT * FROM assistant_admissions').all()).results,beforeOps);
 const after=await triggers(db);assert.equal(after.length,8);assert.deepEqual(after.map(t=>t.name),oldTriggers.map(t=>t.name));for(const t of after.filter(t=>t.name!=='credit_ledger_guard'))assert.deepEqual(t,oldTriggers.find(o=>o.name===t.name));assert.deepEqual(after,await triggers(chain));
 assert.deepEqual((await db.prepare("SELECT name,sql FROM sqlite_master WHERE type<>'trigger' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()).results,(await chain.prepare("SELECT name,sql FROM sqlite_master WHERE type<>'trigger' AND name NOT LIKE 'sqlite_%' ORDER BY name").all()).results);
 const upgraded=await admission.recoverExpiredGeneration(db,row.request_id,now+60001);assert.equal(upgraded.state,'failed');assert.deepEqual(upgraded.refund,{requested:5,applied:4,forfeited:1,full:false});
 // Direct SQL cannot fake the effect, ownership, entitlement, or mutate balances/history.
 const original=await debit(db,owner,5);await reward(db,owner,4); // MAX-1, refund room 1.
 const wallet=await service(db).getBalance(owner);
 const raw=(overrides={})=>{const e={id:crypto.randomUUID(),wallet_id:owner.principalId,sequence:wallet.version+1,operation:'refund',kind:'refund',idempotency_key:crypto.randomUUID(),requested_amount:5,applied_amount:1,resulting_balance:MAX,original_entry_id:original.entryId,created_at:time,...overrides};return db.prepare(`INSERT INTO credit_ledger(${Object.keys(e).join(',')}) VALUES(${Object.keys(e).map(()=>'?').join(',')})`).bind(...Object.values(e)).run();};
 for(const overrides of [{applied_amount:0,resulting_balance:MAX-1},{applied_amount:2,resulting_balance:MAX},{operation:'credit',original_entry_id:null},{sequence:wallet.version+2},{original_entry_id:'missing'},{original_entry_id:row.debit_entry_id},{requested_amount:6}])await assert.rejects(raw(overrides));
 const foreign=await account(db,10),foreignDebit=await debit(db,foreign,5);await assert.rejects(raw({original_entry_id:foreignDebit.entryId}),/credit_refund_invalid/);
 for(const statement of ["UPDATE credit_wallets SET balance=0 WHERE principal_id=?","DELETE FROM credit_wallets WHERE principal_id=?","UPDATE credit_ledger SET applied_amount=0 WHERE wallet_id=?","DELETE FROM credit_ledger WHERE wallet_id=?"])await assert.rejects(run(db,statement,owner.principalId));
 const refunded=await service(db).refund({owner,amount:5,originalEntryId:original.entryId,idempotencyKey:'capacity-refund'});assert.equal(refunded.requestedAmount,5);assert.equal(refunded.appliedAmount,1);assert.equal(refunded.capped,true);
 await assert.rejects(reward(db,owner,1),error('OVERFLOW'));
 await debit(db,owner,5);assert.equal((await service(db).refund({owner,amount:5,originalEntryId:original.entryId,idempotencyKey:'capacity-refund'})).status,'duplicate');await assert.rejects(service(db).refund({owner,amount:1,originalEntryId:original.entryId,idempotencyKey:'no-forfeiture-revival'}),error('INVALID_REFUND'));
 // A failure after preparing a partial/zero refund rolls back ledger, wallet and state together.
 for(const amount of [1,5]){
  const o=await account(db),request=await repo.insertAdmission(db,input(o));await reward(db,o,amount);const beforeWallet=await service(db).getBalance(o);
  const broken={prepare:s=>db.prepare(s),batch:s=>db.batch(s.length>1?[...s,db.prepare("SELECT json('synthetic-settlement-rollback')")]:s)};
  await assert.rejects(repo.failAdmission(broken,request.request_id,request.owner_token,now+1),error('ADMISSION_UNAVAILABLE'));
  assert.deepEqual(await service(db).getBalance(o),beforeWallet);assert.equal((await repo.readAdmission(db,request.request_id)).state,'started');assert.equal((await first(db,'SELECT count(*) n FROM credit_ledger WHERE original_entry_id=?',request.debit_entry_id)).n,0);
  assert.deepEqual((await admission.recoverExpiredGeneration(db,request.request_id,now+60001)).refund,{requested:5,applied:5-amount,forfeited:amount,full:false});
 }
 // Lost commit replies and lease recovery for Account partial AND zero effects.
 for(const amount of [1,5]){
  const o=await account(db),request=await repo.insertAdmission(db,input(o));await reward(db,o,amount);
  let calls=0;const lost={prepare:s=>db.prepare(s),async batch(s){const result=await db.batch(s);if(++calls===2)throw new Error('synthetic-lost-reply');return result;}};
  await assert.rejects(repo.failAdmission(lost,request.request_id,request.owner_token,now+1),error('ADMISSION_UNAVAILABLE'));
  const results=await Promise.all(Array.from({length:8},()=>admission.recoverExpiredGeneration(db,request.request_id,now+60001)));
  for(const result of results){assert.equal(result.state,'failed');assert.deepEqual(result.refund,{requested:5,applied:5-amount,forfeited:amount,full:false});}
  assert.equal((await first(db,'SELECT count(*) n FROM credit_ledger WHERE original_entry_id=?',request.debit_entry_id)).n,1);
  await debit(db,o,5);assert.equal((await repo.failAdmission(db,request.request_id,request.owner_token,now+120001)).refund.applied,5-amount);assert.equal((await service(db).getBalance(o)).balance,MAX-5);
 }
 // v6 accepts audited capacity effects; v4/v5 must reject the exact same ledger.
 await audit(db);const backup=await m('backup/export').exportBackup(db,new Date(now));assert.equal(backup.version,6);assert.equal(backup.schema.latestMigration,'0018_account_partial_refund.sql');assert.equal(Object.keys(backup.tables).length,14);assert(!Object.hasOwn(backup.tables,'assistant_admissions'));assert.doesNotMatch(JSON.stringify(backup),/session_hash.*synthetic-network|owner_token|input_hmac|reserved_cost_micros/);
 for(const version of [4,5]){const historical=structuredClone(backup);historical.version=version;historical.schema.latestMigration=m('backup/format').backupMigration(version);assert.throws(()=>m('backup/validator').validateBackup(historical),/Invalid Credit ledger effect/);assert.throws(()=>m('backup/restore-plan').buildRestorePlan(historical));}
 const reject=change=>{const broken=structuredClone(backup);change(broken);assert.throws(()=>m('backup/validator').validateBackup(broken));};
 const partial=b=>b.tables.credit_ledger.find(e=>e.original_entry_id===row.debit_entry_id);
 reject(b=>{partial(b).applied_amount=5;});reject(b=>{partial(b).requested_amount=6;});reject(b=>{partial(b).original_entry_id=foreignDebit.entryId;});reject(b=>{partial(b).sequence=999;});reject(b=>{partial(b).resulting_balance=MAX-1;});reject(b=>{partial(b).applied_amount=-1;});reject(b=>{partial(b).requested_amount=MAX+1;});reject(b=>{b.tables.credit_ledger.push({...partial(b),id:crypto.randomUUID()});b.counts.credit_ledger++;});reject(b=>{b.tables.assistant_admissions=[];b.counts.assistant_admissions=0;});
 const plan=m('backup/restore-plan').buildRestorePlan(backup);assert.equal(plan.executable,false);assert.equal(plan.dryRun,true);assert.equal(plan.sourceVersion,6);assert.equal(plan.targetSchema.latestMigration,'0018_account_partial_refund.sql');assert.match(plan.refundCompatibility,/capacity-limited/);assert(Object.hasOwn(plan.excludedTables,'assistant_admissions'));
 // Historical full effects remain valid in each of v4/v5/v6; no retroactive clamping.
 const full=await m('backup/export').exportBackup(interrupted,new Date(now));for(const version of [4,5,6]){const artifact={...full,version,schema:{latestMigration:m('backup/format').backupMigration(version)}};assert.equal(m('backup/validator').validateBackup(artifact).version,version);assert.equal(m('backup/restore-plan').buildRestorePlan(artifact).sourceVersion,version);}
 assert.equal(outbound,0);console.log(`Account partial refund: ${assertions} assertions PASS; real D1 clean 0000–0018, populated 0017 upgrade, four-statement parser, DDL rollback and interruption protection, Account partial/zero recovery, immutable ledger audit, version-specific v6 backup. SHA256 ${hash(sql)}. Provider calls ZERO; hosted/Production NOT TESTED.`);
}finally{await mf.dispose();loaded.dispose();}
