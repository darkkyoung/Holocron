import {DatabaseSync} from 'node:sqlite';
import {readdir,lstat,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {loadTestModules} from '../test-module-loader.mjs';
import {audit} from './local-runtime.mjs';
import {hash,fail,privateDirectory} from './budget.mjs';

/** Inspect the existing Miniflare SQLite store without starting a Worker, applying
 * migrations, creating a D1 database, recovering admissions or writing any rows.
 * The adapter exposes SELECTs only; all reads share one read-only transaction. */
export async function inspectLocal(directory,at){
  await privateDirectory(directory,{existing:true});
  const folder=join(directory,'local-d1'),files=[];
  async function walk(path,depth=0){
    if(depth>3)fail('LOCAL_STORE_LAYOUT_UNSUPPORTED');
    for(const entry of await readdir(path,{withFileTypes:true})){
      const file=join(path,entry.name);
      if(entry.isSymbolicLink())fail('LOCAL_STORE_SYMLINK');
      if(entry.isDirectory())await walk(file,depth+1);
      else if(entry.isFile()&&entry.name.endsWith('.sqlite')&&entry.name!=='metadata.sqlite')files.push(file);
    }
  }
  if((await lstat(folder)).isSymbolicLink())fail('LOCAL_STORE_SYMLINK');
  await walk(folder);if(files.length!==1)fail('LOCAL_STORE_LAYOUT_UNSUPPORTED');
  const sqlite=new DatabaseSync(files[0],{readOnly:true});let loaded;
  try{
    sqlite.exec('PRAGMA query_only=ON; BEGIN');
    if(sqlite.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')fail('LOCAL_DATABASE_CORRUPT');
    const names=(await readdir('drizzle')).filter(n=>n.endsWith('.sql')).sort();
    const schemaHash=hash((await Promise.all(names.map(n=>readFile('drizzle/'+n,'utf8')))).join('\n'));
    if(sqlite.prepare("SELECT value FROM settings WHERE key='evaluation_schema_hash'").get()?.value!==schemaHash)fail('LOCAL_SCHEMA_MISMATCH');
    const db={prepare(sql){
      if(!/^\s*(SELECT|WITH)\b/i.test(sql))fail('READ_ONLY_INSPECTION');
      const statement=sqlite.prepare(sql);let bindings=[];
      return {bind(...values){bindings=values;return this;},async all(){return {success:true,results:statement.all(...bindings)};},async first(){return statement.get(...bindings)??null;}};
    },async batch(statements){return Promise.all(statements.map(s=>s.all()));}};
    loaded=await loadTestModules(['lib/backup/export.ts','lib/backup/validator.ts']);
    const ledger=await audit({db,m:p=>loaded.modules['lib/'+p+'.ts'],outbound:()=>0},at);
    const admissions=sqlite.prepare("SELECT * FROM assistant_admissions WHERE action!='retrieve' ORDER BY created_at,request_id").all();
    const entries=sqlite.prepare('SELECT * FROM credit_ledger ORDER BY wallet_id,sequence').all();
    const wallets=sqlite.prepare('SELECT * FROM credit_wallets ORDER BY principal_id').all();
    const principals=sqlite.prepare('SELECT * FROM credit_principals ORDER BY id').all();
    const policy=sqlite.prepare("SELECT name FROM sqlite_master WHERE name='credit_policy_revisions'").get();
    const extensions=policy?{policy:sqlite.prepare('SELECT * FROM credit_policy_revisions ORDER BY version').all(),monthly:sqlite.prepare('SELECT * FROM assistant_monthly_costs ORDER BY month').all()}:null;
    const digest=hash(JSON.stringify({schemaHash,admissions,entries,wallets,principals,...(extensions?{extensions}:{})}));
    return {ledger,admissions,entries,digest,walletCount:wallets.length,unsettled:admissions.filter(r=>['started','refund_pending'].includes(r.state)).length};
  }catch(e){if(/^[A-Z_]+$/.test(e.message))throw e;fail('LOCAL_DATABASE_INSPECTION_FAILED');}
  finally{sqlite.close();await loaded?.dispose();}
}
