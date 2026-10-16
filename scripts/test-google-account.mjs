import nodeAssert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {loadTestModules} from './test-module-loader.mjs';
let assertions=0;
const assert=new Proxy(nodeAssert,{apply(t,s,a){assertions++;return Reflect.apply(t,s,a);},get(t,k){return typeof t[k]==='function'?(...a)=>{assertions++;return t[k](...a);}:t[k];}});
const config={clientId:'local-client.apps.googleusercontent.com',clientSecret:'local-google-secret',sessionSecret:'local-account-session-secret-at-least-32-bytes'};
const guestSecret='local-guest-secret-at-least-32-bytes';
const now=new Date('2026-10-12T03:00:00Z');
globalThis.__accountEnv={HOLOCRON_GOOGLE_CLIENT_ID:config.clientId,HOLOCRON_GOOGLE_CLIENT_SECRET:config.clientSecret,HOLOCRON_ACCOUNT_SESSION_SECRET:config.sessionSecret,HOLOCRON_GUEST_SIGNING_SECRET:guestSecret};
const files=['lib/identity/google/protocol.ts','lib/identity/google/flow.ts','lib/identity/google/service.ts','lib/identity/account-session.ts','lib/identity/current-owner.ts','lib/identity/signed-cookie.ts','lib/identity/repository.ts','lib/identity/service.ts','lib/credit/account-login.ts','lib/credit/service.ts','lib/credit/rewards/repository.ts','lib/quiz/credit-response.ts','lib/admin/session-crypto.ts','lib/identity/login-notice.ts','app/api/auth/logout/route.ts','app/api/auth/google/start/route.ts','app/api/auth/google/callback/route.ts','app/api/credit/visit/route.ts','app/api/quiz/route.ts','lib/backup/format.ts','lib/backup/validator.ts','lib/backup/restore-plan.ts'];
const loaded=await loadTestModules(files,{stubs:{'@/lib/news':'export function db(){return globalThis.__accountDb}', 'cloudflare:workers':'export const env=globalThis.__accountEnv;'}});
const m=loaded.modules,protocol=m[files[0]],flow=m[files[1]],login=m[files[2]],session=m[files[3]],current=m[files[4]],identity=m[files[6]],guest=m[files[7]],migration=m[files[8]],rewards=m[files[10]],quiz=m[files[11]];
const require=createRequire(import.meta.url),{Miniflare}=createRequire(require.resolve('wrangler'))('miniflare');
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("local-account")}}',compatibilityDate:'2026-05-15',d1Databases:['DB']});
const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'local-key',alg:'RS256',use:'sig'};
const enc=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
async function token(nonce,subject='subject-one',patch={},headerPatch={}){
  const header=enc({alg:'RS256',kid:'local-key',...headerPatch}),body=enc({iss:'https://accounts.google.com',aud:config.clientId,sub:subject,iat:Math.floor(now.getTime()/1000),exp:Math.floor(now.getTime()/1000)+3600,nonce,...patch});
  const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(header+'.'+body));
  return header+'.'+body+'.'+Buffer.from(signature).toString('base64url');
}
const jwksFetch=async url=>{assert.equal(url,protocol.GOOGLE_JWKS);return Response.json({keys:[jwk]});};
const pair=value=>value.split(';')[0];
const req=(cookies='',url='https://holocron.kr/')=>new Request(url,{headers:{Cookie:cookies}});
async function callback(subject,guestCookie='',options={}){
  const start=await flow.startGoogleLogin(req('','https://holocron.kr/api/auth/google/start?returnTo=%2Fquiz'),config,now),authorization=new URL(start.location);
  const url=protocol.GOOGLE_CALLBACK+'?'+new URLSearchParams({state:authorization.searchParams.get('state'),code:'local-code',iss:'https://accounts.google.com'});
  const request=req([pair(start.setCookie),guestCookie].filter(Boolean).join('; '),url);
  const fetcher=async(url,init)=>{
    assert.equal(init.redirect,'manual');
    if(url===protocol.GOOGLE_JWKS)return Response.json({keys:[jwk]});
    assert.equal(url,protocol.GOOGLE_TOKEN);assert.equal(init.method,'POST');
    const body=new URLSearchParams(init.body);assert.equal(body.get('redirect_uri'),protocol.GOOGLE_CALLBACK);assert.equal(body.get('client_secret'),config.clientSecret);assert.equal(body.get('grant_type'),'authorization_code');
    assert.equal(await protocol.pkceChallenge(body.get('code_verifier')),authorization.searchParams.get('code_challenge'));
    if(options.error)return Response.json({error:'private-provider-details'},{status:400});
    return Response.json({id_token:await token(authorization.searchParams.get('nonce'),subject,options.claims),access_token:'DO-NOT-PERSIST-access',refresh_token:'DO-NOT-PERSIST-refresh'});
  };
  return {request,fetcher,start,authorization};
}
try{
  const db=await mf.getD1Database('DB');globalThis.__accountDb=db;
  for(const file of ['0011_daily_quiz.sql','0012_quiz_image_crop.sql','0016_account_credit_foundation.sql','0017_assistant_admissions.sql'])for(const statement of (await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8')).split('--> statement-breakpoint').map(v=>v.trim()).filter(Boolean))await db.prepare(statement).run();
  const service=m[files[9]].creditService(db),balance=async owner=>(await db.prepare('SELECT balance FROM credit_wallets WHERE principal_id=?').bind(owner.principalId).first()).balance;
  const count=async table=>(await db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first()).n;
  const credit=(owner,amount,key='fixture')=>service.credit({owner,amount,idempotencyKey:key,kind:'reward'});
  const newGuest=async(amount=0)=>{const value=await guest.createGuest(db,guestSecret,now.getTime());if(amount)await credit(value.owner,amount);return value;};
  const first=await flow.startGoogleLogin(req('','https://holocron.kr/api/auth/google/start?returnTo=https://evil.example'),config,now),auth=new URL(first.location);
  assert.equal(auth.origin,'https://accounts.google.com');assert.equal(auth.searchParams.get('scope'),'openid');assert.equal(auth.searchParams.get('response_type'),'code');assert.equal(auth.searchParams.get('access_type'),'online');assert.equal(auth.searchParams.get('code_challenge_method'),'S256');
  assert.equal(auth.searchParams.get('state').length,43);assert.equal(auth.searchParams.get('nonce').length,43);assert.notEqual(auth.searchParams.get('state'),auth.searchParams.get('nonce'));
  for(const flag of ['__Host-','HttpOnly','Secure','SameSite=Lax','Path=/','Max-Age=600'])assert(first.setCookie.includes(flag));
  assert.equal(flow.safeReturnPath('/quiz'),'/quiz');for(const path of ['//evil.example','/\\evil.example','https://evil.example','/admin','/api/credit/visit','/quiz?next=evil','/%2f%2fevil'])assert.equal(flow.safeReturnPath(path),'/');
  await assert.rejects(flow.startGoogleLogin(req('','https://evil.example/api/auth/google/start'),config,now));
  await assert.rejects(flow.startGoogleLogin(req(),{},now));
  const goodToken=await token('nonce');assert.equal(await protocol.verifyGoogleIdToken(goodToken,config.clientId,'nonce',now,jwksFetch),'subject-one');
  for(const patch of [{iss:'https://evil.example'},{aud:'other'},{aud:[config.clientId]},{azp:'other'},{nonce:'wrong'},{exp:0},{iat:9999999999},{sub:''},{sub:'a'.repeat(256)}])await assert.rejects(protocol.verifyGoogleIdToken(await token('nonce','subject-one',patch),config.clientId,'nonce',now,jwksFetch));
  for(const bad of ['broken',goodToken.slice(0,-20)+'changed',await token('nonce','subject-one',{}, {alg:'none'}),await token('nonce','subject-one',{}, {kid:'unknown'})])await assert.rejects(protocol.verifyGoogleIdToken(bad,config.clientId,'nonce',now,jwksFetch));
  await assert.rejects(protocol.verifyGoogleIdToken(goodToken,config.clientId,'nonce',now,async()=>Response.json({keys:[]})));
  for(const response of [()=>Response.json({error:'private'},{status:429}),()=>Response.json({error:'private'},{status:500}),()=>new Response('not json',{headers:{'Content-Type':'application/json'}}),()=>new Response('html',{headers:{'Content-Type':'text/html'}}),()=>Response.json({keys:[jwk,jwk]}),()=>new Response('x'.repeat(65537),{headers:{'Content-Type':'application/json'}})])await assert.rejects(protocol.verifyGoogleIdToken(goodToken,config.clientId,'nonce',now,async()=>response()));
  for(const response of [()=>Response.json({error:'private'},{status:401}),()=>Response.json({error:'private'},{status:500}),()=>new Response('bad',{headers:{'Content-Type':'application/json'}}),()=>Response.json({access_token:'missing-id-token'})])await assert.rejects(protocol.exchangeGoogleCode('code','verifier','nonce',config,now,async()=>response()));
  const flowCase=await callback('flow-case');
  assert.equal((await flow.verifyGoogleCallback(flowCase.request,config,now,flowCase.fetcher)).returnPath,'/quiz');
  for(const modify of [u=>u.searchParams.set('state','wrong'),u=>u.searchParams.delete('code'),u=>u.searchParams.set('error','access_denied'),u=>u.searchParams.append('code','second'),u=>u.searchParams.set('iss','https://evil.example')]){
    const url=new URL(flowCase.request.url);modify(url);await assert.rejects(flow.verifyGoogleCallback(req(flowCase.request.headers.get('cookie'),url),config,now,()=>{throw new Error('must not call provider');}));
  }
  await assert.rejects(flow.verifyGoogleCallback(flowCase.request,config,new Date(now.getTime()+600000),flowCase.fetcher));
  await assert.rejects(flow.verifyGoogleCallback(req('',flowCase.request.url),config,now,flowCase.fetcher));
  const failed=await callback('failed','',{error:true});await assert.rejects(login.completeGoogleLogin(failed.request,db,config,guestSecret,now,failed.fetcher));assert.equal(await count('users'),0);
  const invalid=await callback('failed','',{claims:{nonce:'wrong'}});await assert.rejects(login.completeGoogleLogin(invalid.request,db,config,guestSecret,now,invalid.fetcher));assert.equal(await count('users'),0);
  const accounts=await Promise.all(Array.from({length:20},()=>identity.ensureGoogleAccount(db,'same-subject',now)));
  assert.equal(new Set(accounts.map(a=>a.userId)).size,1);assert.equal(await count('users'),1);assert.equal(await count('auth_accounts'),1);assert.equal(await count('credit_principals'),1);assert.equal(await count('credit_wallets'),1);assert.equal(await balance(accounts[0].owner),0);assert.notEqual(accounts[0].userId,'same-subject');
  // Mandatory end-to-end phone/PC: real OAuth signature verification, account resolution, atomic migration and issued sessions.
  const phone=await newGuest(5),pc=await newGuest(5),phoneFlow=await callback('phone-pc',pair(phone.setCookie)),pcFlow=await callback('phone-pc',pair(pc.setCookie));
  const logins=await Promise.all([phoneFlow,pcFlow].map(f=>login.completeGoogleLogin(f.request,db,config,guestSecret,now,f.fetcher)));
  const resolved=await Promise.all(logins.map(r=>session.resolveAccountSession(req(r.cookies.map(pair).join('; ')),db,config.sessionSecret,now.getTime())));
  assert.equal(resolved[0].userId,resolved[1].userId);const owner=resolved[0].owner;assert.equal(await balance(owner),8);
  const rows=(await db.prepare('SELECT * FROM credit_ledger WHERE wallet_id=?').bind(owner.principalId).all()).results;
  assert.equal(rows.filter(r=>r.idempotency_key===migration.MIGRATION_KEY).length,1);assert.equal(rows.filter(r=>r.idempotency_key===migration.FIRST_LOGIN_KEY).length,1);
  const guests=await Promise.all([phone,pc].map(g=>db.prepare('SELECT w.balance,p.retired_at FROM credit_wallets w JOIN credit_principals p ON p.id=w.principal_id WHERE p.id=?').bind(g.owner.principalId).first()));
  assert.deepEqual(guests.map(g=>g.balance).sort(),[0,5]);assert.equal(guests.filter(g=>g.retired_at).length,1);
  const notices=await Promise.all(logins.map(r=>m['lib/identity/login-notice.ts'].readLoginNotice(req(r.cookies.map(pair).join('; ')),config.sessionSecret,now.getTime())));
  assert.deepEqual(notices.map(n=>n.status).sort(),['already_migrated','migrated']);assert.equal(notices.find(n=>n.status==='already_migrated').guestBalance,5);assert.equal(notices.reduce((s,n)=>s+n.firstLogin,0),3);
  const loser=guests[0].balance===5?phone:pc,winner=guests[0].balance===0?phone:pc;
  assert.equal(logins.filter(r=>r.cookies.some(c=>c.startsWith('__Host-holocron_guest=;'))).length,1);
  const again=await migration.applyAccountLogin(db,owner,loser.owner,now);assert.equal(again.balance,8);assert.equal(again.notice.status,'already_migrated');assert.equal(again.notice.guestBalance,5);assert.equal(await balance(loser.owner),5);
  assert.equal((await migration.applyAccountLogin(db,owner,winner.owner,now)).balance,8);
  const fresh=await identity.ensureGoogleAccount(db,'zero-guest',now),zero=await newGuest();assert.equal((await migration.applyAccountLogin(db,fresh.owner,zero.owner,now)).balance,3);assert.equal((await migration.applyAccountLogin(db,fresh.owner,loser.owner,now)).balance,3);
  const noGuest=await identity.ensureGoogleAccount(db,'no-guest',now);assert.equal((await migration.applyAccountLogin(db,noGuest.owner,null,now)).balance,3);assert.equal((await migration.applyAccountLogin(db,noGuest.owner,loser.owner,now)).balance,3);
  const repeatLogins=await Promise.all(Array.from({length:15},()=>migration.applyAccountLogin(db,noGuest.owner,null,now)));assert(repeatLogins.every(r=>r.balance===3&&r.notice.firstLogin===0));
  const rich=await identity.ensureGoogleAccount(db,'rich',now),ten=await newGuest(10);assert.equal((await migration.applyAccountLogin(db,rich.owner,ten.owner,now)).balance,13);await credit(rich.owner,100,'uncapped');assert.equal(await balance(rich.owner),113);
  // Any failed/ignored outgoing or retirement step rolls the whole login transaction back.
  for(const [name,sql] of [['outgoing',"BEFORE INSERT ON credit_ledger WHEN NEW.idempotency_key='guest_migration_out_v1' BEGIN SELECT RAISE(ABORT,'test'); END"],['ignored',"BEFORE INSERT ON credit_ledger WHEN NEW.idempotency_key='guest_migration_out_v1' BEGIN SELECT RAISE(IGNORE); END"],['retirement',"BEFORE UPDATE ON credit_principals WHEN NEW.retired_at IS NOT NULL BEGIN SELECT RAISE(IGNORE); END"],['firstreward',"BEFORE INSERT ON credit_ledger WHEN NEW.idempotency_key='account_first_login_v1' BEGIN SELECT RAISE(ABORT,'test'); END"]]){
    const a=await identity.ensureGoogleAccount(db,'failure-'+name,now),g=await newGuest(5);await db.prepare('CREATE TRIGGER test_failure '+sql).run();
    try{await assert.rejects(migration.applyAccountLogin(db,a.owner,g.owner,now));assert.equal(await balance(a.owner),0);assert.equal(await balance(g.owner),5);assert.equal((await db.prepare('SELECT retired_at FROM credit_principals WHERE id=?').bind(g.owner.principalId).first()).retired_at,null);}finally{await db.prepare('DROP TRIGGER test_failure').run();}
    assert.equal((await migration.applyAccountLogin(db,a.owner,g.owner,now)).balance,8);
  }
  const ambiguous=await identity.ensureGoogleAccount(db,'ambiguous',now),ambGuest=await newGuest(5);
  const lost={prepare:db.prepare.bind(db),batch:async statements=>{await db.batch(statements);throw new Error('lost response');}};
  await assert.rejects(migration.applyAccountLogin(lost,ambiguous.owner,ambGuest.owner,now));assert.equal((await migration.applyAccountLogin(db,ambiguous.owner,ambGuest.owner,now)).balance,8);
  const racing=await identity.ensureGoogleAccount(db,'guest-activity',now),activityGuest=await newGuest(5);
  const activity=await Promise.allSettled([credit(activityGuest.owner,2,'simultaneous'),migration.applyAccountLogin(db,racing.owner,activityGuest.owner,now)]);
  assert.equal(activity[1].status,'fulfilled');assert.equal(await balance(racing.owner),activity[0].status==='fulfilled'?10:8);assert.equal(await balance(activityGuest.owner),0);
  const overflow=await identity.ensureGoogleAccount(db,'overflow',now),overflowGuest=await newGuest(5);
  await credit(overflow.owner,Number.MAX_SAFE_INTEGER,'maximum');await assert.rejects(migration.applyAccountLogin(db,overflow.owner,overflowGuest.owner,now));assert.equal(await balance(overflowGuest.owner),5);assert.equal(await balance(overflow.owner),Number.MAX_SAFE_INTEGER);
  const sameGuest=await newGuest(5),twoAccounts=await Promise.all(['two-a','two-b'].map(s=>identity.ensureGoogleAccount(db,s,now)));
  const two=await Promise.allSettled(twoAccounts.map(a=>migration.applyAccountLogin(db,a.owner,sameGuest.owner,now)));assert.equal(two.filter(r=>r.status==='fulfilled').length,1);assert.equal((await Promise.all(twoAccounts.map(a=>balance(a.owner)))).reduce((a,b)=>a+b),8);
  // Real signed sessions: validation, D1 resolution, strict owner preference, independent admin identity.
  const sessionCookie=await session.issueAccountSession(resolved[0].userId,config.sessionSecret,now.getTime());
  const both=req(pair(sessionCookie)+'; '+pair(loser.setCookie));
  assert.deepEqual(await current.resolveCurrentCreditOwner(both,db,{account:config.sessionSecret,guest:guestSecret},now.getTime()),owner);
  assert.deepEqual(await current.resolveCurrentCreditOwner(req(pair(loser.setCookie)),db,{account:config.sessionSecret,guest:guestSecret},now.getTime()),loser.owner);
  assert.equal(await session.resolveAccountSession(req('holocron_admin_session=anything'),db,config.sessionSecret,now.getTime()),null);
  assert.equal(await m['lib/admin/session-crypto.ts'].verifyAdminSessionToken(pair(sessionCookie).split('=')[1],config.sessionSecret,now.getTime()),null);
  for(const c of [pair(sessionCookie).slice(0,-15)+'changed',session.ACCOUNT_COOKIE+'=broken',pair(sessionCookie)+'; '+pair(sessionCookie)])await assert.rejects(session.resolveAccountSession(req(c),db,config.sessionSecret,now.getTime()));
  await assert.rejects(session.resolveAccountSession(req(pair(sessionCookie)),db,'wrong-secret-at-least-thirty-two-bytes',now.getTime()));
  await assert.rejects(session.resolveAccountSession(req(pair(sessionCookie)),db,undefined,now.getTime()));
  await assert.rejects(session.resolveAccountSession(req(pair(sessionCookie)),db,config.sessionSecret,now.getTime()+session.ACCOUNT_LIFETIME*1000));
  await assert.rejects(session.resolveAccountSession(req(pair(await session.issueAccountSession('nonexistent',config.sessionSecret,now.getTime()))),db,config.sessionSecret,now.getTime()));
  const tokenParts=pair(sessionCookie).split('=')[1].split('.'),payload=JSON.parse(Buffer.from(tokenParts[0],'base64url'));payload.uid='changed';await assert.rejects(session.resolveAccountSession(req(session.ACCOUNT_COOKIE+'='+enc(payload)+'.'+tokenParts[1]),db,config.sessionSecret,now.getTime()));
  await assert.rejects(current.resolveCurrentCreditOwner(req(session.ACCOUNT_COOKIE+'=bad; '+pair(loser.setCookie)),db,{account:config.sessionSecret,guest:guestSecret},now.getTime()));
  const startResponse=await m['app/api/auth/google/start/route.ts'].GET(req('','https://holocron.kr/api/auth/google/start'));
  assert.equal(startResponse.status,303);assert(startResponse.headers.get('location').startsWith(protocol.GOOGLE_AUTH));assert.equal(startResponse.headers.get('referrer-policy'),'no-referrer');assert(startResponse.headers.get('cache-control').includes('no-store'));
  const diagnosticLogs=[],originalWarn=console.warn;
  console.warn=(...values)=>diagnosticLogs.push(values);
  const beforeBad=await count('users'),badCallback=await m['app/api/auth/google/callback/route.ts'].GET(req('',protocol.GOOGLE_CALLBACK+'?code=private-code&state=bad'));
  console.warn=originalWarn;
  assert.deepEqual(diagnosticLogs,[['google_callback_failed','oauth_cookie_missing']]);
  const diagnostic=await callback('diagnostic');
  await assert.rejects(flow.verifyGoogleCallback(req('',protocol.GOOGLE_CALLBACK),config,now),e=>e.stage==='oauth_cookie_missing');
  await assert.rejects(flow.verifyGoogleCallback(req('','https://invalid.example/api/auth/google/callback'),config,now),e=>e.stage==='callback_target');
  await assert.rejects(flow.verifyGoogleCallback(diagnostic.request,config,new Date(now.getTime()+600000)),e=>e.stage==='oauth_cookie_invalid');
  await assert.rejects(flow.verifyGoogleCallback(req(pair(diagnostic.start.setCookie),protocol.GOOGLE_CALLBACK+'?code=private-code&state=bad'),config,now),e=>e.stage==='oauth_parameters');
  await assert.rejects(flow.verifyGoogleCallback(diagnostic.request,config,now,async()=>{throw new Error('SECRET-provider-response')}),e=>e.stage==='token_transport'&&!e.message.includes('SECRET'));
  for(const error of ['invalid_client','invalid_grant','invalid_request','unauthorized_client','PRIVATE-UNKNOWN']){
    await assert.rejects(flow.verifyGoogleCallback(diagnostic.request,config,now,async()=>Response.json({error,error_description:'PRIVATE-DETAILS',access_token:'PRIVATE-TOKEN'},{status:400})),e=>e.stage===(error.startsWith('PRIVATE')?'token_response':'token_'+error)&&!JSON.stringify(e).includes('PRIVATE'));
  }
  assert.equal(badCallback.status,303);assert.equal(badCallback.headers.get('location'),'/?login=failed');assert(![...badCallback.headers].flat().join(' ').includes('private-code'));assert.equal(await count('users'),beforeBad);assert(badCallback.headers.get('set-cookie').includes('Max-Age=0'));
  const logout=m['app/api/auth/logout/route.ts'];const response=await logout.POST(new Request('https://holocron.kr/api/auth/logout',{method:'POST',headers:{Origin:'https://holocron.kr','Content-Type':'application/json',Cookie:pair(sessionCookie)},body:'{}'}));
  assert.equal(response.status,200);assert(response.headers.get('set-cookie').includes(session.ACCOUNT_COOKIE+'=;'));assert(!response.headers.get('set-cookie').includes('__Host-holocron_guest'));assert.equal(await balance(owner),8);
  assert.equal((await logout.POST(new Request('https://holocron.kr/api/auth/logout',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}))).status,403);
  // Migrated attendance union continues across week, and duplicate Quiz keys remain consumed on either principal.
  const continuity=await newGuest(),account=await identity.ensureGoogleAccount(db,'continuity',now);
  for(let day=0;day<3;day++)await rewards.claimVisitRewards(db,continuity.owner,new Date(now.getTime()+day*86400000));
  const day3=new Date(now.getTime()+2*86400000);await migration.applyAccountLogin(db,account.owner,continuity.owner,day3);
  const state=await rewards.claimVisitRewards(db,account.owner,day3);assert.equal(state.balance,8);assert.equal(state.ownerType,'account');assert.equal(state.cap,null);assert.equal(state.attendance.streak,3);assert.equal(state.rewards.length,0);
  for(let day=3;day<7;day++){const result=await rewards.claimVisitRewards(db,account.owner,new Date(now.getTime()+day*86400000));assert.equal(result.attendance.streak,day+1);assert.equal(result.rewards.length,1);assert.equal(result.rewards[0].requested,day===6?5:1);}
  assert.equal(await balance(account.owner),16);assert.equal((await rewards.claimVisitRewards(db,account.owner,new Date(now.getTime()+7*86400000))).attendance.streak,1);
  const accountLedger=(await db.prepare('SELECT idempotency_key FROM credit_ledger WHERE wallet_id=?').bind(account.owner.principalId).all()).results;assert(!accountLedger.some(r=>r.idempotency_key==='guest_first_visit_v1'||r.idempotency_key==='opening_first_visit_v1'));
  async function createQuiz(id){await db.prepare("INSERT INTO quizzes(id,title,question,explanation,status,created_at,updated_at) VALUES (?, 'title','question','explanation','published',?,?)").bind(id,now.toISOString(),now.toISOString()).run();for(let i=0;i<2;i++)await db.prepare('INSERT INTO quiz_options(id,quiz_id,label,position,is_correct) VALUES (?,?,?,?,?)').bind(id+'-'+i,id,'answer',i,i).run();}
  for(const correct of [0,1]){
    const id='migrated-quiz-'+correct;await createQuiz(id);const g=await newGuest(),a=await identity.ensureGoogleAccount(db,id,now);
    await quiz.insertRewardedQuizResponse(db,id,'original-'+id,id+'-'+correct,g.owner,now);await migration.applyAccountLogin(db,a.owner,g.owner,now);
    const before=await balance(a.owner),result=await quiz.insertRewardedQuizResponse(db,id,'new-browser-'+id,id+'-1',a.owner,now);
    assert.equal(await balance(a.owner),before);assert.equal(result.credit.newlyApplied,false);assert.equal(result.credit.requested,correct?3:0);
  }
  await createQuiz('account-quiz');const votes=await Promise.all(Array.from({length:10},()=>quiz.insertRewardedQuizResponse(db,'account-quiz','same-response','account-quiz-1',rich.owner,now)));
  assert.equal(votes.filter(v=>v.credit.newlyApplied).length,1);assert.equal(await balance(rich.owner),116);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM quiz_responses WHERE quiz_id='account-quiz'").first()).n,1);
  // Logged-in actual visit route writes only Account rewards and returns no raw identity/provider data.
  const liveSession=await session.issueAccountSession(resolved[0].userId,config.sessionSecret);
  const visit=await m['app/api/credit/visit/route.ts'].POST(new Request('https://holocron.kr/api/credit/visit',{method:'POST',headers:{Origin:'https://holocron.kr','Content-Type':'application/json',Cookie:pair(liveSession)+'; '+pair(loser.setCookie)},body:'{}'}));
  assert.equal(visit.status,200);const data=await visit.json();assert.equal(data.ownerType,'account');assert.equal(data.cap,null);assert.equal(await balance(loser.owner),5);assert(!JSON.stringify(data).includes(owner.principalId));assert(!JSON.stringify(data).includes(resolved[0].userId));assert(!JSON.stringify(data).includes('phone-pc'));
  // Existing v4 validator/plan accepts actual migration/account ledger rows; exact old-version suite runs separately.
  const format=m['lib/backup/format.ts'],tables=Object.fromEntries(format.BACKUP_TABLES.map(name=>[name,[]]));
  await identity.ensureGoogleAccount(db,'s'.repeat(255),now);
  for(const name of [...format.CREDIT_BACKUP_TABLES,'quizzes','quiz_options','quiz_responses'])tables[name]=(await db.prepare('SELECT * FROM '+name).all()).results;
  const backup={format:format.BACKUP_FORMAT,version:4,application:'HOLOCRON',createdAt:now.toISOString(),schema:{latestMigration:format.BACKUP_V4_MIGRATION},consistency:'d1-read-batch',tables,counts:Object.fromEntries(Object.entries(tables).map(([name,rows])=>[name,rows.length]))};
  assert.equal(m['lib/backup/validator.ts'].validateBackup(backup).version,4);
  assert.equal(m['lib/backup/restore-plan.ts'].buildRestorePlan(backup).counts.credit_ledger,tables.credit_ledger.length);
  for(const name of ['account_session','oauth_state','nonce','pkce_verifier','google_client_secret','access_token','refresh_token','id_token']){
    const invalid=structuredClone(backup);invalid.tables.auth_accounts[0][name]='forbidden';await assert.rejects(async()=>m['lib/backup/validator.ts'].validateBackup(invalid));
  }
  const durable=['users','auth_accounts','credit_principals','credit_wallets','credit_ledger'];
  const stored=JSON.stringify(await Promise.all(durable.map(t=>db.prepare('SELECT * FROM '+t).all())));
  for(const forbidden of ['DO-NOT-PERSIST','local-google-secret','local-account-session','__Host-holocron','code_verifier','nonce','email'])assert(!stored.includes(forbidden));
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM auth_accounts WHERE provider<>'google'").first()).n,0);
  console.log(`Google Account: ${assertions} assertions passed (real local D1 + RS256 protocol, mandatory phone/PC final 8 CR, losing Guest 5 CR; live Google/browser NOT TESTED)`);
}finally{await mf.dispose();await loaded.dispose();delete globalThis.__accountDb;delete globalThis.__accountEnv;}
