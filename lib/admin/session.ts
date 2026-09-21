import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {env} from 'cloudflare:workers';
import {verifyAdminCredentials} from './credentials';
import {createAdminSessionToken,verifyAdminSessionToken,type AdminSessionClaims} from './session-crypto';

export const ADMIN_SESSION_COOKIE='holocron_admin_session';
const SESSION_MAX_AGE=60*60*12;

function settings(){
  const values=env as unknown as Record<string,string|undefined>;
  return {username:values.HOLOCRON_ADMIN_USERNAME,password:values.HOLOCRON_ADMIN_PASSWORD,secret:values.HOLOCRON_ADMIN_SESSION_SECRET};
}

export async function authenticateAdmin(username:string,password:string){
  const values=settings();
  return verifyAdminCredentials(username,password,values.username,values.password);
}

export async function getAdminSession():Promise<AdminSessionClaims|null>{
  const token=(await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token,settings().secret);
}

export async function requireAdminSession(){
  const session=await getAdminSession();
  if(!session)redirect('/admin/login');
  return session;
}

export async function setAdminSession(){
  const secret=settings().secret;
  if(!secret)return false;
  const token=await createAdminSessionToken(secret);
  if(!token)return false;
  (await cookies()).set(ADMIN_SESSION_COOKIE,token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:SESSION_MAX_AGE});
  return true;
}

export async function clearAdminSession(){
  (await cookies()).set(ADMIN_SESSION_COOKIE,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:0,expires:new Date(0)});
}
