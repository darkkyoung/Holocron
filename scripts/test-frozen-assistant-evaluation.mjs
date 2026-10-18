import {mkdtemp,symlink,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

// Historical campaign tests require the historical Draft-capable pipeline.
// Never rebind their frozen criteria/approval to today's smaller product scope.
const revision='2ec1a2b05862f7ccb4a9b7426c59f14268411e02';
const suites=new Set(['assistant-evaluation','assistant-output-diagnostics','assistant-evaluation-revision','assistant-evaluation-clock']);
const [suite,...extra]=process.argv.slice(2);
if(!suites.has(suite)||extra.length)throw Error('UNKNOWN_FROZEN_SUITE');
const root=process.cwd(),temp=await mkdtemp(join(tmpdir(),'holocron-frozen-test-')),checkout=join(temp,'checkout');
const git=(args)=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});if(r.status!==0)throw Error('FROZEN_REVISION_UNAVAILABLE');};
let added=false;
try{
  git(['worktree','add','--detach',checkout,revision]);added=true;
  await symlink(resolve(root,'node_modules'),join(checkout,'node_modules'),'dir');
  // Keep test assertions maintained (including timestamp precision fixes), but
  // execute against the exact reviewed implementation, fixture and manifest.
  const script=`scripts/test-${suite}.mjs`;
  await copyFile(join(root,script),join(checkout,script));
  console.log(`HISTORICAL MOCK REGRESSION ${suite} at ${revision}; NOT current MVP acceptance; no PC campaign.`);
  const result=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs',script],{cwd:checkout,stdio:'inherit',timeout:240000});
  if(result.status!==0)process.exitCode=1;
}finally{
  if(added)git(['worktree','remove','--force',checkout]);
  await rm(temp,{recursive:true,force:true});
}
