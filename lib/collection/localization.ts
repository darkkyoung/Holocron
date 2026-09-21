import {config} from '../news';
import {localizeWithOpenAi} from './openai';
import {isLocalizationCandidate} from './localization-policy';
import {runLocalizationBatch} from './localization-runner';
import {listPublishedLocalizationCandidates,updateLocalizationFields} from './repository';

export const MAX_LOCALIZATION_BACKFILL=15;

export async function backfillPublishedLocalization(now=Date.now()){
  const stored=await listPublishedLocalizationCandidates(now);
  const candidates=stored.filter(article=>isLocalizationCandidate(article,now));
  if(!candidates.length)return {candidates:0,succeeded:0,failed:0,skipped:0,deferred:0,report:['기존 영문 기사 한글화: 대상 없음']};
  const {key,model}=config();
  const result=await runLocalizationBatch(
    candidates,
    MAX_LOCALIZATION_BACKFILL,
    article=>localizeWithOpenAi(article.title,article.summary,key,model,{source:article.source,url:article.url,published:article.published}),
    updateLocalizationFields,
  );
  const skipped=result.skipped?` · ${result.skipped}건 상태 변경 없음`:'';
  return {...result,report:[`기존 영문 기사 한글화: ${result.succeeded}건 성공 · ${result.failed}건 실패 · ${result.deferred}건 다음 실행으로 이월${skipped}`]};
}
