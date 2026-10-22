import {resolveAccountSession} from '../identity/account-session';
import {admissionHmac} from './abuse-identity';
import {AssistantError} from './types';
/** Account identity is verified in D1; neither IP nor caller Account IDs confer authority. */
export async function searchAccount(db:D1Database,request:Request,secret:string|undefined,now:number){
 try{const account=await resolveAccountSession(request,db,secret,now);if(account)return account.owner;}
 catch(error){if(error instanceof Error&&'code' in error&&error.code==='UNAVAILABLE')throw new AssistantError('OWNER_UNAVAILABLE',503);}
 throw new AssistantError('LOGIN_REQUIRED',401);
}
export const accountBinding=(id:string,secret:string|undefined)=>admissionHmac(secret,'account-receipt-v1',id);
export async function accountAdmissionIdentity(id:string,secret:string|undefined){
 return {sessionHash:await admissionHmac(secret,'account-admission-v1',id),
  // Historical NOT NULL column: explicitly marked unobserved, NOT a network identity.
  networkHash:'0'.repeat(64),previousNetworkHash:'0'.repeat(64)};
}
