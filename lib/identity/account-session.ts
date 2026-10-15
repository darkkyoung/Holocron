import {cookie,readCookie,signCookie,verifyCookie} from './signed-cookie';
import {IdentityError} from './guest-crypto';
import {findAccountOwner} from './repository';
export const ACCOUNT_COOKIE='__Host-holocron_account';
export const ACCOUNT_LIFETIME=30*24*60*60;
export async function issueAccountSession(userId:string,secret:string|undefined,now=Date.now()){
  return cookie(ACCOUNT_COOKIE,await signCookie({uid:userId},'account-session:v1',secret,ACCOUNT_LIFETIME,now),ACCOUNT_LIFETIME);
}
export async function resolveAccountSession(request:Request,database:D1Database,secret:string|undefined,now=Date.now()){
  const token=readCookie(request,ACCOUNT_COOKIE);if(token===undefined)return null;
  const claims=await verifyCookie(token,'account-session:v1',secret,ACCOUNT_LIFETIME,now);
  if(typeof claims.uid!=='string'||!/^[-a-zA-Z0-9]{1,200}$/.test(claims.uid)||Object.keys(claims).sort().join(',')!=='exp,iat,uid,v')throw new IdentityError('INVALID_IDENTITY');
  const account=await findAccountOwner(database,claims.uid);
  if(!account)throw new IdentityError('INVALID_IDENTITY');
  return account;
}
export const clearAccountSession=()=>cookie(ACCOUNT_COOKIE,'',0);
