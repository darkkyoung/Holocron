import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';

const require=createRequire(import.meta.url);
const {unstable_splitSqlQuery:split}=require('wrangler');
const {Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
const sql=await readFile(new URL('../drizzle/0016_account_credit_foundation.sql',import.meta.url),'utf8');
const fixture=await readFile(new URL('./fixtures/credit-triggers-v78.sql',import.meta.url),'utf8');
const intended=sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
const triggers=intended.filter(s=>/CREATE TRIGGER/.test(s));
const names=['credit_wallet_zero','credit_principal_immutable','credit_ledger_guard','credit_wallet_guard','credit_ledger_apply','credit_ledger_no_update','credit_ledger_no_delete','credit_wallet_no_delete'].sort();
assert.equal(require('wrangler/package.json').version,'4.92.0','review splitter changes when upgrading Wrangler');
assert.ok(!sql.includes('\r'),'migration must use LF');
assert.ok(sql.endsWith('\n'));
assert.equal(triggers.length,8);
for(const trigger of triggers){
  assert.doesNotMatch(trigger,/\bCASE\b/i,'no CASE at all in trigger programs');
  assert.equal((trigger.match(/\bBEGIN\b/g)||[]).length,1);
  assert.equal((trigger.match(/\bEND\b/g)||[]).length,1);
}
assert.equal(intended.length,19);
assert.equal(split(sql).length,19);
assert.equal(split(fixture).length,8,'exact v78 fixture already passes local splitter');
assert.equal((fixture.match(/\bCASE\b/g)||[]).length,3,'historical hosted hazard remains represented');
assert.equal(split(fixture.replace('= CASE','=CASE')).length,10,'v77 local splitter failure reproduces');
// No invented remote parser: historical SQL is valid locally. The no-CASE contract
// guards the reported hosted hazard, while actual D1 behavior is checked below.
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("migration-test")}}',compatibilityDate:'2026-05-15',d1Databases:['old','current','chain']});
try{
  const old=await mf.getD1Database('old'),current=await mf.getD1Database('current');
  const prefix=intended.filter(s=>!s.includes('CREATE TRIGGER'));
  await old.batch([...prefix,...split(fixture)].map(s=>old.prepare(s)));
  await current.batch(split(sql).map(s=>current.prepare(s)));
  for(const db of [old,current]){
    const rows=await db.prepare("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name").all();
    assert.deepEqual(rows.results.map(r=>r.name),names);
  }
  // iif is SQLite's short-circuit CASE equivalent, including false/NULL branches.
  for(const amount of [-9007199254740991,-1,0,1,3,9007199254740991,null])for(const type of ['guest','account',null])for(const balance of [0,9,10,null]){
    const r=await current.prepare("SELECT CASE WHEN ?1>0 AND ?2='guest' THEN min(?1,10-?3) ELSE ?1 END AS before, iif(?1>0 AND ?2='guest',min(?1,10-?3),?1) AS after").bind(amount,type,balance).first();
    assert.equal(r.before,r.after);
  }
  // Run the same valid/invalid direct ledger writes against the exact old triggers
  // and the correction; compare abort strings and persistent wallet/ledger state.
  async function scenario(db){
    const outcomes=[];
    async function run(statement){try{await db.prepare(statement).run();outcomes.push('ok');}catch(e){outcomes.push(e.message.match(/credit_[a-z_]+/)?.[0]||e.message);}}
    await run("INSERT INTO credit_principals VALUES ('g','guest','"+'a'.repeat(64)+"',NULL,'t',NULL)");
    await run("INSERT INTO credit_wallets VALUES ('g',1,0,'t','t')");
    await run("INSERT INTO credit_wallets VALUES ('g',0,0,'t','t')");
    const entry=(id,sequence,operation,requested,applied,balance,original='NULL')=>`INSERT INTO credit_ledger (id,wallet_id,sequence,operation,kind,idempotency_key,requested_amount,applied_amount,resulting_balance,original_entry_id,created_at) VALUES ('${id}','g',${sequence},'${operation}','reward','${id}',${requested},${applied},${balance},${original},'t')`;
    await run(entry('bad-state',1,'credit',3,3,4));
    await run(entry('seed',1,'credit',9,9,9));
    await run(entry('bad-cap',2,'credit',3,3,12));
    await run(entry('cap',2,'credit',3,1,10));
    await run(entry('spend',3,'debit',-5,-5,5));
    await run(entry('bad-refund',4,'refund',5,5,10,"'seed'"));
    await run(entry('refund',4,'refund',5,5,10,"'spend'"));
    await run(entry('refund-again',5,'refund',1,0,10,"'spend'"));
    await run("UPDATE credit_wallets SET balance=0 WHERE principal_id='g'");
    await run("UPDATE credit_ledger SET applied_amount=0 WHERE id='seed'");
    await run("DELETE FROM credit_ledger WHERE id='seed'");
    await run("DELETE FROM credit_wallets WHERE principal_id='g'");
    assert.deepEqual(outcomes,['ok','credit_wallet_must_start_zero','ok','credit_ledger_state_invalid','ok','credit_ledger_state_invalid','ok','ok','credit_refund_invalid','ok','credit_refund_invalid','credit_wallet_requires_ledger','credit_ledger_append_only','credit_ledger_append_only','credit_wallet_audit_required']);
    return {outcomes,wallet:await db.prepare('SELECT * FROM credit_wallets').all(),ledger:await db.prepare('SELECT * FROM credit_ledger ORDER BY sequence').all()};
  }
  const a=await scenario(old),b=await scenario(current);
  assert.deepEqual(a.outcomes,b.outcomes);assert.deepEqual(a.wallet.results,b.wallet.results);assert.deepEqual(a.ledger.results,b.ledger.results);
  const chain=await mf.getD1Database('chain');
  for(const file of (await readdir(new URL('../drizzle/',import.meta.url))).filter(f=>/^\d{4}_.*\.sql$/.test(f)).sort()){
    const migration=await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8');
    await chain.batch(split(migration).map(s=>chain.prepare(s)));
  }
  const all=await chain.prepare("SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name").all();
  assert.deepEqual(all.results.map(r=>r.name),names);
  console.log(`Credit migration parser PASS: LF, 19 statements, 8 triggers, clean 0000–0016 chain, historical fixture and 84 cap-equivalence cases, exact guard abort/state parity; SHA256 ${createHash('sha256').update(sql).digest('hex')}`);
}finally{await mf.dispose();}
