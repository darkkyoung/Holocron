import {getAdminSession} from '@/lib/admin/session';
import {AnalyticsInputError} from '@/lib/analytics/domain';
import {getAnalyticsReport,setBetaAnalyticsStart} from '@/lib/analytics/service';

export async function GET(){
  if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
  return Response.json(await getAnalyticsReport());
}

export async function POST(request:Request){
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'요청 출처를 확인할 수 없습니다.'},{status:403});
  if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return Response.json({error:'JSON 요청만 지원합니다.'},{status:415});
  let body:unknown;
  try{body=await request.json();}catch{return Response.json({error:'요청 형식을 확인해 주세요.'},{status:400});}
  const input=body as Record<string,unknown> | null;
  if(input?.action!=='set-beta-start')return Response.json({error:'지원하지 않는 작업입니다.'},{status:400});
  try{return Response.json(await setBetaAnalyticsStart(input.date,input.time));}
  catch(error){
    if(error instanceof AnalyticsInputError)return Response.json({error:error.message},{status:400});
    console.error('Failed to set beta analytics start',error);
    return Response.json({error:'베타 측정 기준을 저장하지 못했습니다.'},{status:500});
  }
}
