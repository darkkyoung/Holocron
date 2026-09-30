import {getAdminSession} from '@/lib/admin/session';
import {loadSiteCopyFresh,resetSiteCopy,saveSiteCopy} from '@/lib/site-copy-repository';

export async function GET(){
  try{
    if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
    return Response.json({copy:await loadSiteCopyFresh()});
  }catch(error){return Response.json({error:(error as Error).message},{status:400});}
}

export async function POST(request:Request){
  try{
    if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'요청 출처를 확인할 수 없습니다.'},{status:403});
    if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
    const body=await request.json() as {action?:unknown;copy?:unknown};
    if(body.action==='save')return Response.json({copy:await saveSiteCopy(body.copy)});
    if(body.action==='reset')return Response.json({copy:await resetSiteCopy()});
    throw new Error('지원하지 않는 작업입니다.');
  }catch(error){return Response.json({error:(error as Error).message},{status:400});}
}
