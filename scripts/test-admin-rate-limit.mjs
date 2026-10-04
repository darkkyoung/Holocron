import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';

const dataModule=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
async function transpile(path,replacements={}){
  let output=ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [specifier,url] of Object.entries(replacements))output=output.replaceAll(`'${specifier}'`,`'${url}'`).replaceAll(`"${specifier}"`,`"${url}"`);
  return dataModule(output);
}

const identity=await import(await transpile('../lib/admin/login-rate-limit-identity.ts'));
const forwarded=new Headers({'cf-connecting-ip':'203.0.113.8','x-forwarded-for':'198.51.100.2'});
assert.equal(identity.adminLoginClientAddress(forwarded),'203.0.113.8','the Cloudflare client address is used');
assert.equal(identity.adminLoginClientAddress(new Headers({'x-forwarded-for':'198.51.100.2'})),identity.MISSING_ADMIN_CLIENT_ADDRESS,'X-Forwarded-For is never trusted and a missing address uses the safe fallback');
const hash=await identity.hashAdminLoginClient('203.0.113.8','session-secret');
assert.equal(hash,await identity.hashAdminLoginClient('203.0.113.8','session-secret'),'the keyed client hash is stable');
assert.notEqual(hash,await identity.hashAdminLoginClient('203.0.113.9','session-secret'),'different client addresses have different buckets');
assert.match(hash,/^[a-f0-9]{64}$/,'the stored identity is an HMAC-SHA256 digest');
assert.doesNotMatch(hash,/203\.0\.113\.8/,'the digest does not contain the raw address');

const sqlite=new DatabaseSync(':memory:');
sqlite.exec(await readFile(new URL('../drizzle/0013_loving_silver_fox.sql',import.meta.url),'utf8'));
const d1={prepare(sql){return {bind(...args){return {async first(){return sqlite.prepare(sql).get(...args);},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}};}};}};
globalThis.__adminRateLimitTest={db:d1};
const newsUrl=dataModule('export const db=()=>globalThis.__adminRateLimitTest.db;');
const repositorySource=await readFile(new URL('../lib/admin/login-rate-limit-repository.ts',import.meta.url),'utf8');
const repository=await import(await transpile('../lib/admin/login-rate-limit-repository.ts',{'@/lib/news':newsUrl}));
const base=Date.parse('2026-10-04T00:00:00.000Z');
for(let attempt=1;attempt<=7;attempt++){
  const state=await repository.recordFailedAdminLogin(hash,base+attempt);
  assert.equal(state.failedCount,attempt,`failure ${attempt} increments the same client bucket`);
  assert.equal(state.blocked,false,'the client remains below the threshold');
}
const threshold=await repository.recordFailedAdminLogin(hash,base+8);
assert.equal(threshold.failedCount,repository.ADMIN_LOGIN_MAX_FAILURES,'the eighth failure reaches the threshold');
assert.equal(threshold.blocked,true,'the eighth failure starts a fifteen-minute block');
assert.equal((await repository.getAdminLoginRateLimit(hash,base+9)).blocked,true,'the block is checked before another credential attempt');
const otherHash=await identity.hashAdminLoginClient('203.0.113.9','session-secret');
assert.equal((await repository.getAdminLoginRateLimit(otherHash,base+9)).failedCount,0,'a different client is not globally blocked by the username');
const afterExpiry=await repository.recordFailedAdminLogin(hash,base+repository.ADMIN_LOGIN_BLOCK_MS+10);
assert.equal(afterExpiry.failedCount,1,'an expired window restarts at one failure');
assert.equal(afterExpiry.blocked,false,'an expired block does not persist');
await repository.clearAdminLoginRateLimit(hash);
assert.equal((await repository.getAdminLoginRateLimit(hash,base)).failedCount,0,'a successful login can clear its bucket');

const insert=sqlite.prepare('INSERT INTO admin_login_rate_limits(client_hash,failed_count,window_started_at,blocked_until,updated_at) VALUES(?,1,?,NULL,?)');
for(let index=0;index<125;index++)insert.run(`stale-${index}`,base,base-repository.ADMIN_LOGIN_STALE_MS-1);
insert.run('recent',base,base);
await repository.cleanupStaleAdminLoginRateLimits(base);
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM admin_login_rate_limits WHERE client_hash LIKE 'stale-%'").get().count,25,'stale cleanup is bounded to one hundred rows');
await repository.cleanupStaleAdminLoginRateLimits(base);
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM admin_login_rate_limits WHERE client_hash LIKE 'stale-%'").get().count,0,'later cleanup removes the bounded remainder');
assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM admin_login_rate_limits WHERE client_hash='recent'").get().count,1,'recent buckets are retained');
assert.doesNotMatch(JSON.stringify(sqlite.prepare('SELECT client_hash FROM admin_login_rate_limits').all()),/203\.0\.113\./,'the database stores no raw client address');
assert.match(repositorySource,/ON CONFLICT\(client_hash\) DO UPDATE/,'failure increments use one atomic UPSERT');
assert.match(repositorySource,/ORDER BY updated_at LIMIT \?/,'stale cleanup is bounded and uses the indexed timestamp');

const route=await readFile(new URL('../app/api/admin/login/route.ts',import.meta.url),'utf8');
assert.ok(route.indexOf('getAdminLoginRateLimit')<route.indexOf('request.formData()'),'an active block is checked before credentials are read');
assert.ok(route.indexOf('await clearAdminLoginRateLimit')<route.indexOf('await setAdminSession'),'a valid credential clears the client bucket before session issuance');
assert.match(route,/origin&&origin!==new URL\(request\.url\)\.origin/,'the existing same-origin guard remains in place');

delete globalThis.__adminRateLimitTest;sqlite.close();
console.log('Admin login rate limit: HMAC identity, atomic threshold, expiry, clear, isolation and bounded cleanup passed');
