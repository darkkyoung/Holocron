import {cookie,readCookie,randomToken,signCookie,verifyCookie} from '../signed-cookie';
import {IdentityError} from '../guest-crypto';
import {GOOGLE_AUTH,GOOGLE_CALLBACK,pkceChallenge,validateGoogleConfig,exchangeGoogleCode,type GoogleConfig} from './protocol';
export const OAUTH_COOKIE='__Host-holocron_oauth';
export const OAUTH_LIFETIME=600;
const paths=new Set(['/','/works','/quiz','/roadmap','/assistant','/credits']);
export const safeReturnPath=(value:unknown)=>typeof value==='string'&&paths.has(value)?value:'/';
export async function startGoogleLogin(request:Request,config:GoogleConfig,now=new Date()){
  const valid=validateGoogleConfig(config),url=new URL(request.url);
  if(url.origin!==new URL(GOOGLE_CALLBACK).origin)throw new IdentityError('CONFIGURATION');
  const state=randomToken(),nonce=randomToken(),verifier=randomToken(),returnPath=safeReturnPath(url.searchParams.get('returnTo'));
  const token=await signCookie({state,nonce,verifier,returnPath},'google-oauth:v1',valid.sessionSecret,OAUTH_LIFETIME,now.getTime());
  const target=new URL(GOOGLE_AUTH);
  target.search=new URLSearchParams({client_id:valid.clientId,response_type:'code',scope:'openid',redirect_uri:GOOGLE_CALLBACK,state,nonce,code_challenge:await pkceChallenge(verifier),code_challenge_method:'S256',access_type:'online',prompt:'select_account'}).toString();
  return {location:target.toString(),setCookie:cookie(OAUTH_COOKIE,token,OAUTH_LIFETIME)};
}
export async function verifyGoogleCallback(request:Request,config:GoogleConfig,now=new Date(),fetcher:typeof fetch=fetch){
  validateGoogleConfig(config);
  const url=new URL(request.url);
  if(url.origin+url.pathname!==GOOGLE_CALLBACK)throw new IdentityError('INVALID_IDENTITY');
  const flow=await verifyCookie(readCookie(request,OAUTH_COOKIE),'google-oauth:v1',config.sessionSecret,OAUTH_LIFETIME,now.getTime());
  if(['state','code','error','iss'].some(key=>url.searchParams.getAll(key).length>1)||typeof flow.state!=='string'||url.searchParams.get('state')!==flow.state
    ||typeof flow.nonce!=='string'||typeof flow.verifier!=='string'||! /^[A-Za-z0-9_-]{43}$/.test(flow.verifier)
    ||(url.searchParams.has('iss')&&url.searchParams.get('iss')!=='https://accounts.google.com'))throw new IdentityError('INVALID_IDENTITY');
  if(url.searchParams.has('error'))throw new IdentityError('INVALID_IDENTITY');
  const code=url.searchParams.get('code');if(!code||code.length>4096||/[\x00-\x20\x7f]/.test(code))throw new IdentityError('INVALID_IDENTITY');
  const subject=await exchangeGoogleCode(code,flow.verifier,flow.nonce,config,now,fetcher);
  return {subject,returnPath:safeReturnPath(flow.returnPath)};
}
export const clearOAuthCookie=()=>cookie(OAUTH_COOKIE,'',0);
