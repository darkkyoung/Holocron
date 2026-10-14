import {readFile} from 'node:fs/promises';
import ts from 'typescript';

// Node-only loader for the pure TypeScript backup modules; no Worker/D1 connection.
export async function backupModuleUrls(){
  const urls={};
  for(const name of ['format','credit-validation','validator','restore-plan','export']){
    let source=await readFile(new URL(`../lib/backup/${name}.ts`,import.meta.url),'utf8');
    for(const [dependency,url] of Object.entries(urls))source=source.replaceAll(`'./${dependency}'`,JSON.stringify(url));
    urls[name]=`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`;
  }
  return urls;
}
