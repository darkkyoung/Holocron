import {effectiveQuizStatus,type AdminQuiz,type QuizDraft} from './types';
import {parseQuizDraft,parseQuizVote} from './validation';
import {
  buildQuizResult,createQuizRecord,deleteQuizRecord,hasQuizResponses,insertQuizResponse,quizResponseCount,
  listAdminQuizzes,listPublicQuizSummaries,loadAdminQuiz,loadLatestPublicQuiz,loadPublicQuiz,
  loadQuizResponse,optionBelongsToQuiz,updateQuizMetadata,updateQuizRecord,
} from './repository';

function sameOptions(existing:AdminQuiz,draft:QuizDraft){
  return existing.options.length===draft.options.length&&existing.options.every((option,index)=>{
    const next=draft.options[index];
    return !!next&&option.label===next.label&&option.imageUrl===next.imageUrl&&option.isCorrect===next.isCorrect;
  });
}

export async function getQuizPageState(requestedId?:string|null,now=new Date()){
  const archive=await listPublicQuizSummaries(now,30);
  const selected=requestedId?await loadPublicQuiz(requestedId,now):await loadLatestPublicQuiz(now);
  return {quiz:selected,archive};
}

export async function getQuizManagementState(now=new Date()){
  const quizzes=await listAdminQuizzes();
  return {quizzes:await Promise.all(quizzes.map(async quiz=>({...quiz,effectiveStatus:effectiveQuizStatus(quiz.status,quiz.publishAt,now),responseCount:await quizResponseCount(quiz.id)}))),now:now.toISOString()};
}

export async function createManagedQuiz(value:unknown,now=new Date()){
  const draft=parseQuizDraft(value);
  return createQuizRecord(crypto.randomUUID(),draft,now);
}

export async function updateManagedQuiz(id:unknown,value:unknown,now=new Date()){
  if(typeof id!=='string'||!id)throw new Error('퀴즈를 확인해 주세요.');
  const draft=parseQuizDraft(value);
  const existing=await loadAdminQuiz(id);
  if(!existing)throw new Error('퀴즈를 찾을 수 없습니다.');
  if(await hasQuizResponses(id)){
    if(!sameOptions(existing,draft))throw new Error('이미 참여 기록이 있는 퀴즈는 선택지나 정답을 변경할 수 없습니다. 제목·문제·이미지·해설·공개 설정만 수정해 주세요.');
    return updateQuizMetadata(id,draft,now);
  }
  return updateQuizRecord(id,draft,now);
}

export async function deleteManagedQuiz(id:unknown){
  if(typeof id!=='string'||!id)throw new Error('퀴즈를 확인해 주세요.');
  return deleteQuizRecord(id);
}

export async function getQuizParticipation(quizId:string,sessionHash:string,now=new Date()){
  const quiz=await loadPublicQuiz(quizId,now);
  if(!quiz)throw new Error('현재 공개된 퀴즈가 아닙니다.');
  const response=await loadQuizResponse(quizId,sessionHash);
  return {quiz,result:response?await buildQuizResult(quizId,response.optionId):null};
}

export async function submitQuizVote(value:unknown,sessionHash:string,now=new Date()){
  const {quizId,optionId}=parseQuizVote(value);
  const quiz=await loadPublicQuiz(quizId,now);
  if(!quiz)throw new Error('현재 공개된 퀴즈가 아닙니다.');
  if(!await optionBelongsToQuiz(quizId,optionId))throw new Error('선택지를 확인해 주세요.');
  const response=await insertQuizResponse(quizId,sessionHash,optionId,now);
  if(!response)throw new Error('응답을 저장하지 못했습니다.');
  return {quiz,result:await buildQuizResult(quizId,response.optionId)};
}
