import {NextRequest} from 'next/server';
import {authenticateAdmin,setAdminSession} from '@/lib/admin/session';

export async function POST(request:NextRequest){
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'요청을 거부했습니다.'},{status:403});
  const form=await request.formData();
  const username=String(form.get('username')??'');
  const password=String(form.get('password')??'');
  const url=new URL('/admin/login',request.url);
  if(!(await authenticateAdmin(username,password))){
    url.searchParams.set('error','1');
    return Response.redirect(url,303);
  }
  if(!(await setAdminSession())){
    url.searchParams.set('error','1');
    return Response.redirect(url,303);
  }
  return Response.redirect(new URL('/admin',request.url),303);
}
