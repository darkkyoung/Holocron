// Server-only. The version identifier and the caller's existing associated data
// are authenticated together. Unversioned ciphertext has a single explicit key.
import {bytes} from './crypto';

export type SealBindings={RACING_SEAL_KEY?:string;RACING_KEYRING?:string};
export type SealKey=CryptoKey|{active:string;keys:Map<string,CryptoKey>;legacy?:CryptoKey};
const validId=(id:unknown):id is string=>typeof id==='string' && /^[A-Za-z0-9_-]{1,48}$/.test(id);
async function importKey(raw:unknown,usages:KeyUsage[]) {
 if(typeof raw!=='string'||!/^[a-f0-9]{64}$/.test(raw))throw Error('KEY_UNAVAILABLE');
 return crypto.subtle.importKey('raw',bytes(raw),'AES-GCM',false,usages);
}
function parseConfig(raw:string){
 try{return JSON.parse(raw);}catch{throw Error('KEY_UNAVAILABLE');}
}
export async function keyFor(env:SealBindings,usages:KeyUsage[]=['encrypt','decrypt']):Promise<SealKey>{
 if(env.RACING_KEYRING===undefined)return importKey(env.RACING_SEAL_KEY,usages);
 const config=parseConfig(env.RACING_KEYRING);
 if(!config||!validId(config.active)||!config.keys||typeof config.keys!=='object'||Array.isArray(config.keys))throw Error('KEY_UNAVAILABLE');
 const keys=new Map<string,CryptoKey>();
 for(const [id,raw] of Object.entries(config.keys)){
  if(!validId(id))throw Error('KEY_UNAVAILABLE');
  if(id===config.active||usages.includes('decrypt'))keys.set(id,await importKey(raw,id===config.active?usages:['decrypt']));
 }
 if(!keys.has(config.active))throw Error('KEY_UNAVAILABLE');
 const legacy=env.RACING_SEAL_KEY!==undefined&&usages.includes('decrypt')?await importKey(env.RACING_SEAL_KEY,['decrypt']):undefined;
 return {active:config.active,keys,legacy};
}
