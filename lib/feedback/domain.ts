export const FEEDBACK_MAX_LENGTH=1000;
export type FeedbackPage='news'|'works';
export type FeedbackInput={message:string;page:FeedbackPage};

export function parseFeedbackInput(value:unknown):FeedbackInput{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('메모 형식을 확인해 주세요.');
  const {message,page}=value as Record<string,unknown>;
  if(typeof message!=='string')throw new Error('메모를 입력해 주세요.');
  const normalized=message.trim();
  if(!normalized)throw new Error('메모를 입력해 주세요.');
  if(normalized.length>FEEDBACK_MAX_LENGTH)throw new Error(`메모는 ${FEEDBACK_MAX_LENGTH}자 이하로 입력해 주세요.`);
  if(page!=='news'&&page!=='works')throw new Error('페이지 정보를 확인해 주세요.');
  return {message:normalized,page};
}
