import {anonymousSession,withAnonymousSession} from '@/lib/beta/anonymous-session';
import {getQuizParticipation,submitQuizVote} from '@/lib/quiz/service';
import {parseQuizVote} from '@/lib/quiz/validation';
import {db} from '@/lib/news';
import {resolveGuest} from '@/lib/identity/service';
import {guestSigningSecret} from '@/lib/identity/config';
import {privateJson,publicError,publicJson,PublicMutationError} from '@/lib/credit/rewards/http';

export async function GET(request:Request){
  try{
    const quizId=new URL(request.url).searchParams.get('quizId');
    if(!quizId||quizId.length>160)return privateJson({error:'퀴즈를 확인해 주세요.'},400);
    const session=await anonymousSession(request);
    const data=await getQuizParticipation(quizId,session.sessionHash);
    return withAnonymousSession(privateJson(data),session.setCookie);
  }catch{return privateJson({error:'퀴즈 상태를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'},503);}
}

export async function POST(request:Request){
  try{
    const body=await publicJson(request);
    let vote;
    try{vote=parseQuizVote(body);}catch{throw new PublicMutationError(400,'퀴즈와 선택지를 확인해 주세요.');}
    const owner=await resolveGuest(request,db(),guestSigningSecret());
    if(!owner)throw new PublicMutationError(409,'Guest Credit을 먼저 준비해 주세요. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
    const session=await anonymousSession(request);
    const data=await submitQuizVote(vote,session.sessionHash,owner);
    return withAnonymousSession(privateJson(data),session.setCookie);
  }catch(error){return publicError(error);}
}
