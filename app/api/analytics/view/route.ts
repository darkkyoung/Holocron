import {anonymousSession,withAnonymousSession} from '@/lib/beta/anonymous-session';
import {parseAnalyticsRoute} from '@/lib/analytics/domain';
import {recordPageView} from '@/lib/analytics/repository';

export async function GET(){return Response.json({error:'Method Not Allowed'},{status:405,headers:{Allow:'POST'}});}

export async function POST(request:Request){
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return Response.json({error:'JSON 요청만 지원합니다.'},{status:415});
  let body:unknown;
  try{body=await request.json();}catch{return Response.json({error:'요청 형식을 확인해 주세요.'},{status:400});}
  let route;
  try{route=parseAnalyticsRoute((body as Record<string,unknown> | null)?.route);}catch(error){return Response.json({error:(error as Error).message},{status:400});}
  const session=await anonymousSession(request);
  await recordPageView(route,session.sessionHash,new Date());
  return withAnonymousSession(Response.json({ok:true}),session.setCookie);
}
