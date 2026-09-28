import {getAdminSession} from '@/lib/admin/session';
import {createManagedQuiz,deleteManagedQuiz,getQuizManagementState,updateManagedQuiz} from '@/lib/quiz/service';

export async function GET(){
  if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
  try{return Response.json(await getQuizManagementState());}
  catch(error){return Response.json({error:(error as Error).message},{status:500});}
}

export async function POST(request:Request){
  try{
    if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'요청 출처를 확인할 수 없습니다.'},{status:403});
    if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
    const body=await request.json() as {action?:unknown;id?:unknown;quiz?:unknown};
    if(body.action==='create')return Response.json(await createManagedQuiz(body.quiz),{status:201});
    if(body.action==='update')return Response.json(await updateManagedQuiz(body.id,body.quiz));
    if(body.action==='delete')return Response.json(await deleteManagedQuiz(body.id));
    return Response.json({error:'지원하지 않는 작업입니다.'},{status:400});
  }catch(error){
    return Response.json({error:(error as Error).message},{status:400});
  }
}
