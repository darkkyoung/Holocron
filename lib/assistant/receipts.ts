import {encode,decode} from '../identity/signed-cookie';
import type {ArchiveSnapshot} from '../news/archive-snapshot';
import {AssistantError,EVIDENCE_POLICY,type RetrievalRequest} from './types';
import {requireSigningSecret} from './identity';
import {fingerprintStory,storyEvidence} from './evidence';
import {opaqueId,validateRetrieval} from './validation';
import {projectFilteredStories,retrieveStories} from './retrieval';

const encoder=new TextEncoder(),LIFETIME=600000,DOMAIN='holocron-assistant-selection:v1';
type Claims={version:string;binding:string;issued:number;expires:number;request:RetrievalRequest;candidates:{storyId:string;fingerprint:string}[]};
async function keys(secret:string|undefined){
  requireSigningSecret(secret);
  const root=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const derive=(purpose:string)=>crypto.subtle.sign('HMAC',root,encoder.encode(`${DOMAIN}:${purpose}`));
  return {mac:await crypto.subtle.importKey('raw',await derive('integrity'),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']),
    encryption:await crypto.subtle.importKey('raw',await derive('opaque-payload'),{name:'AES-GCM'},false,['encrypt','decrypt'])};
}
export async function issueReceipt(snapshot:ArchiveSnapshot,request:RetrievalRequest,candidateIds:readonly string[],binding:string,secret:string|undefined,now=Date.now()){
  if(!candidateIds.length||candidateIds.length>12||new Set(candidateIds).size!==candidateIds.length)throw new AssistantError('EVIDENCE_CHANGED',409);
  const candidates=await Promise.all(candidateIds.map(async storyId=>{
    const story=snapshot.stories.find(s=>s.topic===storyId);
    if(!story||!opaqueId(storyId))throw new AssistantError('EVIDENCE_CHANGED',409);
    return {storyId,fingerprint:await fingerprintStory(story,snapshot)};
  }));
  const claims:Claims={version:EVIDENCE_POLICY,binding,issued:now,expires:now+LIFETIME,request,candidates},key=await keys(secret),iv=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(DOMAIN)},key.encryption,encoder.encode(JSON.stringify(claims)));
  const payload=`v1.${encode(iv)}.${encode(new Uint8Array(ciphertext))}`;
  return `${payload}.${encode(new Uint8Array(await crypto.subtle.sign('HMAC',key.mac,encoder.encode(`${DOMAIN}:${payload}`))))}`;
}
export async function verifyReceipt(token:unknown,binding:string,secret:string|undefined,now=Date.now()):Promise<Claims>{
  const key=await keys(secret);
  try{
    if(typeof token!=='string'||token.length>24000)throw new Error();
    const [v,iv,body,mac,...extra]=token.split('.');
    if(v!=='v1'||extra.length||!await crypto.subtle.verify('HMAC',key.mac,decode(mac),encoder.encode(`${DOMAIN}:${v}.${iv}.${body}`)))throw new Error();
    const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(iv),additionalData:encoder.encode(DOMAIN)},key.encryption,decode(body));
    const claims=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plaintext)) as Claims;
    if(claims.version!==EVIDENCE_POLICY||claims.binding!==binding||!Number.isSafeInteger(claims.issued)||claims.expires-claims.issued!==LIFETIME||claims.issued>now||claims.expires<=now)throw new Error();
    validateRetrieval(claims.request,claims.issued);
    if(!Array.isArray(claims.candidates)||!claims.candidates.length||claims.candidates.length>12||new Set(claims.candidates.map(c=>c.storyId)).size!==claims.candidates.length||claims.candidates.some(c=>!opaqueId(c.storyId)||!/^[a-f0-9]{64}$/.test(c.fingerprint)))throw new Error();
    return claims;
  }catch{throw new AssistantError('EVIDENCE_CHANGED',409);}
}
/** Reusable before AND after future provider work. Caller supplies a fresh primary
 * snapshot; never accepts client evidence or follows a replacement topic ID. */
export async function verifySelectedEvidence(token:unknown,selected:unknown,binding:string,secret:string|undefined,snapshot:ArchiveSnapshot,now=Date.now()){
  const claims=await verifyReceipt(token,binding,secret,now);
  if(!Array.isArray(selected)||!selected.length||selected.length>(claims.request.mode==='qa'?6:8)||!selected.every(opaqueId)||new Set(selected).size!==selected.length)throw new AssistantError('EVIDENCE_CHANGED',409);
  const projected=projectFilteredStories(snapshot,claims.request);
  let terms:string[];
  try{terms=retrieveStories(snapshot,claims.request).terms;}
  catch{throw new AssistantError('EVIDENCE_CHANGED',409);}
  return {request:claims.request,evidence:await Promise.all(selected.map(async id=>{
    const recorded=claims.candidates.find(c=>c.storyId===id),story=snapshot.stories.find(s=>s.topic===id),filtered=projected.find(s=>s.topic===id);
    if(!recorded||!story||!filtered||recorded.fingerprint!==await fingerprintStory(story,snapshot))throw new AssistantError('EVIDENCE_CHANGED',409);
    return storyEvidence(filtered,terms);
  })),asOf:snapshot.asOf};
}
