import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function loadPureModule(path){
  const source=await readFile(new URL(path,import.meta.url),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const credentials=await loadPureModule('../lib/admin/credentials.ts');
const session=await loadPureModule('../lib/admin/session-crypto.ts');
const loginPage=await readFile(new URL('../app/admin/login/page.tsx',import.meta.url),'utf8');
const loginRoute=await readFile(new URL('../app/api/admin/login/route.ts',import.meta.url),'utf8');
const logoutRoute=await readFile(new URL('../app/api/admin/logout/route.ts',import.meta.url),'utf8');
const adminPage=await readFile(new URL('../app/admin/page.tsx',import.meta.url),'utf8');
const manageRoute=await readFile(new URL('../app/api/manage/route.ts',import.meta.url),'utf8');
const sessionSource=await readFile(new URL('../lib/admin/session.ts',import.meta.url),'utf8');
const newsroom=await readFile(new URL('../app/newsroom.tsx',import.meta.url),'utf8');

assert.equal(await credentials.verifyAdminCredentials('operator','correct-password','operator','correct-password'),true,'correct credentials are accepted');
assert.equal(await credentials.verifyAdminCredentials('operator','wrong-password','operator','correct-password'),false,'wrong password is rejected');
assert.equal(await credentials.verifyAdminCredentials('wrong-user','correct-password','operator','correct-password'),false,'wrong ID is rejected');
assert.equal(await credentials.verifyAdminCredentials('operator','correct-password',undefined,'correct-password'),false,'missing configured credentials fail closed');

const now=1_800_000_000_000;
const token=await session.createAdminSessionToken('session-secret',now);
assert.ok(token,'a signed session token is issued');
assert.equal((await session.verifyAdminSessionToken(token,'session-secret',now+1000))?.sub,'admin','valid session verifies');
assert.equal(await session.verifyAdminSessionToken(token,'wrong-secret',now+1000),null,'wrong secret rejects session');
const [tokenPayload,tokenSignature]=token.split('.');
const tamperedToken=`${tokenPayload}.${tokenSignature.startsWith('x')?'y':'x'}${tokenSignature.slice(1)}`;
assert.equal(await session.verifyAdminSessionToken(tamperedToken,'session-secret',now+1000),null,'tampered session rejects');
assert.equal(await session.verifyAdminSessionToken(token,'session-secret',now+12*60*60*1000+1),null,'expired session rejects');

assert.match(sessionSource,/HOLOCRON_ADMIN_USERNAME/,'username comes from server environment');
assert.match(sessionSource,/HOLOCRON_ADMIN_PASSWORD/,'password comes from server environment');
assert.match(sessionSource,/HOLOCRON_ADMIN_SESSION_SECRET/,'session secret comes from server environment');
assert.match(sessionSource,/httpOnly:true/,'session cookie is HttpOnly');
assert.match(sessionSource,/secure:true/,'session cookie is Secure');
assert.match(sessionSource,/sameSite:'lax'/,'session cookie is SameSite=Lax');
assert.match(loginPage,/method="post" action="\/api\/admin\/login"/,'login form submits to server route');
assert.match(loginRoute,/authenticateAdmin/,'login credentials are checked server-side');
assert.match(loginRoute,/setAdminSession/,'successful login sets a server session');
assert.match(logoutRoute,/clearAdminSession/,'logout clears the session');
assert.match(adminPage,/requireAdminSession/,'admin page requires a valid session');
assert.match(manageRoute,/getAdminSession/,'management API checks the same session');
assert.doesNotMatch(newsroom,/admin-link|href="\/admin\/login"/,'public header does not expose an admin entry');
assert.match(loginPage,/export default async function AdminLogin/,'the direct /admin/login route remains available');
assert.doesNotMatch(loginPage,/1234/,'test credentials are not hardcoded in the login page');
console.log('Admin authentication: 22 assertions passed');
