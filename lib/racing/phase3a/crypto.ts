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
export async function encrypt(key:CryptoKey,text:string,aad:string){const iv=crypto.getRandomValues(new Uint8Array(12));return hex(iv)+':'+hex(new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(aad)},key,enc.encode(text))));}
export async function decrypt(key:CryptoKey,cipher:string,aad:string){const [iv,data]=cipher.split(':');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv),additionalData:enc.encode(aad)},key,bytes(data)));}
