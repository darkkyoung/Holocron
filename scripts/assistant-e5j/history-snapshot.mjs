import {readFile,readdir,lstat} from 'node:fs/promises';
import {join} from 'node:path';
import {readPrivateJson} from '../assistant-mvp/historical-reader.mjs';
import {hash,fail,privateDirectory} from '../assistant-eval/budget.mjs';
// A sealed byte snapshot, NOT an alternative ledger auditor. Only used after
// the pinned official auditors pass. Exclude the new J state and SQLite read marks.
// Main DB and WAL, every old approval/journal/review receipt and unexpected files
// in the historical stores remain covered. No mtime-only acceptance or persisted cache.
export async function historicalSnapshot(path){
 const a=await readPrivateJson(path),root=a.value.stateDir;await privateDirectory(root,{existing:true});
 const rows=[['original-approval',a.hash]];let count=0,total=0;
 async function walk(relative,depth=0){
  if(depth>10||++count>2048)fail('HISTORY_SNAPSHOT_LIMIT');
  const p=join(root,relative),s=await lstat(p);if(s.isSymbolicLink())fail('HISTORY_SNAPSHOT_LAYOUT');
  if(s.isDirectory()){
   rows.push([relative,'directory',s.mode]);
   for(const n of (await readdir(p)).sort())if(!(relative.split('/').includes('local-d1')&&n.endsWith('.sqlite-shm')))await walk(relative+'/'+n,depth+1);
  }else{
   if(!s.isFile()||s.size>64*1024*1024||(total+=s.size)>256*1024*1024)fail('HISTORY_SNAPSHOT_LIMIT');
   const content=await readFile(p),after=await lstat(p);
   if(after.isSymbolicLink()||s.ino!==after.ino||s.mode!==after.mode||s.size!==content.length||s.size!==after.size||s.mtimeMs!==after.mtimeMs)fail('HISTORY_CHANGED');
   rows.push([relative,hash(content),s.mode]);
  }
 }
 for(const p of ['budget.jsonl','local-d1','mvp-smoke-e5b-v1','mvp-smoke-e5d-v1','mvp-smoke-e5f-v1','mvp-p44-e5h-v1'])await walk(p);
 return hash(JSON.stringify(rows));
}
