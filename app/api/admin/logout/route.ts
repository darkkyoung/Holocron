import {NextRequest} from 'next/server';
import {clearAdminSession} from '@/lib/admin/session';

export async function POST(request:NextRequest){
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'요청을 거부했습니다.'},{status:403});
  await clearAdminSession();
  return Response.redirect(new URL('/admin/login',request.url),303);
}
