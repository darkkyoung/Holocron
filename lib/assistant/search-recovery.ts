import {encode,decode} from '../identity/signed-cookie';
import {requireSigningSecret} from './identity';
import {AssistantError} from './types';
const encoder=new TextEncoder();
async function key(secret:string|undefined){requireSigningSecret(secret);return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',encoder.encode('assistant-search-recovery-v1:'+secret)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
/** Bounded short-lived encrypted public result, not Provider output or cookies. */
export async function sealSearch(value:unknown,secret:string|undefined,binding:string){
 const body=encoder.encode(JSON.stringify(value));if(body.length>64*1024)throw new AssistantError('EVIDENCE_TOO_LARGE',413);
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(binding)},await key(secret),body);
 return encode(iv)+'.'+encode(new Uint8Array(encrypted));
}
export async function openSearch<T>(cipher:string,secret:string|undefined,binding:string):Promise<T>{
 if(cipher.length>90*1024)throw new AssistantError('ADMISSION_UNAVAILABLE',503);
 try{const [iv,body,...extra]=cipher.split('.');if(extra.length)throw Error();return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv),additionalData:encoder.encode(binding)},await key(secret),decode(body))));}
 catch{throw new AssistantError('ADMISSION_UNAVAILABLE',503);}
}
