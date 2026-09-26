import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

let assertions=0;
function check(value,message){assert.ok(value,message);assertions++;}
function equal(actual,expected,message){assert.equal(actual,expected,message);assertions++;}

async function source(path){return readFile(new URL(path,import.meta.url),'utf8');}
async function transpile(path,replacements={}){
  let output=ts.transpileModule(await source(path),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [specifier,url] of Object.entries(replacements))output=output.replaceAll(`'${specifier}'`,`'${url}'`).replaceAll(`"${specifier}"`,`"${url}"`);
  return `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
}

const authUrl=await transpile('../lib/collection/scheduler-auth.ts');
const auth=await import(authUrl);
equal(auth.authorizeScheduler(null,'server-secret'),'unauthorized','missing Authorization is rejected');
equal(auth.authorizeScheduler('Bearer wrong','server-secret'),'unauthorized','wrong bearer token is rejected');
equal(auth.authorizeScheduler('Bearer server-secret','server-secret'),'authorized','correct bearer token is accepted');
equal(auth.authorizeScheduler('Bearer server-secret',undefined),'unconfigured','missing server secret fails closed');

async function endpointModule(secret,runSource='export async function runCollection(){return {status:"success",count:2,startedAt:"2026-09-26T09:17:00.000Z",finishedAt:"2026-09-26T09:18:00.000Z"}}'){
  const envSource=`export const env=${secret===undefined?'{}':JSON.stringify({HOLOCRON_SCHEDULER_SECRET:secret})}`;
  const envUrl='data:text/javascript;base64,'+Buffer.from(envSource).toString('base64');
  const runStub='data:text/javascript;base64,'+Buffer.from(runSource).toString('base64');
  return import(await transpile('../app/api/scheduled/collect/route.ts',{
    'cloudflare:workers':envUrl,
    '@/lib/collection/scheduler-auth':authUrl,
    '@/lib/collection/run':runStub,
  }));
}

const unconfiguredEndpoint=await endpointModule(undefined,'export async function runCollection(){throw new Error("must not collect")}');
equal((await unconfiguredEndpoint.POST(new Request('https://example.test/api/scheduled/collect',{method:'POST'}))).status,503,'missing server secret returns 503');
const protectedEndpoint=await endpointModule('server-secret','export async function runCollection(){throw new Error("must not collect")}');
equal((await protectedEndpoint.POST(new Request('https://example.test/api/scheduled/collect',{method:'POST'}))).status,401,'missing token returns 401');
equal((await protectedEndpoint.POST(new Request('https://example.test/api/scheduled/collect',{method:'POST',headers:{Authorization:'Bearer wrong'}}))).status,401,'wrong token returns 401');
equal((await protectedEndpoint.GET()).status,405,'GET returns 405 without collecting');
const workingEndpoint=await endpointModule('server-secret');
const accepted=await workingEndpoint.POST(new Request('https://example.test/api/scheduled/collect',{method:'POST',headers:{Authorization:'Bearer server-secret'}}));
equal(accepted.status,200,'correct token invokes scheduled collection');
equal((await accepted.json()).status,'success','successful endpoint returns a safe run status');

const stubCollect='data:text/javascript;base64,'+Buffer.from('export async function collect(){throw new Error("default collector must be replaced")};').toString('base64');
const stubRepository='data:text/javascript;base64,'+Buffer.from('export async function acquireCollectionLock(){return false};export async function releaseCollectionLock(){};export async function saveCollectionRun(){};').toString('base64');
const runUrl=await transpile('../lib/collection/run.ts',{'@/lib/collect':stubCollect,'./run-repository':stubRepository});
const runner=await import(runUrl);
equal(runner.COLLECTION_LOCK_LEASE_MS,20*60*1000,'lease duration is twenty minutes');

function result(overrides={}){
  return {ok:true,count:2,repaired:0,activeSources:1,sources:[{duplicate:3,sourceFailure:'',aiFailure:0,processingFailure:0,persistenceFailure:0}],localization:{candidates:0,succeeded:0,failed:0,skipped:0,deferred:0,report:[]},report:['done'],...overrides};
}
function harness(collect=async()=>result()){
  let lock=null;let time=Date.parse('2026-09-26T09:17:00Z');const saved=[];let ownerIndex=0;
  const repo={
    async acquire(owner,trigger,acquiredAt,expiresAt){if(!lock||lock.expiresAt<=acquiredAt){lock={owner,trigger,expiresAt};return true;}return false;},
    async release(owner){if(lock?.owner===owner)lock=null;},
    async save(metadata){saved.push(structuredClone(metadata));},
  };
  return {saved,repo,get lock(){return lock;},advance(ms){time+=ms;},deps:{collect,...repo,now:()=>new Date(time),createOwner:()=>`owner-${++ownerIndex}`}};
}

const manual=harness();
const manualResult=await runner.runCollectionWith('manual',manual.deps);
equal(manualResult.status,'success','manual run acquires an empty lock');
equal(manualResult.trigger,'manual','manual trigger is persisted');
equal(manualResult.duplicateCount,3,'existing duplicate count is preserved');
equal(manual.lock,null,'successful run releases the lock');
check(manual.saved.some(item=>item.status==='running'),'run start metadata is stored');
equal(manual.saved.at(-1).status,'success','successful final metadata is stored');

const scheduled=harness();
const scheduledResult=await runner.runCollectionWith('scheduled',scheduled.deps);
equal(scheduledResult.status,'success','scheduled run acquires an empty lock');
equal(scheduled.saved.at(-1).trigger,'scheduled','scheduled trigger is persisted');

let releaseCollector;
let signalStarted;
const started=new Promise(resolve=>{signalStarted=resolve;});
const concurrent=harness(async()=>{signalStarted();await new Promise(resolve=>{releaseCollector=resolve;});return result();});
const activeManual=runner.runCollectionWith('manual',concurrent.deps);
await started;
const skippedScheduled=await runner.runCollectionWith('scheduled',concurrent.deps);
equal(skippedScheduled.status,'skipped','manual active makes scheduled run skip');
equal(skippedScheduled.reason,'collection_in_progress','contention has a stable reason');
releaseCollector();await activeManual;

let releaseScheduled;
let signalScheduled;
const scheduledStarted=new Promise(resolve=>{signalScheduled=resolve;});
const reverse=harness(async()=>{signalScheduled();await new Promise(resolve=>{releaseScheduled=resolve;});return result();});
const activeScheduled=runner.runCollectionWith('scheduled',reverse.deps);
await scheduledStarted;
const skippedManual=await runner.runCollectionWith('manual',reverse.deps);
equal(skippedManual.status,'skipped','scheduled active makes manual run skip');
check(skippedManual.report[0].includes('다른 수집 작업'),'manual contention message is understandable');
releaseScheduled();await activeScheduled;

const stale=harness();
await stale.repo.acquire('dead-owner','scheduled','2026-09-26T08:00:00.000Z','2026-09-26T09:00:00.000Z');
const reclaimed=await runner.runCollectionWith('manual',stale.deps);
equal(reclaimed.status,'success','expired stale lock can be reclaimed');

const failed=harness(async()=>{throw new Error('fixture failure');});
await assert.rejects(()=>runner.runCollectionWith('scheduled',failed.deps),/fixture failure/);assertions++;
equal(failed.lock,null,'failed run releases its owned lock');
equal(failed.saved.at(-1).status,'failed','failed metadata is stored');

const ownership=harness();
await ownership.repo.acquire('old-owner','manual','2026-09-26T08:00:00.000Z','2026-09-26T09:00:00.000Z');
await ownership.repo.acquire('new-owner','scheduled','2026-09-26T09:17:00.000Z','2026-09-26T09:37:00.000Z');
await ownership.repo.release('old-owner');
equal(ownership.lock.owner,'new-owner','old owner cannot release a newer lease');

const endpoint=await source('../app/api/scheduled/collect/route.ts');
const manageService=await source('../lib/admin/service.ts');
const collectSource=await source('../lib/collect.ts');
const lockRepository=await source('../lib/collection/run-repository.ts');
const workflow=await source('../.github/workflows/scheduled-collection.yml');
const panel=await source('../app/admin/panel.tsx');
const rail=await source('../components/admin/admin-command-rail.tsx');

check(/export async function GET\(\).*405/.test(endpoint),'GET cannot trigger collection');
check(/authorizeScheduler\(request\.headers\.get\('authorization'\),secret\)/.test(endpoint),'endpoint checks the Authorization header');
check(/runCollection\('scheduled'\)/.test(endpoint),'scheduled endpoint uses the shared runner');
check(!endpoint.includes('/api/manage'),'scheduler never calls the admin HTTP endpoint');
check(!endpoint.includes('HOLOCRON_ADMIN_'),'scheduler does not reuse administrator credentials');
check(/action==='collect'\)return runCollection\('manual'\)/.test(manageService),'manual collection uses the shared runner');
check(!/setting\('last_collection'/.test(collectSource),'collector no longer duplicates run metadata persistence');
check(/INSERT INTO collection_locks[\s\S]*ON CONFLICT\(name\) DO UPDATE[\s\S]*WHERE collection_locks\.expires_at<=\?/.test(lockRepository),'lock acquisition is one atomic SQLite statement');
check(/DELETE FROM collection_locks WHERE name=\? AND owner=\?/.test(lockRepository),'release verifies the lease owner');
check(/schedule:[\s\S]*cron: '17 \*\/6 \* \* \*'/.test(workflow),'workflow runs every six hours with a minute offset');
check(/workflow_dispatch:/.test(workflow),'workflow supports manual dispatch');
check(/permissions:[\s\S]*contents: read/.test(workflow),'workflow has read-only repository permission');
check(/secrets\.HOLOCRON_SCHEDULER_SECRET/.test(workflow),'workflow reads only the scheduler repository secret');
check(/--request POST/.test(workflow),'workflow uses POST');
check(/--max-redirs 0/.test(workflow),'workflow refuses redirects');
check(workflow.includes('https://holocron-korea.hyperspace0729.chatgpt.site/api/scheduled/collect'),'workflow targets the canonical production endpoint');
check(!/OPENAI_API_KEY|HOLOCRON_ADMIN_PASSWORD/.test(workflow),'workflow contains no application or admin secret');
check(!workflow.includes('checkout'),'scheduled job does not checkout or build the application');
check(/lastCollection/.test(panel)&&/자동 수집/.test(rail)&&/수동 수집/.test(rail),'admin UI distinguishes scheduled and manual last runs');
check(!endpoint.includes('server-secret'),'test secret is not present in endpoint source');

console.log(`Scheduled collection: ${assertions} assertions passed`);
