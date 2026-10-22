import {readFile} from 'node:fs/promises';
import ts from 'typescript';

// Node-only loader for the pure TypeScript backup modules; no Worker/D1 connection.
export async function backupModuleUrls(){
  const urls={};
  for(const name of ['visibility-domain','announcement-image','announcement-domain','policy-domain','format','credit-validation','policy-validation','validator','restore-plan','export']){
    let source=await readFile(new URL(name==='visibility-domain'?'../lib/site-visibility/domain.ts':name==='announcement-image'?'../lib/announcement/image.ts':name==='announcement-domain'?'../lib/announcement/domain.ts':name==='policy-domain'?'../lib/credit/policy-settings/domain.ts':`../lib/backup/${name}.ts`,import.meta.url),'utf8');
    if(urls['visibility-domain'])source=source.replaceAll("'../site-visibility/domain'",JSON.stringify(urls['visibility-domain']));
    if(urls['announcement-image'])source=source.replaceAll("'./image'",JSON.stringify(urls['announcement-image']));
    if(urls['announcement-domain'])source=source.replaceAll("'../announcement/domain'",JSON.stringify(urls['announcement-domain']));
    if(urls['policy-domain'])source=source.replaceAll("'../credit/policy-settings/domain'",JSON.stringify(urls['policy-domain']));
    for(const [dependency,url] of Object.entries(urls))source=source.replaceAll(`'./${dependency}'`,JSON.stringify(url));
    urls[name]=`data:text/javascript;base64,${Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64')}`;
  }
  return urls;
}
