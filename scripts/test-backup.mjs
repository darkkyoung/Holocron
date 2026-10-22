import nodeAssert from 'node:assert/strict';
let assertions=0;
const assert=new Proxy(nodeAssert,{get(target,key){return typeof target[key]==='function'?(...args)=>{assertions++;return target[key](...args);}:target[key];}});
import {readFile,readdir,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import {backupModuleUrls} from './backup-modules.mjs';

const urls=await backupModuleUrls();
const format=await import(urls.format),{validateBackup,serializeBackup}=await import(urls.validator),{exportBackup}=await import(urls.export),{buildRestorePlan}=await import(urls['restore-plan']);
const {BACKUP_TABLES,BACKUP_DEFINITIONS,BACKUP_SETTINGS_KEYS,MAX_TABLE_ROWS}=format;
const sqlite=new DatabaseSync(':memory:');
const migrations=(await readdir(new URL('../drizzle/',import.meta.url))).filter(name=>name.endsWith('.sql')).sort();
for(const name of migrations)sqlite.exec(await readFile(new URL(`../drizzle/${name}`,import.meta.url),'utf8'));
assert.equal(format.BACKUP_MIGRATION,migrations.at(-1),'schema marker must track the latest migration');
for(const name of BACKUP_TABLES){
  const actual=sqlite.prepare(`PRAGMA table_info(${name})`).all();
  assert.deepEqual(Object.keys(BACKUP_DEFINITIONS[name].columns).sort(),actual.map(row=>row.name).sort(),`${name}: explicit columns match migrations`);
  for(const column of actual){const kind=BACKUP_DEFINITIONS[name].columns[column.name];assert.equal(kind==='integer',column.type.toLowerCase()==='integer');if(!column.notnull&&!column.pk)assert.equal(kind,'nullable-text');}
}
let reads=0,batches=0;
const database={
  prepare(sql){assert.match(sql,/^WITH data AS \(SELECT /);assert.doesNotMatch(sql,/\b(INSERT|UPDATE|DELETE|DROP|ALTER|REPLACE)\b/i);return {sql,args:[],bind(...args){this.args=args;return this;}};},
  async batch(statements){batches++;sqlite.exec('BEGIN');try{const result=statements.map(({sql,args})=>{reads++;return {success:true,results:sqlite.prepare(sql).all(...args)};});sqlite.exec('COMMIT');return result;}catch(error){sqlite.exec('ROLLBACK');throw error;}},
};
const now=new Date();
const row=(name,overrides={})=>Object.fromEntries(Object.entries(BACKUP_DEFINITIONS[name].columns).map(([key,type])=>[key,Object.hasOwn(overrides,key)?overrides[key]:type==='integer'?1:type==='nullable-text'?null:`value-${key}`]));
function insert(name,values){const keys=Object.keys(values);sqlite.prepare(`INSERT INTO ${name} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(key=>values[key]));}
sqlite.exec("INSERT INTO assistant_monthly_costs VALUES('2026-10',100,100,20,1,1)");
let backup=await exportBackup(database,now);
assert.equal(batches,1);assert.equal(reads,BACKUP_TABLES.length*2,'one read-only batch with size/count guard and row query per dataset');
assert.equal(validateBackup(serializeBackup(backup)).counts.articles,0,'empty durable tables are valid');
insert('articles',row('articles',{id:'z',url:'https://example.com/z'}));
insert('articles',row('articles',{id:'a',url:'https://example.com/a'}));
insert('works',row('works',{id:'w',creator_credit:'Director',principal_cast:'["Actor"]',synopsis:'Synopsis',release_context:'Release'}));
insert('article_work_relations',{article_id:'a',work_id:'w',state:'excluded',origin:'manual'});
const creditTime='2026-10-14T00:00:00.000Z';
insert('users',{id:'user-fixture',created_at:creditTime});
insert('auth_accounts',{provider:'google',provider_subject:'fake-provider-fixture',user_id:'user-fixture',created_at:creditTime});
for(const [id,type,hash,user] of [['guest-fixture','guest','a'.repeat(64),null],['account-fixture','account',null,'user-fixture']]){
  insert('credit_principals',{id,type,guest_key_hash:hash,user_id:user,created_at:creditTime,retired_at:null});
  insert('credit_wallets',{principal_id:id,balance:0,version:0,created_at:creditTime,updated_at:creditTime});
  insert('credit_ledger',{id:id+'-entry',wallet_id:id,sequence:1,operation:'credit',kind:'reward',idempotency_key:'fixture-credit',requested_amount:3,applied_amount:3,resulting_balance:3,reference_type:null,reference_id:null,original_entry_id:null,created_at:creditTime});
}
insert('quizzes',row('quizzes',{id:'q'}));insert('quizzes',row('quizzes',{id:'q2'}));
insert('quiz_options',row('quiz_options',{id:'o2',quiz_id:'q',position:2}));insert('quiz_options',row('quiz_options',{id:'o',quiz_id:'q',position:0}));
insert('quiz_responses',row('quiz_responses',{quiz_id:'q',option_id:'o',session_hash:'pseudonymous'}));
insert('beta_analytics_daily_sessions',row('beta_analytics_daily_sessions'));
insert('feedback_sessions',row('feedback_sessions'));
for(const key of BACKUP_SETTINGS_KEYS)insert('settings',{key,value:key==='homepage_announcement_v1'?JSON.stringify({schemaVersion:1,revision:1,id:null,updatedAt:now.toISOString(),enabled:false,title:'',body:'',alt:'',decorative:true,crop:{x:50,y:50,zoom:100},image:null}):'product-config'});
for(const key of [...Object.keys(format.EXCLUDED_SETTINGS),'unknown_future_key','OPENAI_API_KEY','HOLOCRON_ADMIN_PASSWORD','TMDB_API_READ_ACCESS_TOKEN'])insert('settings',{key,value:'excluded-secret-sentinel'});
sqlite.exec("INSERT INTO collection_locks VALUES ('collection','owner','manual','now','future'); INSERT INTO feedback_rate_limits VALUES ('session','future'); INSERT INTO admin_login_rate_limits VALUES ('client',2,0,NULL,0)");
const beforeExport=sqlite.prepare('SELECT total_changes() AS count').get().count;
backup=await exportBackup(database,now);
assert.equal(sqlite.prepare('SELECT total_changes() AS count').get().count,beforeExport,'export makes no database mutations');
assert.deepEqual(backup.tables.articles.map(item=>item.id),['a','z']);
assert.deepEqual(backup.tables.quiz_options.map(item=>item.id),['o','o2']);
assert.deepEqual(backup.tables.settings.map(item=>item.key),[...BACKUP_SETTINGS_KEYS]);
assert.deepEqual(Object.keys(backup.tables),BACKUP_TABLES);
assert.equal(backup.counts.quiz_responses,1);assert.equal(backup.counts.settings,6);
const json=serializeBackup(backup);
assert.equal(json,serializeBackup(await exportBackup(database,now)),'stable export');
assert.doesNotMatch(json,/excluded-secret-sentinel|collection_locks|admin_login_rate_limits|feedback_rate_limits|OPENAI_API_KEY|HOLOCRON_ADMIN_PASSWORD|TMDB_API_READ_ACCESS_TOKEN/);
assert.equal(validateBackup(json).format,'holocron-d1-backup');assert.equal(backup.version,9);
assert.equal(backup.counts.article_work_relations,1);
assert.equal(backup.counts.credit_ledger,2);
assert.equal(backup.counts.credit_principals,2);
assert.doesNotMatch(json,/raw_ip|guest_cookie|access_token|refresh_token|HOLOCRON_GUEST_SIGNING_SECRET/);
const reject=(mutate,pattern)=>{const broken=structuredClone(backup);mutate(broken);assert.throws(()=>validateBackup(broken),pattern);assert.throws(()=>buildRestorePlan(broken));};
assert.throws(()=>validateBackup('{'),/JSON/);
reject(b=>{b.format='other';},/format/);reject(b=>{b.version=99;},/version/);
reject(b=>{b.createdAt='2026-02-30T00:00:00.000Z';},/createdAt/);
reject(b=>{b.schema.latestMigration='future.sql';},/schema/);
reject(b=>{delete b.tables.works;},/dataset/);
reject(b=>{b.tables.articles[0].id=null;},/field/);
reject(b=>{b.tables.articles[0].id='';},/primary key/);
reject(b=>{b.tables.articles[0].raw_ip='127.0.0.1';},/shape/);
for(const name of BACKUP_TABLES)reject(b=>{b.tables[name].push({...b.tables[name][0]});b.counts[name]++;},/Duplicate/);
reject(b=>{b.tables.articles[1].url=b.tables.articles[0].url;},/Duplicate/);
reject(b=>{b.tables.quiz_options[0].quiz_id='missing';},/Orphan/);
reject(b=>{b.tables.quiz_responses[0].quiz_id='missing';},/Orphan/);
reject(b=>{b.tables.quiz_responses[0].option_id='missing';},/option/);
reject(b=>{b.tables.quiz_responses[0].quiz_id='q2';},/cross-quiz/);
reject(b=>{b.counts.articles++;},/Count/);
reject(b=>{b.tables.settings[0].key='admin';},/Forbidden/);
reject(b=>{b.tables.article_work_relations[0].article_id='missing';},/Orphan article/);
reject(b=>{b.tables.article_work_relations[0].work_id='missing';},/Orphan article/);
reject(b=>{b.tables.article_work_relations[0].state='bad';},/state/);
reject(b=>{b.tables.article_work_relations[0].origin='bad';},/origin/);
reject(b=>{b.tables.article_work_relations[0].origin='automatic';},/state/);
reject(b=>{b.tables.credit_wallets[0].balance=4;},/mismatch/);
reject(b=>{b.tables.credit_principals[0].type='invalid';},/principal/);
reject(b=>{b.tables.auth_accounts[0].user_id='orphan';},/linkage/);
reject(b=>{b.tables.credit_ledger[0].wallet_id='orphan';},/Orphan/);
reject(b=>{b.tables.credit_ledger[0].sequence=2;},/sequence/);
reject(b=>{b.tables.credit_ledger[0].applied_amount=4;},/effect/);
reject(b=>{b.tables.credit_ledger[0].reference_type='quiz';},/reference/);
reject(b=>{b.tables.credit_ledger[0].operation='refund';b.tables.credit_ledger[0].original_entry_id=b.tables.credit_ledger[0].id;},/refund/);
reject(b=>{b.tables.credit_wallets[0].raw_cookie='forbidden';},/shape/);
const v8=structuredClone(backup);v8.version=8;v8.schema.latestMigration=format.BACKUP_V8_MIGRATION;assert.equal(validateBackup(v8).version,8);
const v7=structuredClone(backup);v7.version=7;v7.schema.latestMigration=format.BACKUP_V8_MIGRATION;v7.tables.settings=v7.tables.settings.filter(row=>row.key!=='homepage_announcement_v1');v7.counts.settings=v7.tables.settings.length;assert.equal(validateBackup(serializeBackup(v7)).version,7);assert.match(buildRestorePlan(v7).announcementCompatibility,/clear it/);
const historicalInjection=structuredClone(v7);historicalInjection.tables.settings.push(backup.tables.settings.find(row=>row.key==='homepage_announcement_v1'));historicalInjection.counts.settings++;assert.throws(()=>validateBackup(historicalInjection),/Forbidden/);
const v6=structuredClone(v7);v6.version=6;v6.schema.latestMigration=format.BACKUP_V6_MIGRATION;for(const name of format.POLICY_BACKUP_TABLES){delete v6.tables[name];delete v6.counts[name];}
assert.equal(validateBackup(serializeBackup(v6)).version,6);
const v5=structuredClone(v6);v5.version=5;v5.schema.latestMigration=format.BACKUP_V5_MIGRATION;
assert.equal(validateBackup(serializeBackup(v5)).version,5);assert.equal(buildRestorePlan(v5).sourceVersion,5);assert.equal(JSON.stringify(v5.tables),JSON.stringify(v6.tables));
const v4=structuredClone(v6);v4.version=4;v4.schema.latestMigration=format.BACKUP_V4_MIGRATION;
assert.equal(validateBackup(serializeBackup(v4)).version,4);
assert.equal(JSON.stringify(v4.tables),JSON.stringify(v6.tables));
assert.equal(buildRestorePlan(v4).sourceVersion,4);
const v3=structuredClone(v6);v3.version=3;v3.schema.latestMigration=format.BACKUP_V3_MIGRATION;
for(const name of format.CREDIT_BACKUP_TABLES){delete v3.tables[name];delete v3.counts[name];}
assert.equal(validateBackup(serializeBackup(v3)).version,3);
assert.equal(buildRestorePlan(v3).counts.credit_ledger,0);
assert.match(buildRestorePlan(v3).creditCompatibility,/ZERO Account/);
const v2=structuredClone(v3);v2.version=2;v2.schema.latestMigration=format.BACKUP_V2_MIGRATION;
for(const row of v2.tables.works)for(const key of Object.keys(format.WORK_METADATA_DEFAULTS))delete row[key];
assert.equal(validateBackup(serializeBackup(v2)).version,2);
assert.deepEqual(buildRestorePlan(v2).workMetadataDefaults,format.WORK_METADATA_DEFAULTS);
assert.equal(backup.tables.works.find(row=>row.id==='w').principal_cast,'["Actor"]');
reject(b=>{b.tables.works[0].principal_cast='{';},/cast/);
const historical=structuredClone(v2);historical.version=1;historical.schema.latestMigration=format.BACKUP_V1_MIGRATION;delete historical.tables.article_work_relations;delete historical.counts.article_work_relations;
assert.equal(validateBackup(serializeBackup(historical)).version,1);
assert.equal(buildRestorePlan(historical).counts.article_work_relations,0);
assert.match(buildRestorePlan(historical).compatibility,/ZERO relations/);
for(const name of Object.keys(format.EXCLUDED_TABLES))reject(b=>{b.tables[name]=[];},/forbidden/);
const beforePlan=sqlite.prepare('SELECT total_changes() AS count').get().count;
const plan=buildRestorePlan(json);
assert.equal(plan.dryRun,true);assert.equal(plan.executable,false);
assert.deepEqual(plan.counts,backup.counts);
assert.ok(plan.deleteOrder.indexOf('quiz_responses')<plan.deleteOrder.indexOf('quiz_options'));
assert.ok(plan.deleteOrder.indexOf('quiz_options')<plan.deleteOrder.indexOf('quizzes'));
assert.ok(plan.insertOrder.indexOf('quizzes')<plan.insertOrder.indexOf('quiz_options'));
assert.ok(plan.insertOrder.indexOf('quiz_options')<plan.insertOrder.indexOf('quiz_responses'));
assert.deepEqual(plan.targetTables,BACKUP_TABLES);
assert.ok(plan.deleteOrder.indexOf('article_work_relations')<plan.deleteOrder.indexOf('articles'));
assert.ok(plan.deleteOrder.indexOf('article_work_relations')<plan.deleteOrder.indexOf('works'));
assert.ok(plan.insertOrder.indexOf('article_work_relations')>plan.insertOrder.indexOf('articles'));
assert.ok(plan.insertOrder.indexOf('article_work_relations')>plan.insertOrder.indexOf('works'));
assert.deepEqual(plan.settings.replacementScope,[...BACKUP_SETTINGS_KEYS]);
assert.equal(sqlite.prepare('SELECT total_changes() AS count').get().count,beforePlan);
const shuffled=structuredClone(backup);shuffled.tables.articles.reverse();assert.equal(serializeBackup(shuffled),json);
const originalBatch=database.batch.bind(database);
database.batch=async statements=>{const r=await originalBatch(statements);r[1].results.pop();return r;};
await assert.rejects(exportBackup(database,now),/불완전/);
database.batch=async()=>{throw new Error('private internal error');};await assert.rejects(exportBackup(database,now),error=>!error.message.includes('private internal'));
database.batch=originalBatch;
sqlite.exec('BEGIN');for(let i=0;i<MAX_TABLE_ROWS;i++)insert('articles',row('articles',{id:`extra-${i}`,url:`https://example.com/${i}`}));sqlite.exec('COMMIT');
await assert.rejects(exportBackup(database,now),/한도 초과/);
sqlite.exec("DELETE FROM articles WHERE id LIKE 'extra-%'");
sqlite.prepare('UPDATE articles SET summary=? WHERE id=?').run('x'.repeat(format.MAX_TABLE_BYTES+1),'a');
await assert.rejects(exportBackup(database,now),/한도 초과/);
sqlite.prepare('UPDATE articles SET summary=? WHERE id=?').run('value-summary','a');

// Execute the actual route with only its session and D1 dependencies replaced.
const dataUrl=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
globalThis.__backupTest={admin:false,database};
let routeSource=await readFile(new URL('../app/api/admin/backup/route.ts',import.meta.url),'utf8');
for(const [path,url] of Object.entries({'@/lib/admin/session':dataUrl('export const getAdminSession=async()=>globalThis.__backupTest.admin?{sub:"admin"}:null;'),'@/lib/news':dataUrl('export const db=()=>globalThis.__backupTest.database;'),'@/lib/backup/export':urls.export,'@/lib/backup/format':urls.format,'@/lib/backup/validator':urls.validator}))routeSource=routeSource.replaceAll(`'${path}'`,JSON.stringify(url));
const route=await import(dataUrl(ts.transpileModule(routeSource,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText));
const request=(origin='https://holocron.kr')=>new Request('https://holocron.kr/api/admin/backup',{method:'POST',headers:{origin}});
const readsBefore=reads;
let response=await route.POST(request());assert.equal(response.status,401);assert.match(response.headers.get('cache-control'),/private.*no-store/);assert.equal(reads,readsBefore);
globalThis.__backupTest.admin=true;
response=await route.POST(request('https://evil.example'));assert.equal(response.status,403);assert.equal(reads,readsBefore);
response=await route.POST(request());assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/^attachment; filename="holocron-backup-[\w.-]+\.json"$/);
assert.equal(response.headers.get('content-type'),'application/json; charset=utf-8');assert.match(response.headers.get('cache-control'),/no-store/);assert.equal(response.headers.get('x-content-type-options'),'nosniff');validateBackup(await response.text());
database.batch=async()=>{throw new Error('private internal error');};response=await route.POST(request());assert.equal(response.status,500);assert.doesNotMatch(await response.text(),/private internal/);database.batch=originalBatch;
delete globalThis.__backupTest;
const temp=await mkdtemp(join(tmpdir(),'holocron-backup-test-'));
try{
  const filename=join(temp,'backup.json');await writeFile(filename,json);
  for(const action of ['validate','plan']){const run=spawnSync(process.execPath,['scripts/backup.mjs',action,filename],{encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert.doesNotMatch(run.stdout,/excluded-secret-sentinel|value-summary/);}
  for(const old of [historical,v2,v3,v4,v5,v6,v7]){await writeFile(filename,serializeBackup(old));for(const action of ['validate','plan'])assert.equal(spawnSync(process.execPath,['scripts/backup.mjs',action,filename]).status,0);}
  await writeFile(filename,'{}');assert.equal(spawnSync(process.execPath,['scripts/backup.mjs','plan',filename]).status,1);
}finally{await rm(temp,{recursive:true,force:true});sqlite.close();}
console.log(`D1 backup: ${assertions} assertions passed; v1/v2/v3/v4/v5/v6/v7/v8, read-only export, security, graph/audit validation, dry-run and route integration`);
