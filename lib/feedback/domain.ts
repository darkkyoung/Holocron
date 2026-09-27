export const FEEDBACK_MAX_LENGTH=1000;
export const FEEDBACK_NICKNAME_MAX_LENGTH=80;
export type FeedbackPage='news'|'works';
export type FeedbackInput={message:string;page:FeedbackPage;nickname:string};

export function feedbackDisplayTag(sessionHash:string){
  const normalized=sessionHash.toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(normalized))throw new Error('피드백 사용자 세션을 확인할 수 없습니다.');
  return `HK-${normalized.slice(0,10).toUpperCase()}`;
}

export function parseFeedbackInput(value:unknown):FeedbackInput{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('메모 형식을 확인해 주세요.');
  const {message,page,nickname}=value as Record<string,unknown>;
  if(typeof nickname!=='string')throw new Error('유튜브 닉네임을 입력해 주세요.');
  const normalizedNickname=nickname.trim().replace(/\s+/g,' ');
  if(!normalizedNickname)throw new Error('유튜브 닉네임을 입력해 주세요.');
  if(normalizedNickname.length>FEEDBACK_NICKNAME_MAX_LENGTH)throw new Error(`유튜브 닉네임은 ${FEEDBACK_NICKNAME_MAX_LENGTH}자 이하로 입력해 주세요.`);
  if(typeof message!=='string')throw new Error('메모를 입력해 주세요.');
  const normalized=message.trim();
  if(!normalized)throw new Error('메모를 입력해 주세요.');
  if(normalized.length>FEEDBACK_MAX_LENGTH)throw new Error(`메모는 ${FEEDBACK_MAX_LENGTH}자 이하로 입력해 주세요.`);
  if(page!=='news'&&page!=='works')throw new Error('페이지 정보를 확인해 주세요.');
  return {message:normalized,page,nickname:normalizedNickname};
}
