import {observeOutput,outputDiagnostic,type OutputDiagnostic,type OutputObserver} from './output-diagnostic';

/** Request-local delivery, independent of WARN collection. Authentication and
 * observation are best effort and can never replace the settled response. */
export async function withAdminOutputDiagnostic(
  run:(observer:OutputObserver)=>Promise<Response>,
  authorized:()=>Promise<boolean>,
  logger:OutputObserver,
){
  let diagnostic:OutputDiagnostic|undefined;
  const response=await run(value=>{
    if(diagnostic)return;
    diagnostic=outputDiagnostic(value.reason,value.path);
    observeOutput(logger,diagnostic);
  });
  if(response.ok)return response;
  try{
    const body=await response.clone().json() as {error?:{code?:string}};
    if(body.error?.code!=='INVALID_OUTPUT'||!await authorized())return response;
    const headers=new Headers(response.headers);
    headers.set('Cache-Control','private, no-store');
    headers.set('X-Holocron-Output-Stage',diagnostic?.stage??'UNKNOWN');
    headers.set('X-Holocron-Output-Reason',diagnostic?.reason??'UNKNOWN');
    headers.set('X-Holocron-Output-Path',diagnostic?.path??'UNKNOWN');
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}
