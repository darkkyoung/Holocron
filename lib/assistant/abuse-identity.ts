import {requireSigningSecret} from './identity';
import {AssistantError} from './types';
import {utcDay} from './limits';
const encoder=new TextEncoder();
export async function admissionHmac(secret:string|undefined,domain:string,value:string){
  requireSigningSecret(secret);
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(`holocron-assistant-admission-v1\0${domain}\0${value}`))),b=>b.toString(16).padStart(2,'0')).join('');
}
/** Only a Worker Request carrying platform CF metadata is eligible. Never X-Forwarded-For.
 * Local tests inject a synthetic resolver; production must preserve Request.cf. */
export function trustedEdgeNetwork(request:Request):string|null{
  const cf=(request as Request&{cf?:{colo?:unknown}}).cf;
  if(!cf||typeof cf.colo!=='string'||!cf.colo)return null;
  const ip=request.headers.get('CF-Connecting-IP');
  return ip&&ip.length<=45&&/^[0-9a-fA-F:.]+$/.test(ip)?ip:null;
}
export async function admissionIdentity(binding:string,network:string|null,secret:string|undefined,now:number){
  if(!network)throw new AssistantError('NETWORK_UNAVAILABLE',503);
  const day=utcDay(now);
  const [sessionHash,networkHash,previousNetworkHash]=await Promise.all([
    admissionHmac(secret,'session',binding),admissionHmac(secret,`network:${day}`,network),admissionHmac(secret,`network:${day-86_400_000}`,network),
  ]);
  return {sessionHash,networkHash,previousNetworkHash};
}
