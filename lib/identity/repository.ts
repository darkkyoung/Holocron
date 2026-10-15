import type {CreditOwner} from '../credit/types';
import {boundedIdentifier} from '../credit/policy';
import {IdentityError} from './guest-crypto';

type Principal={id:string;retiredAt:string|null};
const principalSelect='SELECT id,retired_at AS retiredAt FROM credit_principals';
function validateId(id:string){if(!boundedIdentifier(id))throw new IdentityError('INVALID_INPUT');}
async function batch(database:D1Database,statements:D1PreparedStatement[]){
  try{const results=await database.batch(statements);if(results.some(result=>!result.success))throw new Error();return results;}
  catch{throw new IdentityError('UNAVAILABLE');}
}
async function ensurePrincipal(database:D1Database,type:'guest'|'account',key:string,now:Date):Promise<CreditOwner>{
  const id=crypto.randomUUID(),time=now.toISOString(),column=type==='guest'?'guest_key_hash':'user_id';
  const results=await batch(database,[
    database.prepare(`INSERT INTO credit_principals (id,type,guest_key_hash,user_id,created_at) VALUES (?,?,?,?,?) ON CONFLICT(${column}) DO NOTHING`).bind(id,type,type==='guest'?key:null,type==='account'?key:null,time),
    database.prepare(`INSERT INTO credit_wallets (principal_id,created_at,updated_at) SELECT id,?,? FROM credit_principals WHERE ${column}=? AND retired_at IS NULL ON CONFLICT(principal_id) DO NOTHING`).bind(time,time,key),
    database.prepare(`${principalSelect} WHERE ${column}=?`).bind(key),
  ]);
  const principal=results[2]?.results[0] as Principal|undefined;
  if(!principal||principal.retiredAt)throw new IdentityError('INVALID_IDENTITY');
  return {principalId:principal.id};
}
export async function ensureGuestWallet(database:D1Database,guestKeyHash:string,now=new Date()){
  if(!/^[a-f0-9]{64}$/.test(guestKeyHash))throw new IdentityError('INVALID_INPUT');
  return ensurePrincipal(database,'guest',guestKeyHash,now);
}
export async function ensureAccountWallet(database:D1Database,userId:string,now=new Date()){
  validateId(userId);return ensurePrincipal(database,'account',userId,now);
}
export async function findGuestOwner(database:D1Database,guestKeyHash:string):Promise<CreditOwner|null>{
  if(!/^[a-f0-9]{64}$/.test(guestKeyHash))throw new IdentityError('INVALID_INPUT');
  try{
    const principal=await database.prepare(`${principalSelect} WHERE guest_key_hash=? AND retired_at IS NULL`).bind(guestKeyHash).first<Principal>();
    return principal?{principalId:principal.id}:null;
  }catch{throw new IdentityError('UNAVAILABLE');}
}
export async function createAccount(database:D1Database,now=new Date()){
  const userId=crypto.randomUUID(),id=crypto.randomUUID(),time=now.toISOString();
  await batch(database,[database.prepare('INSERT INTO users(id,created_at) VALUES (?,?)').bind(userId,time),
    database.prepare("INSERT INTO credit_principals(id,type,user_id,created_at) VALUES (?,'account',?,?)").bind(id,userId,time),
    database.prepare('INSERT INTO credit_wallets(principal_id,created_at,updated_at) VALUES (?,?,?)').bind(id,time,time)]);
  return {userId,owner:{principalId:id}};
}
function providerInput(provider:string,subject:string){
  if(!/^[a-z][a-z0-9_-]{0,31}$/.test(provider)||!boundedIdentifier(subject,255))throw new IdentityError('INVALID_INPUT');
}
export async function findProviderAccount(database:D1Database,provider:string,subject:string){
  providerInput(provider,subject);
  try{return await database.prepare('SELECT user_id AS userId FROM auth_accounts WHERE provider=? AND provider_subject=?').bind(provider,subject).first<{userId:string}>();}
  catch{throw new IdentityError('UNAVAILABLE');}
}
export async function attachProviderAccount(database:D1Database,userId:string,provider:string,subject:string,now=new Date()){
  validateId(userId);providerInput(provider,subject);
  const results=await batch(database,[database.prepare('INSERT INTO auth_accounts(provider,provider_subject,user_id,created_at) VALUES (?,?,?,?) ON CONFLICT(provider,provider_subject) DO NOTHING').bind(provider,subject,userId,now.toISOString()),
    database.prepare('SELECT user_id AS userId FROM auth_accounts WHERE provider=? AND provider_subject=?').bind(provider,subject)]);
  if((results[1]?.results[0] as {userId:string}|undefined)?.userId!==userId)throw new IdentityError('PROVIDER_CONFLICT');
  return {userId};
}

