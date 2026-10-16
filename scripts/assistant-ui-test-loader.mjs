import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {resolve,dirname,relative,join,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import ts from 'typescript';

// Local test-only transpiler: preserves real JSX rendering and injected HTTP/React dependencies.
export async function loadUiModules(paths,{stubs={}}={}){
  const root=resolve('.'),temp=await mkdtemp(join(tmpdir(),'holocron-assistant-ui-')),seen=new Set(),require=createRequire(resolve(root,'package.json'));
  async function compile(path){
    const source=resolve(root,path),name=relative(root,source).replace(/\.(tsx?|css)$/u,'.mjs');
    if(seen.has(source))return name;
    seen.add(source);
    if(extname(source)==='.css'){
      await mkdir(dirname(join(temp,name)),{recursive:true});
      await writeFile(join(temp,name),'export default new Proxy({}, {get:(_target,key)=>String(key)});');
      return name;
    }
    let output=ts.transpileModule(await readFile(source,'utf8'),{fileName:source,compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    for(const match of [...output.matchAll(/from ['"]([^'"]+)['"]|import ['"]([^'"]+)['"]/gu)]){
      const specifier=match[1]??match[2];let destination;
      if(Object.hasOwn(stubs,specifier)){
        destination=join(temp,'stub-'+Buffer.from(specifier).toString('hex')+'.mjs');await writeFile(destination,stubs[specifier]);
      }else if(specifier.startsWith('.')||specifier.startsWith('@/')){
        const target=specifier.startsWith('@/')?resolve(root,specifier.slice(2)):resolve(dirname(source),specifier);
        const extension=extname(target),resolved=extension?target:await Promise.any(['.tsx','.ts','.css'].map(async suffix=>{await readFile(target+suffix);return target+suffix;}));
        destination=join(temp,await compile(resolved));
      }else destination=require.resolve(specifier);
      output=output.replace(match[0],match[0].replace(specifier,pathToFileURL(destination).href));
    }
    await mkdir(dirname(join(temp,name)),{recursive:true});await writeFile(join(temp,name),output);return name;
  }
  const modules={};
  try{for(const path of paths)modules[path]=await import(pathToFileURL(join(temp,await compile(path))));}
  catch(error){await rm(temp,{recursive:true,force:true});throw error;}
  return {modules,dispose:()=>rm(temp,{recursive:true,force:true})};
}
