import {publicJson,privateJson,PublicMutationError} from '../credit/rewards/http';
import {ArchiveSnapshotError} from '../news/archive-snapshot';
import {AssistantError} from './types';
import {validateRetrieval} from './validation';
import {assistantSession,requireSigningSecret} from './identity';
import {retrieveArchive} from './service';

export type RetrievalDependencies={enabled:boolean;secret?:string;database:()=>D1Database;now?:()=>number};
const messages:Record<string,string>={
  INVALID_REQUEST:'검색 조건을 확인해 주세요.',FORBIDDEN:'같은 사이트에서 다시 요청해 주세요.',PAYLOAD_TOO_LARGE:'요청 크기를 줄여 주세요.',
  UNSUPPORTED_MEDIA_TYPE:'JSON 요청만 지원합니다.',METHOD_NOT_ALLOWED:'POST 요청만 지원합니다.',
  ARCHIVE_UNAVAILABLE:'아카이브를 읽을 수 없습니다. 잠시 후 다시 시도해 주세요.',ARCHIVE_CAPACITY:'아카이브 용량 한도로 검색할 수 없습니다.',
  EVIDENCE_CHANGED:'근거가 변경되었거나 만료됐습니다. 다시 검색해 주세요.',EVIDENCE_TOO_LARGE:'근거가 너무 큽니다. 검색 조건을 좁혀 주세요.',
  ASSISTANT_UNAVAILABLE:'AI 도우미는 아직 이용할 수 없습니다.',INTERNAL_ERROR:'요청을 처리할 수 없습니다.',
};
export function assistantErrorResponse(error:unknown){
  let code='INTERNAL_ERROR',status=500;
  if(error instanceof AssistantError){code=error.code;status=error.status;}
  else if(error instanceof ArchiveSnapshotError){code=error.code;status=503;}
  else if(error instanceof PublicMutationError){status=error.status;code=({400:'INVALID_REQUEST',403:'FORBIDDEN',405:'METHOD_NOT_ALLOWED',413:'PAYLOAD_TOO_LARGE',415:'UNSUPPORTED_MEDIA_TYPE'} as Record<number,string>)[status]??'INVALID_REQUEST';}
  const response=privateJson({status:'error',error:{code,message:messages[code]}},status);
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
    const result=await retrieveArchive(database,input,session.binding,deps.secret,now);
    if(new TextEncoder().encode(JSON.stringify(result)).length>64*1024)throw new AssistantError('EVIDENCE_TOO_LARGE',413);
    const response=privateJson(result);
    if(session.setCookie)response.headers.append('Set-Cookie',session.setCookie);
    return response;
  }catch(error){return assistantErrorResponse(error);}
}
