import {IdentityError} from '../../identity/guest-crypto';
export class PublicMutationError extends Error{constructor(public status:number,message:string){super(message);}}
export async function publicJson(request:Request,maxBytes=1024){
  if(request.method!=='POST')throw new PublicMutationError(405,'지원하지 않는 요청입니다.');
  if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new PublicMutationError(403,'요청 출처를 확인할 수 없습니다.');
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')??''))throw new PublicMutationError(415,'JSON 요청만 지원합니다.');
  const reader=request.body?.getReader();
  if(!reader)throw new PublicMutationError(400,'요청 형식을 확인해 주세요.');
  let size=0,text='';const decoder=new TextDecoder('utf-8',{fatal:true});
  try{
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw new PublicMutationError(413,'요청이 너무 큽니다.');}text+=decoder.decode(value,{stream:true});}
    text+=decoder.decode();return JSON.parse(text) as unknown;
  }catch(error){if(error instanceof PublicMutationError)throw error;throw new PublicMutationError(400,'요청 형식을 확인해 주세요.');}
  finally{reader.releaseLock();}
}
export function publicError(error:unknown){
  if(error instanceof PublicMutationError)return privateJson({error:error.message},error.status);
  if(error instanceof IdentityError&&error.code==='INVALID_IDENTITY')return privateJson({error:'Guest 인증을 확인할 수 없습니다. 이 사이트의 Guest 쿠키를 확인해 주세요.'},401);
  return privateJson({error:'Credit 처리에 일시적인 문제가 있습니다. 잠시 후 다시 시도해 주세요.'},503);
}
export function privateJson(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});}
export function emptyVisitBody(value:unknown){
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length)throw new PublicMutationError(400,'방문 요청에는 추가 값을 지정할 수 없습니다.');
}
