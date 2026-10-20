import {readFile,readdir,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {historicalSnapshot as olderSnapshot} from '../assistant-e5j/history-snapshot.mjs';
import {historyReader as pinnedReader} from '../assistant-e5h/history.mjs';
import {readPrivateJson} from '../assistant-mvp/historical-reader.mjs';
import {hash,fail,privateDirectory} from '../assistant-eval/budget.mjs';
import {HISTORICAL} from './revision.mjs';
// Extend the existing bounded B/D/F/H byte seal to the J store only. The new
// Pilot is excluded. SQLite shared-memory read marks are not durable history.
export async function snapshot(path){
 const older=await olderSnapshot(path),a=await readPrivateJson(path),root=join(a.value.stateDir,'mvp-p44-e5j-v1');await privateDirectory(root,{existing:true});
 const rows=[];let count=0,total=0;
 async function walk(relative,depth=0){
  if(depth>10||++count>2048)fail('HISTORY_SNAPSHOT_LIMIT');const p=join(root,relative),s=await lstat(p);if(s.isSymbolicLink())fail('HISTORY_SNAPSHOT_LAYOUT');
  if(s.isDirectory()){rows.push([relative,'directory',s.mode]);for(const n of (await readdir(p)).sort())if(!(relative.split('/').includes('local-d1')&&n.endsWith('.sqlite-shm')))await walk(join(relative,n),depth+1);}
  else{if(!s.isFile()||s.size>64*1024*1024||(total+=s.size)>256*1024*1024)fail('HISTORY_SNAPSHOT_LIMIT');const b=await readFile(p),after=await lstat(p);if(after.isSymbolicLink()||s.ino!==after.ino||s.mode!==after.mode||s.size!==b.length||s.size!==after.size||s.mtimeMs!==after.mtimeMs)fail('HISTORY_CHANGED');rows.push([relative,hash(b),s.mode]);}
 }
 await walk('');return hash(JSON.stringify({older,rows}));
}
export async function historyReader(){
 const reader=await pinnedReader({sourceRevision:HISTORICAL,workerPath:'scripts/assistant-e6b/history-worker.mjs',prefix:'holocron-e6b-history-'});let sealed;
 return {async read(path,mode='audit'){
  if(mode==='recheck'){let digest;try{digest=await snapshot(path);}catch{fail('HISTORY_CHANGED');}if(!sealed||sealed.path!==path||sealed.digest!==digest)fail('HISTORY_CHANGED');return structuredClone(sealed.report);}
  if(mode!=='audit')fail('INVALID_MODE');const before=await snapshot(path),report=await reader.read(path,'audit');if(before!==await snapshot(path))fail('HISTORY_CHANGED');sealed={path,digest:before,report:{...report,readonlySnapshotHash:before}};return structuredClone(sealed.report);
 },async close(){sealed=null;await reader.close();}};
}
