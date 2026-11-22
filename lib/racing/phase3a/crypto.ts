import type {SealKey} from './keyring';
const enc=new TextEncoder();
export function canonical(value:unknown):string {
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Record<string,unknown>)[k])).join(',')+'}';
 throw Error('INVALID_CANONICAL_VALUE');
}
export async function digest(value:string){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value))));}
export function hex(value:Uint8Array){return Array.from(value,x=>x.toString(16).padStart(2,'0')).join('');}
export function bytes(value:string){if(!/^[0-9a-f]+$/.test(value)||value.length%2)throw Error('INVALID_HEX');return Uint8Array.from(value.match(/../g)!,x=>parseInt(x,16));}
export function secret(){return hex(crypto.getRandomValues(new Uint8Array(32)));}
export async function encrypt(seal:SealKey,text:string,aad:string){
 const versioned='keys' in seal;
 const key=versioned?seal.keys.get(seal.active):seal;
 if(!key)throw Error('KEY_UNAVAILABLE');
 const prefix=versioned?'v1:'+seal.active+':':'';
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(prefix+aad)},key,enc.encode(text));
 return prefix+hex(iv)+':'+hex(new Uint8Array(encrypted));
}
export async function decrypt(seal:SealKey,cipher:string,aad:string){
 const parts=cipher.split(':');
 const versioned=parts.length===4 && parts[0]==='v1';
 if(!versioned&&parts.length!==2)throw Error('INVALID_CIPHER');
 const key=versioned?('keys' in seal?seal.keys.get(parts[1]):undefined):('keys' in seal?seal.legacy:seal);
 if(!key)throw Error('KEY_UNAVAILABLE');
 const [iv,data]=parts.slice(-2);
 if(iv.length!==24 || data.length<32)throw Error('INVALID_CIPHER');
 const associated=versioned?'v1:'+parts[1]+':'+aad:aad;
 return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv),additionalData:enc.encode(associated)},key,bytes(data)));
}
