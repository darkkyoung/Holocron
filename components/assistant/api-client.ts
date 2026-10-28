import type {GenerationView,RetrievalView,ChatView} from './contracts';

type ErrorCredit={settlement:'failed'|'refund_pending'|'completed'|'unknown';refund:{requested:number;applied:number;forfeited:number;full:boolean}|null};
export class WorkspaceRequestError extends Error{
  constructor(public readonly code:string,message:string,public readonly credit?:ErrorCredit){super(message);}
}
async function post<T>(path:'retrieve'|'generate',body:unknown,signal:AbortSignal):Promise<T>{
  const response=await fetch(`/api/assistant/${path}`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal});
  let value:unknown;
  try{value=await response.json();}catch{throw new WorkspaceRequestError('UNKNOWN','응답을 확인할 수 없습니다. 정산 여부를 단정하지 마세요.');}
  if(!response.ok){
    const data=value as {error?:{code?:string;message?:string};credit?:ErrorCredit};
    throw new WorkspaceRequestError(data?.error?.code??'UNKNOWN',data?.error?.message??'요청을 처리하지 못했습니다.',data?.credit);
  }
  return value as T;
}
export const retrieveCandidates=(body:unknown,signal:AbortSignal)=>post<RetrievalView>('retrieve',body,signal);
export const generateChat=(body:unknown,signal:AbortSignal)=>post<ChatView>('generate',body,signal);
export const generateSelection=(body:unknown,signal:AbortSignal)=>post<GenerationView>('generate',body,signal);

// Defensive link rendering only. Server-owned evidence and citation policy remain authoritative.
export function displayUrl(raw:string|null|undefined){
  if(!raw||raw.length>2048||/[\u0000-\u0020\u007f]/u.test(raw))return null;
  try{const url=new URL(raw);return (url.protocol==='https:'||url.protocol==='http:')&&!url.username&&!url.password?url.href:null;}catch{return null;}
}

export function settlementText(credit:ErrorCredit|GenerationView['credit']|undefined){
  if(!credit)return '차감·환불 상태를 확인할 수 없습니다. 자동으로 다시 요청하지 마세요.';
  if('settlement' in credit&&['unknown','refund_pending'].includes(credit.settlement))return credit.settlement==='refund_pending'?'환불 정산 대기 중입니다. 실제 적용액을 아직 확인할 수 없습니다.':'차감·환불 상태를 확인할 수 없습니다. 추가 결제 전에 정산 확인이 필요합니다.';
  if(credit.refund){const {requested,applied,forfeited,full}=credit.refund;
    return full?`환불 완료: 요청 ${requested} CR, 실제 적용 ${applied} CR.`:`환불 정산 완료: 요청 ${requested} CR 중 실제 적용 ${applied} CR, ${forfeited} CR 영구 포기. 나중에 추가 환불되지 않습니다.`;}
  if('settlement' in credit)return credit.settlement==='completed'?'이미 완료된 요청입니다. 결과는 저장되지 않아 다시 제공할 수 없습니다.':
    credit.settlement==='refund_pending'?'환불 정산 대기 중입니다. 실제 적용액을 아직 확인할 수 없습니다.':
    '차감·환불 상태를 확인할 수 없습니다. 자동으로 다시 요청하지 마세요.';
  return `${credit.charged} CR 사용 완료. 이 결과는 현재 화면에만 표시됩니다.`;
}
