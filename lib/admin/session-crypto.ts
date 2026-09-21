const SESSION_VERSION=1;
const SESSION_LIFETIME_SECONDS=60*60*12;

export type AdminSessionClaims={v:1;sub:'admin';iat:number;exp:number;nonce:string};

export async function createAdminSessionToken(secret:string,now=Date.now()):Promise<string>{
  if(!secret)return '';
  const claims:AdminSessionClaims={v:SESSION_VERSION,sub:'admin',iat:Math.floor(now/1000),exp:Math.floor(now/1000)+SESSION_LIFETIME_SECONDS,nonce:crypto.randomUUID()};
  const payload=encode(JSON.stringify(claims));
  return `${payload}.${encode(await sign(payload,secret))}`;
}

export async function verifyAdminSessionToken(token:string|undefined,secret:string|undefined,now=Date.now()):Promise<AdminSessionClaims|null>{
  if(!token||!secret)return null;
  const [payload,signature,...extra]=token.split('.');
  if(!payload||!signature||extra.length)return null;
  try{
    if(!await crypto.subtle.verify('HMAC',await importKey(secret),decode(signature),new TextEncoder().encode(payload)))return null;
    const claims=JSON.parse(new TextDecoder().decode(decode(payload))) as Partial<AdminSessionClaims>;
    if(claims.v!==SESSION_VERSION||claims.sub!=='admin'||typeof claims.exp!=='number'||claims.exp<=Math.floor(now/1000)||typeof claims.nonce!=='string')return null;
    return claims as AdminSessionClaims;
  }catch{return null;}
}

async function sign(payload:string,secret:string){
  return new Uint8Array(await crypto.subtle.sign('HMAC',await importKey(secret),new TextEncoder().encode(payload)));
}

async function importKey(secret:string){
  return crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}

function encode(value:string|Uint8Array){
  const bytes=typeof value==='string'?new TextEncoder().encode(value):value;
  let binary='';
  for(const byte of bytes)binary+=String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

function decode(value:string){
  const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4);
  const binary=atob(padded);
  return Uint8Array.from(binary,character=>character.charCodeAt(0));
}
