import {publicJson,privateJson,PublicMutationError} from '../credit/rewards/http';
import {ArchiveSnapshotError} from '../news/archive-snapshot';
import {AssistantError} from './types';
import {validateRetrieval} from './validation';
import {assistantSession,requireSigningSecret} from './identity';
import {retrieveArchive} from './service';
import {admitRetrieval,type AdmissionDependencies} from './admission';

export type RetrievalDependencies=AdmissionDependencies&{database:()=>D1Database};
const messages:Record<string,string>={
  PRICE_CHANGED:'Credit 정책이 변경되었습니다. 새 가격을 확인한 뒤 다시 생성해 주세요.',MONTHLY_BUDGET_EXCEEDED:'이번 달 AI 운영 예산에 도달해 새 생성을 받을 수 없습니다.',
  PROVIDER_CONFIGURATION:'AI 제공자 설정을 확인할 수 없습니다.',PROVIDER_UNAVAILABLE:'AI 제공자를 이용할 수 없습니다.',PROVIDER_RATE_LIMIT:'AI 제공자 요청 한도에 도달했습니다.',
  PROVIDER_TIMEOUT:'AI 응답 시간이 초과됐습니다.',SERVICE_TIMEOUT:'요청 처리 시간이 초과됐습니다.',REQUEST_CANCELLED:'요청이 취소됐습니다.',
  INVALID_OUTPUT:'근거 검증을 통과하지 못해 결과를 표시하지 않습니다.',OUTPUT_LIMIT:'응답 크기 한도를 넘어 결과를 표시하지 않습니다.',PROVIDER_REFUSAL:'AI가 요청에 대한 결과를 제공하지 못했습니다.',
  INSUFFICIENT_BALANCE:'Credit이 부족합니다.',REQUEST_IN_PROGRESS:'같은 요청이 처리 중입니다. 자동 재요청하지 마세요.',REQUEST_CONFLICT:'같은 요청 ID에 다른 내용이 사용됐습니다.',
  RESULT_NOT_RETAINED:'이미 처리된 요청입니다. 결과는 저장되지 않아 다시 제공할 수 없습니다.',REFUND_PENDING:'정산 결과를 아직 확인할 수 없습니다.',LEASE_EXPIRED:'요청 처리 유효 시간이 지났습니다.',
  LOGIN_REQUIRED:'AI 생성을 이용하려면 로그인해 주세요. 검색과 아카이브 열람은 무료입니다.',
  INVALID_REQUEST:'검색 조건을 확인해 주세요.',FORBIDDEN:'같은 사이트에서 다시 요청해 주세요.',PAYLOAD_TOO_LARGE:'요청 크기를 줄여 주세요.',
  UNSUPPORTED_MEDIA_TYPE:'JSON 요청만 지원합니다.',METHOD_NOT_ALLOWED:'POST 요청만 지원합니다.',
  ARCHIVE_UNAVAILABLE:'아카이브를 읽을 수 없습니다. 잠시 후 다시 시도해 주세요.',ARCHIVE_CAPACITY:'아카이브 용량 한도로 검색할 수 없습니다.',
  EVIDENCE_CHANGED:'근거가 변경되었거나 만료됐습니다. 다시 검색해 주세요.',EVIDENCE_TOO_LARGE:'근거가 너무 큽니다. 검색 조건을 좁혀 주세요.',
  ADMISSION_LIMIT:'잠시 후 다시 검색해 주세요.',ADMISSION_CAPACITY:'현재 검색 요청을 처리할 수 없습니다.',ADMISSION_UNAVAILABLE:'현재 검색 요청을 처리할 수 없습니다.',NETWORK_UNAVAILABLE:'네트워크를 확인할 수 없습니다.',
  ASSISTANT_UNAVAILABLE:'AI 도우미는 아직 이용할 수 없습니다.',INTERNAL_ERROR:'요청을 처리할 수 없습니다.',
};
export function assistantErrorResponse(error:unknown){
  let code='INTERNAL_ERROR',status=500;
  if(error instanceof AssistantError){code=error.code;status=error.status;}
  else if(error instanceof ArchiveSnapshotError){code=error.code;status=503;}
  else if(error instanceof PublicMutationError){status=error.status;code=({400:'INVALID_REQUEST',403:'FORBIDDEN',405:'METHOD_NOT_ALLOWED',413:'PAYLOAD_TOO_LARGE',415:'UNSUPPORTED_MEDIA_TYPE'} as Record<number,string>)[status]??'INVALID_REQUEST';}
  const response=privateJson({status:'error',error:{code,message:messages[code]??messages.INTERNAL_ERROR}},status);
  if(status===429)response.headers.set('Retry-After','60');
  if(status===405)response.headers.set('Allow','POST');
  return response;
}
export async function handleRetrieve(request:Request,deps:RetrievalDependencies){
  try{
    if(request.method!=='POST')throw new PublicMutationError(405,'');
    if(!deps.enabled)throw new AssistantError('ASSISTANT_UNAVAILABLE',503);
    requireSigningSecret(deps.secret);
    // publicJson bounds streaming input even without Content-Length. Reject same-site
    // sibling origins as well: only same-origin (or absent Fetch Metadata) is allowed.
    const site=request.headers.get('sec-fetch-site');
    if(site&&site!=='same-origin')throw new PublicMutationError(403,'');
    const now=deps.now?.()??Date.now(),input=validateRetrieval(await publicJson(request,16*1024),now);
    const session=await assistantSession(request,deps.secret,now);
    let database:D1Database;
    try{database=deps.database();}catch{throw new ArchiveSnapshotError('ARCHIVE_UNAVAILABLE');}
    await admitRetrieval(database,request,session.binding,input,deps,now);
    const result=await retrieveArchive(database,input,session.binding,deps.secret,now);
    if(new TextEncoder().encode(JSON.stringify(result)).length>64*1024)throw new AssistantError('EVIDENCE_TOO_LARGE',413);
    const response=privateJson(result);
    if(session.setCookie)response.headers.append('Set-Cookie',session.setCookie);
    return response;
  }catch(error){return assistantErrorResponse(error);}
}
