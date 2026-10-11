import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const dataModule=source=>`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;

async function transpile(path,replacements={}){
  let output=ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [specifier,url] of Object.entries(replacements))output=output.replaceAll(`'${specifier}'`,`'${url}'`).replaceAll(`"${specifier}"`,`"${url}"`);
  return dataModule(output);
}

export async function collectionSourceModule(policyUrl){
  const typesUrl=await transpile('../lib/collection/sources/types.ts');
  const archiveUrl=await transpile('../lib/collection/sources/archive.ts');
  const commonUrl=await transpile('../lib/collection/sources/common.ts',{'../policy':policyUrl,'./types':typesUrl});
  const metadataPolicyUrl=await transpile('../lib/collection/metadata-policy.ts',{'./policy':policyUrl,'./sources':typesUrl});
  const starWarsUrl=await transpile('../lib/collection/sources/starwars.ts',{'../policy':policyUrl,'./common':commonUrl,'./types':typesUrl});
  const swnnUrl=await transpile('../lib/collection/sources/swnn.ts',{'./archive':archiveUrl,'./common':commonUrl,'./types':typesUrl});
  const forbesUrl=await transpile('../lib/collection/sources/forbes.ts',{'../metadata-policy':metadataPolicyUrl,'./archive':archiveUrl,'./common':commonUrl,'./types':typesUrl});
  const sitemapsUrl=await transpile('../lib/collection/sources/sitemaps.ts',{'./archive':archiveUrl,'./common':commonUrl,'./types':typesUrl});
  const registryUrl=await transpile('../lib/collection/sources/registry.ts',{'./forbes':forbesUrl,'./sitemaps':sitemapsUrl,'./starwars':starWarsUrl,'./swnn':swnnUrl,'./types':typesUrl});
  return transpile('../lib/collection/sources.ts',{
    './sources/types':typesUrl,'./sources/archive':archiveUrl,'./sources/common':commonUrl,'./sources/starwars':starWarsUrl,
    './sources/swnn':swnnUrl,'./sources/forbes':forbesUrl,'./sources/registry':registryUrl,
  });
}
