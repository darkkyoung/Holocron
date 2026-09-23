import {getAdminSession} from '@/lib/admin/session';
import {getManagementState,runManagementAction} from '@/lib/admin/service';

export async function GET(){
  try{
    if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
    return Response.json(await getManagementState());
  }catch(e){return Response.json({error:(e as Error).message},{status:403});}
}

export async function POST(req:Request){
  try{
    if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'요청 출처를 확인할 수 없습니다.'},{status:403});
    const body=await req.json() as {action?:unknown;ids?:unknown;sourceId?:unknown;enabled?:unknown};
    if(typeof body.action!=='string')throw new Error('지원하지 않는 작업입니다.');
    if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
    return Response.json(await runManagementAction(body.action,body.ids,body.sourceId,body.enabled));
  }catch(e){return Response.json({error:(e as Error).message},{status:400});}
}