export async function findAccountOwner(database:D1Database,userId:string){
  validateId(userId);
  try{
    const row=await database.prepare(`SELECT u.id AS userId,p.id FROM users u JOIN credit_principals p ON p.user_id=u.id JOIN credit_wallets w ON w.principal_id=p.id WHERE u.id=? AND p.type='account' AND p.retired_at IS NULL`).bind(userId).first<{userId:string;id:string}>();
    return row?{userId:row.userId,owner:{principalId:row.id}}:null;
  }catch{throw new IdentityError('UNAVAILABLE');}
}
/** The subject's unique provider row chooses the user within one D1 transaction, including concurrent first login. */
export async function ensureGoogleAccount(database:D1Database,subject:string,now=new Date()){
  if(!/^[\x21-\x7e]{1,255}$/.test(subject))throw new IdentityError('INVALID_INPUT');
  const userId=crypto.randomUUID(),principal=crypto.randomUUID(),time=now.toISOString();
  const results=await batch(database,[
    database.prepare(`INSERT INTO users(id,created_at) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM auth_accounts WHERE provider='google' AND provider_subject=?)`).bind(userId,time,subject),
    database.prepare(`INSERT INTO auth_accounts(provider,provider_subject,user_id,created_at) SELECT 'google',?,?,? WHERE EXISTS (SELECT 1 FROM users WHERE id=?) ON CONFLICT(provider,provider_subject) DO NOTHING`).bind(subject,userId,time,userId),
    database.prepare(`INSERT INTO credit_principals(id,type,user_id,created_at) SELECT ?,'account',user_id,? FROM auth_accounts WHERE provider='google' AND provider_subject=? ON CONFLICT(user_id) DO NOTHING`).bind(principal,time,subject),
    database.prepare(`INSERT INTO credit_wallets(principal_id,created_at,updated_at) SELECT p.id,?,? FROM credit_principals p JOIN auth_accounts a ON a.user_id=p.user_id WHERE a.provider='google' AND a.provider_subject=? AND p.retired_at IS NULL ON CONFLICT(principal_id) DO NOTHING`).bind(time,time,subject),
    database.prepare(`SELECT a.user_id AS userId,p.id FROM auth_accounts a JOIN credit_principals p ON p.user_id=a.user_id JOIN credit_wallets w ON w.principal_id=p.id WHERE a.provider='google' AND a.provider_subject=? AND p.type='account' AND p.retired_at IS NULL`).bind(subject),
  ]);
  const row=results[4].results[0] as {userId:string;id:string}|undefined;
  if(!row)throw new IdentityError('INVALID_IDENTITY');
  return {userId:row.userId,owner:{principalId:row.id}};
}

export async function findLoginGuest(database:D1Database,guestKeyHash:string){
  if(!/^[a-f0-9]{64}$/.test(guestKeyHash))throw new IdentityError('INVALID_INPUT');
  try{return await database.prepare("SELECT id,retired_at AS retired FROM credit_principals WHERE guest_key_hash=? AND type='guest'").bind(guestKeyHash).first<{id:string;retired:string|null}>();}
  catch{throw new IdentityError('UNAVAILABLE');}
}
