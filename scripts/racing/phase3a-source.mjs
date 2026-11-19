import {readdir,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function sourceHash(){
 async function walk(path){const files=[];for(const e of await readdir(path,{withFileTypes:true})){const p=path+'/'+e.name;if(e.isDirectory()){if(e.name!=='phase3a')files.push(...await walk(p));}else if(e.name.endsWith('.ts'))files.push(p);}return files;}
 const files=[...await walk('lib/racing'),'lib/racing/phase3a/engine.ts'];
 const hash=createHash('sha256');for(const path of files.sort())hash.update(path+'\0').update(await readFile(path)).update('\0');return hash.digest('hex');
}
