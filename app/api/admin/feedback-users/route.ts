import {getAdminSession} from '@/lib/admin/session';
import {listFeedbackUsers,setFeedbackUserBanned} from '@/lib/feedback/users-repository';

export async function GET(){
  try{
    if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
    return Response.json({users:await listFeedbackUsers()});
  }catch(error){return Response.json({error:(error as Error).message},{status:400});}
}

export async function POST(request:Request){
  try{
    if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'요청 출처를 확인할 수 없습니다.'},{status:403});
    if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401});
    const body=await request.json() as {tag?:unknown;banned?:unknown};
    if(typeof body.tag!=='string'||typeof body.banned!=='boolean')throw new Error('피드백 사용자 설정을 확인해 주세요.');
    await setFeedbackUserBanned(body.tag,body.banned,new Date());
    return Response.json({users:await listFeedbackUsers()});
  }catch(error){return Response.json({error:(error as Error).message},{status:400});}
}
