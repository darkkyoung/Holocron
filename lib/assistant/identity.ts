import {signCookie,verifyCookie,randomToken,cookie,readCookie} from '../identity/signed-cookie';
import {AssistantError} from './types';
export const ASSISTANT_COOKIE='__Host-holocron_assistant';
const LIFETIME=7*86400,DOMAIN='holocron-assistant-session:v1';
export function requireSigningSecret(secret:string|undefined):asserts secret is string{
  if(!secret||new TextEncoder().encode(secret).length<32)throw new AssistantError('ASSISTANT_UNAVAILABLE',503);
}
/** Browser binding only: no D1 row, account authority, rewards or wallet creation. */
export async function assistantSession(request:Request,secret:string|undefined,now=Date.now()){
  requireSigningSecret(secret);
  let id:string|undefined;
  try{const data=await verifyCookie(readCookie(request,ASSISTANT_COOKIE),DOMAIN,secret,LIFETIME,now);if(typeof data.id==='string'&&/^[A-Za-z0-9_-]{43}$/.test(data.id))id=data.id;}catch{/* Invalid/expired/duplicate cookies rotate; old receipts cannot cross sessions. */}
  let setCookie:string|undefined;
  if(!id){id=randomToken();setCookie=cookie(ASSISTANT_COOKIE,await signCookie({id},DOMAIN,secret,LIFETIME,now),LIFETIME);}
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${DOMAIN}:binding:${id}`));
  return {binding:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),setCookie};
}
