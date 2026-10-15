import {verifyGoogleCallback} from './flow';
import type {GoogleConfig} from './protocol';
import {ensureGoogleAccount,findLoginGuest} from '../repository';
import {readGuestCookie,verifyGuestToken,IdentityError,GUEST_COOKIE} from '../guest-crypto';
import {cookie} from '../signed-cookie';
import {applyAccountLogin} from '../../credit/account-login';
import {issueAccountSession} from '../account-session';
import {issueLoginNotice} from '../login-notice';
export async function completeGoogleLogin(request:Request,database:D1Database,config:GoogleConfig,guestSecret:string|undefined,now=new Date(),fetcher:typeof fetch=fetch){
  const verified=await verifyGoogleCallback(request,config,now,fetcher);
  const guestToken=readGuestCookie(request);
  let guest:null|{principalId:string}=null,retired=false;
  if(guestToken!==undefined){
    const identity=await verifyGuestToken(guestToken,guestSecret,now.getTime());
    if(!identity)throw new IdentityError('INVALID_IDENTITY');
    const row=await findLoginGuest(database,identity.guestKeyHash);
    if(!row)throw new IdentityError('INVALID_IDENTITY');
    retired=!!row.retired;guest=retired?null:{principalId:row.id};
  }
  const account=await ensureGoogleAccount(database,verified.subject,now);
  const result=await applyAccountLogin(database,account.owner,guest,now);
  const cookies=[await issueAccountSession(account.userId,config.sessionSecret,now.getTime()),await issueLoginNotice(result.notice,config.sessionSecret,now.getTime())];
  if(result.clearGuest||retired)cookies.push(cookie(GUEST_COOKIE,'',0));
  return {location:verified.returnPath,cookies};
}
