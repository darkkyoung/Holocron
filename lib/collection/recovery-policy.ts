import type {Article,ArticleStatus} from '@/lib/news';
import type {AiOutput} from './openai';

export const AI_FAILURE_REASON_PREFIX='AI 처리 실패:';

export function isAiFailureReason(reason:string){
  return reason.trimStart().startsWith(AI_FAILURE_REASON_PREFIX);
}

export function isRetryableAiArticle(article:Pick<Article,'status'|'reason'|'statusOverride'|'topicOverride'>){
  return article.status==='review'
    && isAiFailureReason(article.reason)
    && article.statusOverride===null
    && article.topicOverride===null;
}

export type RecoveryArticlePatch={
  title:string;
  summary:string;
  category:string;
  topic:string;
  status:ArticleStatus;
  reason:string;
};

export function successfulRecoveryPatch(output:AiOutput):RecoveryArticlePatch{
  return {title:output.title,summary:output.summary,category:output.category,topic:output.topic,status:'published',reason:''};
}

export function failedRecoveryReason(error:unknown){
  return `${AI_FAILURE_REASON_PREFIX} ${error instanceof Error?error.message:'알 수 없는 오류'}`;
}

export function failedRecoveryPatch(error:unknown):Pick<RecoveryArticlePatch,'status'|'reason'>{
  return {status:'review',reason:failedRecoveryReason(error)};
}
