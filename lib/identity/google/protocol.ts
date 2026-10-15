import {IdentityError} from '../guest-crypto';
import {decode,encode} from '../signed-cookie';
export class GoogleProtocolError extends IdentityError {
  constructor(public readonly stage:'token_transport'|'token_response'|'token_invalid_client'|'token_invalid_grant'|'token_invalid_request'|'token_unauthorized_client'|'id_token_verification'){super('INVALID_IDENTITY');}
}
// Google discovery + official OIDC reference checked 2026-10-15. Fixed first-party URLs; no token-provided jku/x5u.
export const GOOGLE_AUTH='https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN='https://oauth2.googleapis.com/token';
export const GOOGLE_JWKS='https://www.googleapis.com/oauth2/v3/certs';
export const GOOGLE_CALLBACK='https://holocron.kr/api/auth/google/callback';
export type GoogleConfig={clientId?:string;clientSecret?:string;sessionSecret?:string};
export function validateGoogleConfig(config:GoogleConfig){
  if(!config.clientId||!config.clientSecret||!config.sessionSecret||new TextEncoder().encode(config.sessionSecret).length<32)throw new IdentityError('CONFIGURATION');
  return {clientId:config.clientId,clientSecret:config.clientSecret,sessionSecret:config.sessionSecret};
}
export const pkceChallenge=async(verifier:string)=>encode(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
async function boundedJson(url:string,init:RequestInit,fetcher:typeof fetch){
  let response:Response;
  try{response=await fetcher(url,{...init,redirect:'manual',signal:AbortSignal.timeout(10000)});}catch{throw new GoogleProtocolError('token_transport');}
  // Workers supports manual/follow only. Never follow a redirect carrying OAuth credentials.
  if(response.status>=300&&response.status<400)throw new GoogleProtocolError('token_response');
  if(!/^application\/json(?:;|$)/i.test(response.headers.get('content-type')??''))throw new Error();
  const reader=response.body?.getReader();if(!reader)throw new Error();
  let size=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();throw new Error();}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();const data=JSON.parse(text);
    if(!response.ok){
      if(url===GOOGLE_TOKEN){
        const known={invalid_client:'token_invalid_client',invalid_grant:'token_invalid_grant',invalid_request:'token_invalid_request',unauthorized_client:'token_unauthorized_client'} as const;
        const reason=typeof data?.error==='string'&&Object.hasOwn(known,data.error)?known[data.error as keyof typeof known]:'token_response';
        throw new GoogleProtocolError(reason);
      }
      throw new Error();
    }
    return data;}
  finally{reader.releaseLock();}
}
export async function verifyGoogleIdToken(token:unknown,clientId:string,nonce:string,now:Date,fetcher:typeof fetch=fetch):Promise<string>{
  try{
    if(typeof token!=='string'||token.length>16000)throw new Error();
    const parts=token.split('.');if(parts.length!==3)throw new Error();
    const header=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode(parts[0])));
    if(header.alg!=='RS256'||typeof header.kid!=='string'||header.kid.length>200||header.crit!==undefined)throw new Error();
    const jwks=await boundedJson(GOOGLE_JWKS,{method:'GET'},fetcher);
    if(!Array.isArray(jwks.keys)||jwks.keys.length>20)throw new Error();
    const matches=jwks.keys.filter((k:JsonWebKey&{kid?:string})=>k.kid===header.kid&&k.kty==='RSA'&&k.alg==='RS256'&&k.use==='sig');
    if(matches.length!==1)throw new Error();
    const key=await crypto.subtle.importKey('jwk',matches[0],{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw new Error();
    const claims=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode(parts[1]))),seconds=Math.floor(now.getTime()/1000);
    if(!['https://accounts.google.com','accounts.google.com'].includes(claims.iss)||claims.aud!==clientId||(claims.azp!==undefined&&claims.azp!==clientId)
      ||claims.nonce!==nonce||!Number.isSafeInteger(claims.exp)||claims.exp<=seconds||!Number.isSafeInteger(claims.iat)||claims.iat>seconds+60||claims.iat>=claims.exp
      ||typeof claims.sub!=='string'||! /^[\x21-\x7e]{1,255}$/.test(claims.sub))throw new Error();
    return claims.sub;
  }catch{throw new GoogleProtocolError('id_token_verification');}
}
export async function exchangeGoogleCode(code:string,verifier:string,nonce:string,config:GoogleConfig,now:Date,fetcher:typeof fetch=fetch){
  const valid=validateGoogleConfig(config);
  try{
    const body=new URLSearchParams({code,code_verifier:verifier,client_id:valid.clientId,client_secret:valid.clientSecret,redirect_uri:GOOGLE_CALLBACK,grant_type:'authorization_code'});
    const tokens=await boundedJson(GOOGLE_TOKEN,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()},fetcher);
    // Only the verified subject leaves this protocol boundary. No userinfo/offline access or token retention.
    return await verifyGoogleIdToken(tokens.id_token,valid.clientId,nonce,now,fetcher);
  }catch(error){throw error instanceof GoogleProtocolError?error:new GoogleProtocolError('token_response');}
}
