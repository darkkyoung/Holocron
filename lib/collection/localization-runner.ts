import type {Article} from '../news';
import {localizationPatch,type LocalizationOutput,type LocalizationPatch} from './localization-policy';

export type LocalizationBatchResult={
  candidates:number;succeeded:number;failed:number;skipped:number;deferred:number;
};

export async function runLocalizationBatch(
  candidates:readonly Article[],
  limit:number,
  localize:(article:Article)=>Promise<LocalizationOutput>,
  persist:(id:string,patch:LocalizationPatch)=>Promise<boolean>,
):Promise<LocalizationBatchResult>{
  const selected=candidates.slice(0,Math.max(0,Math.floor(limit)));
  let succeeded=0,failed=0,skipped=0;
  for(const article of selected){
    try{
      const output=await localize(article);
      if(await persist(article.id,localizationPatch(output)))succeeded++;
      else skipped++;
    }catch{failed++;}
  }
  return {candidates:candidates.length,succeeded,failed,skipped,deferred:Math.max(0,candidates.length-selected.length)};
}
