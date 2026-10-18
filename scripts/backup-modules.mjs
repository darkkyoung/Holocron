import {readFile} from 'node:fs/promises';
import ts from 'typescript';

// Node-only loader for the pure TypeScript backup modules; no Worker/D1 connection.
export async function backupModuleUrls(){
  const urls={};
  for(const name of ['policy-domain','format','credit-validation','policy-validation','validator','restore-plan','export']){
    let source=await readFile(new URL(name==='policy-domain'?'../lib/credit/policy-settings/domain.ts':`../lib/backup/${name}.ts`,import.meta.url),'utf8');
    if(urls['policy-domain'])source=source.replaceAll("'../credit/policy-settings/domain'",JSON.stringify(urls['policy-domain']));
    for(const [dependency,url] of Object.entries(urls))source=source.replaceAll(`'./${dependency}'`,JSON.stringify(url));
    urls[name]=`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`;
  }
  return urls;
}
