import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve,dirname,relative,join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {createRequire} from 'node:module';

// Test-only transpilation of dependency-injected domain modules, never deployed.
export async function loadTestModules(paths,{stubs={},externals=[]}={}){
  const root=resolve('.'),temp=await mkdtemp(join(tmpdir(),'holocron-domain-')),seen=new Set();
  async function compile(path){
    const source=resolve(root,path),name=relative(root,source).replace(/\.ts$/,'.mjs');
    if(seen.has(source))return name;
    seen.add(source);
    let output=ts.transpileModule(await readFile(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
    for(const match of [...output.matchAll(/from ['"]([^'"]+)['"]/g)]){
      let destination;
      if(Object.hasOwn(stubs,match[1])){
        destination=join(temp,'stub-'+Buffer.from(match[1]).toString('hex')+'.mjs');
        await writeFile(destination,stubs[match[1]]);
      }else if(externals.includes(match[1])){
        destination=createRequire(resolve(root,'package.json')).resolve(match[1]);
      }else{
        if(!match[1].startsWith('.')&&!match[1].startsWith('@/'))throw new Error(`Non-local test dependency: ${match[1]}`);
        destination=join(temp,await compile(match[1].startsWith('@/')?resolve(root,match[1].slice(2)+'.ts'):resolve(dirname(source),match[1]+'.ts')));
      }
      output=output.replace(match[0],match[0].replace(match[1],pathToFileURL(destination).href));
    }
    await mkdir(dirname(join(temp,name)),{recursive:true});await writeFile(join(temp,name),output);return name;
  }
  const result={};
  try{for(const path of paths)result[path]=await import(pathToFileURL(join(temp,await compile(path))));}
  catch(error){await rm(temp,{recursive:true,force:true});throw error;}
  return {modules:result,dispose:()=>rm(temp,{recursive:true,force:true})};
}
