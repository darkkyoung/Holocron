'use client';
import type {GuestCreditState} from '@/lib/credit/rewards/policy';

let pending:Promise<GuestCreditState>|null=null;
let current:GuestCreditState|null=null;
export const CREDIT_CHANGED='holocron-credit-changed';
const errorMessage='Credit을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
// Web Locks serialize first-cookie initialization across tabs; D1 unique keys remain the reward boundary.
export function initializeGuestCredits(force=false):Promise<GuestCreditState>{
  if(pending)return pending;
  if(current&&!force)return Promise.resolve(current);
  if(!navigator.locks)return Promise.reject(new Error('이 브라우저에서는 안전한 Guest 초기화를 지원하지 않습니다. 최신 브라우저를 이용해 주세요.'));
  pending=(async()=>await navigator.locks.request('holocron-guest-initialization',async()=>{
    const response=await fetch('/api/credit/visit',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
    const data=await response.json() as GuestCreditState&{error?:string};
    if(!response.ok)throw new Error(typeof data.error==='string'?data.error:errorMessage);
    current=data as GuestCreditState;
    window.dispatchEvent(new CustomEvent(CREDIT_CHANGED,{detail:current}));
    return current;
  }))().finally(()=>{pending=null;});
  return pending;
}
export function refreshCreditsAfterQuiz(){
  if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('holocron-credit');channel.postMessage('refresh');channel.close();}
  void initializeGuestCredits(true).catch(()=>{window.dispatchEvent(new CustomEvent(CREDIT_CHANGED,{detail:null}));});
}

export async function logoutAccount(){
  const response=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('로그아웃하지 못했습니다. 다시 시도해 주세요.');
  current=null;
  if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('holocron-credit');channel.postMessage('refresh');channel.close();}
  window.location.assign(window.location.pathname);
}
