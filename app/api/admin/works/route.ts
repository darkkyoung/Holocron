import {getAdminSession} from '@/lib/admin/session';
import {changeWorkStatus,createManagedWork,deleteManagedWork,getWorksManagementState,updateManagedWork} from '@/lib/works/service';

export async function GET(){
  if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
  try{return Response.json(await getWorksManagementState());}
  catch(error){return Response.json({error:(error as Error).message},{status:500});}
}

export async function POST(request:Request){
  try{
    if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'요청 출처를 확인할 수 없습니다.'},{status:403});
    if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
    const body=await request.json() as {action?:unknown;id?:unknown;status?:unknown;work?:unknown};
    if(body.action==='create')return Response.json(await createManagedWork(body.work),{status:201});
    if(body.action==='update')return Response.json(await updateManagedWork(body.id,body.work));
    if(body.action==='delete')return Response.json(await deleteManagedWork(body.id));
    return Response.json(await changeWorkStatus(body.id,body.status));
  }catch(error){return Response.json({error:(error as Error).message},{status:400});}
}
