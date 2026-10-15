import {IdentityError} from './guest-crypto';
const encoder=new TextEncoder();
export const encode=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export function decode(value:string){if(!/^[A-Za-z0-9_-]+$/.test(value))throw new Error();return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
async function key(secret:string|undefined){
  if(!secret||encoder.encode(secret).length<32)throw new IdentityError('CONFIGURATION');
  return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
export const randomToken=()=>encode(crypto.getRandomValues(new Uint8Array(32)));
export const cookie=(name:string,value:string,age:number)=>`${name}=${value}; Path=/; Max-Age=${age}; HttpOnly; Secure; SameSite=Lax`;
export function readCookie(request:Request,name:string){
  const values=(request.headers.get('cookie')??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(name+'='));
  if(values.length>1)throw new IdentityError('INVALID_IDENTITY');
  return values[0]?.slice(name.length+1);
}
export async function signCookie(data:Record<string,unknown>,domain:string,secret:string|undefined,lifetime:number,now=Date.now()){
  const iat=Math.floor(now/1000),payload=encode(encoder.encode(JSON.stringify({...data,v:1,iat,exp:iat+lifetime})));
  const signature=await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(`${domain}:${payload}`));
  return `${payload}.${encode(new Uint8Array(signature))}`;
}
export async function verifyCookie(token:string|undefined,domain:string,secret:string|undefined,lifetime:number,now=Date.now()):Promise<Record<string,unknown>>{
  const signingKey=await key(secret);
  try{
    if(!token||token.length>3500)throw new Error();
    const [payload,signature,...extra]=token.split('.');
    if(extra.length||!await crypto.subtle.verify('HMAC',signingKey,decode(signature),encoder.encode(`${domain}:${payload}`)))throw new Error();
    const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode(payload))),seconds=Math.floor(now/1000);
    if(data.v!==1||!Number.isSafeInteger(data.iat)||!Number.isSafeInteger(data.exp)||data.exp-data.iat!==lifetime||data.iat>seconds||data.exp<=seconds)throw new Error();
    return data;
  }catch{throw new IdentityError('INVALID_IDENTITY');}
}
