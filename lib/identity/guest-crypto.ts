export const GUEST_COOKIE='__Host-holocron_guest';
export const GUEST_LIFETIME_SECONDS=180*24*60*60;
export class IdentityError extends Error{
  constructor(public readonly code:'CONFIGURATION'|'INVALID_IDENTITY'|'UNAVAILABLE'|'PROVIDER_CONFLICT'|'INVALID_INPUT'){super(`Identity operation failed: ${code}.`);}
}
const encoder=new TextEncoder();
const encode=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
function decode(value:string){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),character=>character.charCodeAt(0));}
async function signingKey(secret:string|undefined){
  if(!secret||encoder.encode(secret).byteLength<32)throw new IdentityError('CONFIGURATION');
  return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
async function guestHash(id:string){
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(`holocron-credit-guest:v1:${id}`));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function createGuestToken(secret:string|undefined,now=Date.now()){
  const key=await signingKey(secret),id=encode(crypto.getRandomValues(new Uint8Array(32))),iat=Math.floor(now/1000),exp=iat+GUEST_LIFETIME_SECONDS;
  const payload=`v1.${id}.${iat}.${exp}`;
  const signature=encode(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(payload))));
  return {token:`${payload}.${signature}`,guestKeyHash:await guestHash(id)};
}
export async function verifyGuestToken(token:string|undefined,secret:string|undefined,now=Date.now()):Promise<{guestKeyHash:string}|null>{
  const key=await signingKey(secret);
  if(!token||token.length>256||!/^v1\.[A-Za-z0-9_-]{43}\.\d{10}\.\d{10}\.[A-Za-z0-9_-]{43}$/.test(token))return null;
  try{
    const [v,id,issued,expires,signature]=token.split('.'),iat=Number(issued),exp=Number(expires),seconds=Math.floor(now/1000);
    if(exp-iat!==GUEST_LIFETIME_SECONDS||iat>seconds||seconds>=exp)return null;
    // Web Crypto verification avoids a string equality comparison of signatures.
    if(!await crypto.subtle.verify('HMAC',key,decode(signature),encoder.encode(`${v}.${id}.${issued}.${expires}`)))return null;
    return {guestKeyHash:await guestHash(id)};
  }catch{return null;}
}
export function guestCookie(token:string){return `${GUEST_COOKIE}=${token}; Path=/; Max-Age=${GUEST_LIFETIME_SECONDS}; HttpOnly; Secure; SameSite=Lax`;}
export function readGuestCookie(request:Request){
  const matches=(request.headers.get('cookie')??'').split(';').map(value=>value.trim()).filter(value=>value.startsWith(`${GUEST_COOKIE}=`));
  if(matches.length>1)throw new IdentityError('INVALID_IDENTITY');
  return matches[0]?.slice(GUEST_COOKIE.length+1);
}
