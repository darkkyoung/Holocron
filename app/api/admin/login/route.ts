import {NextRequest} from 'next/server';
import {adminSessionSecret,authenticateAdmin,setAdminSession} from '@/lib/admin/session';
import {adminLoginClientAddress,hashAdminLoginClient} from '@/lib/admin/login-rate-limit-identity';
import {cleanupStaleAdminLoginRateLimits,clearAdminLoginRateLimit,getAdminLoginRateLimit,recordFailedAdminLogin} from '@/lib/admin/login-rate-limit-repository';

export async function POST(request:NextRequest){
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'요청을 거부했습니다.'},{status:403});
  const url=new URL('/admin/login',request.url);
  const secret=adminSessionSecret();
  if(!secret){url.searchParams.set('error','1');return Response.redirect(url,303);}
  const clientHash=await hashAdminLoginClient(adminLoginClientAddress(request.headers),secret);
  const now=Date.now();
  await cleanupStaleAdminLoginRateLimits(now);
  if((await getAdminLoginRateLimit(clientHash,now)).blocked){url.searchParams.set('rate','1');return Response.redirect(url,303);}
  const form=await request.formData();
  const username=String(form.get('username')??'');
  const password=String(form.get('password')??'');
  if(!(await authenticateAdmin(username,password))){
    const limit=await recordFailedAdminLogin(clientHash,now);
    url.searchParams.set(limit.blocked?'rate':'error','1');
    return Response.redirect(url,303);
  }
  await clearAdminLoginRateLimit(clientHash);
  if(!(await setAdminSession())){
    url.searchParams.set('error','1');
    return Response.redirect(url,303);
  }
  return Response.redirect(new URL('/admin',request.url),303);
}
