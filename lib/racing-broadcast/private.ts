import {keyFor,type SealBindings} from '../racing/phase3a/keyring';
export {keyFor} from '../racing/phase3a/keyring';
import {decrypt,digest} from '../racing/phase3a/crypto';
import type {GenerationRow} from '../racing/phase3a/repository';
import type {Meeting,QualifyingRecord} from '../racing/v2/types';
export interface Vault {get(key:string):Promise<{text():Promise<string>}|null>;put(key:string,value:string):Promise<unknown>}
export type Bindings=SealBindings&{RACING_BROADCAST_MODE?:'final-only'|'live';RACING_ISOLATED_DB:D1Database;RACING_PRIVATE_OBJECTS:Vault};
export function objects(env:Bindings){
 return {put:async(hash:string,value:string)=>{await env.RACING_PRIVATE_OBJECTS.put(hash,value);},get:async(hash:string)=>{const obj=await env.RACING_PRIVATE_OBJECTS.get(hash);if(!obj)throw Error('UNAVAILABLE');return obj.text();}};
}
// Bounded private decoded cache, scoped to a bucket and input/output identity. No public response cache.
const caches=new WeakMap<Vault,{ring?:string;legacy?:string;records:Map<string,Promise<Meeting|QualifyingRecord>>}>();
export async function privateRecord(env:Bindings,g:GenerationRow){
 if(g.state!=='READY'||!g.output_hash||g.output_hash!==g.output_ref)throw Error('NOT_READY');
 const hash=g.output_hash,id=g.input_hash+':'+hash;
 let scope=caches.get(env.RACING_PRIVATE_OBJECTS);
 if(!scope || scope.ring!==env.RACING_KEYRING || scope.legacy!==env.RACING_SEAL_KEY){
  scope={ring:env.RACING_KEYRING,legacy:env.RACING_SEAL_KEY,records:new Map()};caches.set(env.RACING_PRIVATE_OBJECTS,scope);
 }
 const cache=scope.records;
 const hit=cache.get(id);if(hit)return hit;
 const p=(async()=>{const clear=await decrypt(await keyFor(env,['decrypt']),await objects(env).get(hash),hash);
  if(await digest(clear)!==hash)throw Error('CORRUPT');
  const e=JSON.parse(clear);if(e.inputHash!==g.input_hash||e.stage!==g.stage||e.contract!=='phase3a-separated-entropy-v1')throw Error('INVALID');
  return e.value as Meeting|QualifyingRecord;
 })();
 if(cache.size>=2)cache.delete(cache.keys().next().value!);
 cache.set(id,p);try{return await p;}catch(error){cache.delete(id);throw error;}
}
