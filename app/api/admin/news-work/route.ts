import {getAdminSession} from '@/lib/admin/session';
import {backfillWorkRelations,editArticleWork,getArticleWorkState} from '@/lib/news-work/service';

const headers={'Cache-Control':'private, no-store','Vary':'Cookie'};
export async function GET(request:Request){
  if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401,headers});
  const id=new URL(request.url).searchParams.get('article');
  if(!id||id.length>200)return Response.json({error:'기사를 확인해 주세요.'},{status:400,headers});
  try{return Response.json(await getArticleWorkState(id),{headers});}catch{return Response.json({error:'관련 작품을 불러오지 못했습니다.'},{status:500,headers});}
}
export async function POST(request:Request){
  if(!await getAdminSession())return Response.json({error:'관리자 로그인이 필요합니다.'},{status:401,headers});
  if(request.headers.get('origin')!==new URL(request.url).origin)return Response.json({error:'요청 출처를 확인해 주세요.'},{status:403,headers});
  try{
    const body=await request.json() as {action?:unknown;articleId?:unknown;workId?:unknown;state?:unknown;cursor?:unknown};
    if(body.action==='backfill')return Response.json(await backfillWorkRelations(body.cursor),{headers});
    if(body.action==='set')return Response.json(await editArticleWork(body.articleId,body.workId,body.state),{headers});
    return Response.json({error:'지원하지 않는 작업입니다.'},{status:400,headers});
  }catch{return Response.json({error:'관련 작품 처리에 실패했습니다. 기사와 작품이 존재하는지 확인해 주세요.'},{status:400,headers});}
}
