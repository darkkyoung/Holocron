import {getAdminSession} from '@/lib/admin/session';
import {changeWorkStatus,getWorksManagementState} from '@/lib/works/service';

export async function GET(){
  if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
  try{return Response.json(await getWorksManagementState());}
  catch(error){return Response.json({error:(error as Error).message},{status:500});}
}

export async function POST(request:Request){
  try{
    if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'요청 출처를 확인할 수 없습니다.'},{status:403});
    if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
    const body=await request.json() as {id?:unknown;status?:unknown};
    return Response.json(await changeWorkStatus(body.id,body.status));
  }catch(error){return Response.json({error:(error as Error).message},{status:400});}
}
