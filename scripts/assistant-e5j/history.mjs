import {historyReader as pinnedReader} from '../assistant-e5h/history.mjs';
import {historicalSnapshot} from './history-snapshot.mjs';
import {fail} from '../assistant-eval/budget.mjs';
export const HISTORICAL='6fc7ac7b4ebbbd111ddcc16775fe0d1343501b0a';
export async function historyReader(){
 const reader=await pinnedReader({sourceRevision:HISTORICAL,workerPath:'scripts/assistant-e5j/history-worker.mjs',prefix:'holocron-e5j-history-'});
 let sealed;
 return {async read(path,mode='audit'){
  if(mode==='recheck'){
   let digest;try{digest=await historicalSnapshot(path);}catch{fail('HISTORY_CHANGED');}
   if(!sealed||sealed.path!==path||digest!==sealed.digest)fail('HISTORY_CHANGED');
   return structuredClone(sealed.report);
  }
  if(mode!=='audit')fail('INVALID_MODE');
  const before=await historicalSnapshot(path),report=await reader.read(path,'audit');
  if(before!==await historicalSnapshot(path))fail('HISTORY_CHANGED');
  sealed={path,digest:before,report:{...report,readonlySnapshotHash:before}};
  return structuredClone(sealed.report);
 },async close(){sealed=null;await reader.close();}};
}
