import {anonymousSession,withAnonymousSession} from '@/lib/beta/anonymous-session';
import {getQuizParticipation,submitQuizVote} from '@/lib/quiz/service';

export async function GET(request:Request){
  try{
    const quizId=new URL(request.url).searchParams.get('quizId');
    if(!quizId)return Response.json({error:'퀴즈를 확인해 주세요.'},{status:400});
    const session=await anonymousSession(request);
    const data=await getQuizParticipation(quizId,session.sessionHash);
    return withAnonymousSession(Response.json(data),session.setCookie);
  }catch(error){
    return Response.json({error:(error as Error).message},{status:400});
  }
}

export async function POST(request:Request){
  try{
    if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return Response.json({error:'JSON 요청만 지원합니다.'},{status:415});
    const session=await anonymousSession(request);
    const body=await request.json();
    const data=await submitQuizVote(body,session.sessionHash);
    return withAnonymousSession(Response.json(data),session.setCookie);
  }catch(error){
    return Response.json({error:(error as Error).message},{status:400});
  }
}
