import {QUIZ_MAX_OPTIONS,isQuizStatus,type QuizDraft} from './types';

function cleanText(value:unknown,label:string,max:number,required=true){
  if(typeof value!=='string')throw new Error(`${label}을 확인해 주세요.`);
  const normalized=value.trim();
  if(required&&!normalized)throw new Error(`${label}을 입력해 주세요.`);
  if(normalized.length>max)throw new Error(`${label}은 ${max}자 이하로 입력해 주세요.`);
  return normalized;
}

function cleanUrl(value:unknown,label:string){
  if(value===null||value===undefined||value==='')return null;
  const normalized=cleanText(value,label,1200,false);
  if(!normalized)return null;
  let url:URL;
  try{url=new URL(normalized);}catch{throw new Error(`${label} URL을 확인해 주세요.`);}
  if(url.protocol!=='https:'&&url.protocol!=='http:')throw new Error(`${label}는 http/https URL만 사용할 수 있습니다.`);
  return url.toString();
}

function cleanPublishAt(value:unknown,status:QuizDraft['status']){
  if(value===null||value===undefined||value===''){
    if(status==='scheduled')throw new Error('예약 공개 시각을 입력해 주세요.');
    return null;
  }
  if(typeof value!=='string'||Number.isNaN(Date.parse(value)))throw new Error('공개 시각을 확인해 주세요.');
  return new Date(value).toISOString();
}

export function parseQuizDraft(value:unknown):QuizDraft{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('퀴즈 형식을 확인해 주세요.');
  const input=value as Record<string,unknown>;
  if(!isQuizStatus(input.status))throw new Error('퀴즈 상태를 확인해 주세요.');
  if(!Array.isArray(input.options)||input.options.length!==QUIZ_MAX_OPTIONS)throw new Error(`선택지는 정확히 ${QUIZ_MAX_OPTIONS}개를 입력해 주세요.`);
  const options=input.options.map((raw,index)=>{
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error(`${index+1}번 선택지를 확인해 주세요.`);
    const option=raw as Record<string,unknown>;
    return {
      label:cleanText(option.label,`${index+1}번 선택지`,160),
      imageUrl:cleanUrl(option.imageUrl,`${index+1}번 선택지 이미지`),
      isCorrect:option.isCorrect===true,
    };
  });
  if(options.filter(option=>option.isCorrect).length!==1)throw new Error('정답은 정확히 하나만 지정해 주세요.');
  return {
    title:cleanText(input.title,'퀴즈 제목',140),
    question:cleanText(input.question,'퀴즈 문제',600),
    heroImageUrl:cleanUrl(input.heroImageUrl,'메인 이미지'),
    explanation:cleanText(input.explanation,'정답 해설',2400),
    status:input.status,
    publishAt:cleanPublishAt(input.publishAt,input.status),
    options,
  };
}

export function parseQuizVote(value:unknown){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('응답 형식을 확인해 주세요.');
  const {quizId,optionId}=value as Record<string,unknown>;
  if(typeof quizId!=='string'||!quizId.trim())throw new Error('퀴즈를 확인해 주세요.');
  if(typeof optionId!=='string'||!optionId.trim())throw new Error('선택지를 확인해 주세요.');
  return {quizId:quizId.trim(),optionId:optionId.trim()};
}
