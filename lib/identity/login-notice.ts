import type {LoginNotice} from '../credit/account-login';
import {cookie,readCookie,signCookie,verifyCookie} from './signed-cookie';
export const NOTICE_COOKIE='__Host-holocron_login_notice';
export async function issueLoginNotice(notice:LoginNotice,secret:string|undefined,now=Date.now()){
  return cookie(NOTICE_COOKIE,await signCookie(notice,'login-notice:v1',secret,600,now),600);
}
export async function readLoginNotice(request:Request,secret:string|undefined,now=Date.now()):Promise<LoginNotice|null>{
  const token=readCookie(request,NOTICE_COOKIE);if(!token)return null;
  try{
    const data=await verifyCookie(token,'login-notice:v1',secret,600,now);
    if(!['migrated','already_migrated','no_guest'].includes(String(data.status))||![data.migrated,data.guestBalance,data.firstLogin].every(v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0&&v<=10))return null;
    return {status:data.status as LoginNotice['status'],migrated:data.migrated as number,guestBalance:data.guestBalance as number,firstLogin:data.firstLogin as number};
  }catch{return null;}
}
export const clearLoginNotice=()=>cookie(NOTICE_COOKIE,'',0);
