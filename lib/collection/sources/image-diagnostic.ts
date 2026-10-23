export type ImageLookupReason='NO_IMAGE'|'HTTP_ERROR'|'TIMEOUT'|'PARSE_ERROR'|'REQUEST_ERROR'|'INVALID_URL';

/** Only fixed classifications and an HTTP status; never copy arbitrary exception text. */
export function imageRequestFailure(error:unknown):{reason:ImageLookupReason;detail:string}{
  if(error instanceof Error){
    if(/^HTTP [1-5]\d{2}$/.test(error.message))return {reason:'HTTP_ERROR',detail:error.message};
    if(error.name==='TimeoutError'||error.name==='AbortError')return {reason:'TIMEOUT',detail:'요청 시간 초과'};
  }
  return {reason:'REQUEST_ERROR',detail:'요청 오류'};
}
