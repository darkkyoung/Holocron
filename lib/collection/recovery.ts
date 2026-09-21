import {config,list} from '@/lib/news';
import {processWithOpenAi} from './openai';
import {failedRecoveryPatch,successfulRecoveryPatch} from './recovery-policy';
import {listAiFailedReviewArticles,markAiRecoveryFailure,updateAiRecoverySuccess} from './repository';

export const MAX_AI_RECOVERY_ARTICLES=20;

export type AiRecoveryResult={
  limit:number;
  candidates:number;
  succeeded:number;
  failed:number;
  skipped:number;
  report:string[];
};

export async function retryFailedAiArticles(limit=MAX_AI_RECOVERY_ARTICLES):Promise<AiRecoveryResult>{
  const boundedLimit=Math.max(1,Math.min(MAX_AI_RECOVERY_ARTICLES,Math.floor(limit)));
  const articles=await list();
  const candidates=await listAiFailedReviewArticles(boundedLimit);
  const {key,model}=config();
  let succeeded=0;
  let failed=0;
  let skipped=0;
  const failures:string[]=[];

  for(const stored of candidates){
    const article=articles.find(item=>item.id===stored.id)??stored;
    try{
      const output=await processWithOpenAi(article.title,article.summary,articles,key,model,{source:article.source,url:article.url,published:article.published});
      try{
        if(await updateAiRecoverySuccess(article.id,successfulRecoveryPatch(output)))succeeded++;
        else skipped++;
      }catch{skipped++;}
    }catch(error){
      const patch=failedRecoveryPatch(error);
      try{
        if(await markAiRecoveryFailure(article.id,patch.reason)){
          failed++;
          failures.push(`${article.title}: ${patch.reason}`);
        }else skipped++;
      }catch{skipped++;}
    }
  }

  const report=[`AI 실패 재처리: ${candidates.length}건 대상 · ${succeeded}건 공개 · ${failed}건 검토 유지 · ${skipped}건 상태 변경 없음`];
  report.push(`한 번에 최대 ${MAX_AI_RECOVERY_ARTICLES}건까지 처리합니다.`);
  report.push(...failures);
  return {limit:boundedLimit,candidates:candidates.length,succeeded,failed,skipped,report};
}
