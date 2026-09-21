import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function loadPureModule(path){
  const source=await readFile(new URL(path,import.meta.url),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const {applyAutomaticDecision,buildAdminPatches}=await loadPureModule('../lib/admin/override-policy.ts');
const {authorizeAdminEmail,normalizeEmail}=await loadPureModule('../lib/admin/authorization.ts');
const {buildStories}=await loadPureModule('../lib/news/stories.ts');
const collectorSource=await readFile(new URL('../lib/collect.ts',import.meta.url),'utf8');
const newsSource=await readFile(new URL('../lib/news.ts',import.meta.url),'utf8');
const adminServiceSource=await readFile(new URL('../lib/admin/service.ts',import.meta.url),'utf8');
const adminPageSource=await readFile(new URL('../app/admin/page.tsx',import.meta.url),'utf8');
const maintenanceSource=await readFile(new URL('../lib/collection/repository.ts',import.meta.url),'utf8');
const state=(extra={})=>({topic:'automatic-topic',topicOverride:null,status:'published',statusOverride:null,reason:'',...extra});
const applyPatch=(current,patch)=>patch.kind==='topic'
  ?{...current,topic:patch.topic,topicOverride:patch.topicOverride}
  :{...current,status:patch.status,statusOverride:patch.statusOverride,reason:patch.reason};

const merge=buildAdminPatches('merge',['a','b'],'manual-merge');
assert.equal(merge.length,2);
assert.equal(applyAutomaticDecision(applyPatch(state(),merge[0]),{topic:'ai-rematch'}).topic,'manual-merge','manual merge must survive automatic topic matching');

const split=buildAdminPatches('split',['a','b']);
assert.equal(applyAutomaticDecision(applyPatch(state({topic:'manual-merge'}),split[0]),{topic:'same-ai-topic'}).topic,'a');
assert.equal(applyAutomaticDecision(applyPatch(state({topic:'manual-merge'}),split[1]),{topic:'same-ai-topic'}).topic,'b','manual split must survive automatic topic matching');

const excluded=applyPatch(state(),buildAdminPatches('exclude',['a'])[0]);
assert.equal(applyAutomaticDecision(excluded,{status:'published',reason:''}).status,'excluded','manual exclusion must survive collection');
assert.equal(excluded.reason,'관리자 수동 제외');

const restored=applyPatch(state({status:'excluded',reason:'Review 콘텐츠'}),buildAdminPatches('restore',['a'])[0]);
assert.equal(applyAutomaticDecision(restored,{status:'review',reason:'Review 콘텐츠'}).status,'published','manual restore must survive collection');
assert.equal(restored.reason,'관리자 수동 복구');

const automatic=applyAutomaticDecision(state(),{topic:'ai-topic',status:'review',reason:'topic 판정 검토 필요'});
assert.equal(automatic.topic,'ai-topic');
assert.equal(automatic.status,'review');
assert.equal(automatic.reason,'topic 판정 검토 필요','automation still applies when no administrator override exists');

const articles=[
  {id:'later',topic:'manual-merge',published:'2026-09-19T12:00:00Z',status:'published'},
  {id:'earliest',topic:'manual-merge',published:'2026-09-18T12:00:00Z',status:'published'},
];
assert.equal(buildStories(articles,Date.parse('2026-09-20T12:00:00Z'))[0].articles[0].id,'earliest','manual merge keeps earliest representative rule');
assert.doesNotMatch(collectorSource,/UPDATE\s+articles\s+SET\s+status\s*=\s*['"]excluded/i,'collector must not broadly re-exclude persisted articles');

assert.equal(normalizeEmail(' Owner@Example.com '),'owner@example.com');
assert.deepEqual(authorizeAdminEmail('OWNER@example.com','owner@EXAMPLE.com'),{authorized:true},'configured email comparison is case-insensitive');
assert.deepEqual(authorizeAdminEmail('other@example.com','owner@example.com'),{authorized:false,reason:'forbidden'},'a different email is denied');
assert.deepEqual(authorizeAdminEmail('owner@example.com',undefined),{authorized:false,reason:'configuration-missing'},'missing production configuration fails closed');
assert.deepEqual(authorizeAdminEmail(null,'owner@example.com'),{authorized:false,reason:'email-missing'},'missing authenticated email fails closed');
assert.doesNotMatch(newsSource,/settings WHERE key='admin|admin_identity_v2|userId===|userId\s*===/,'legacy D1 identity and user ID are not authorization sources');
assert.match(adminServiceSource,/runEditorialMaintenanceOnce\(\)[\s\S]*list\(\)/,'the first authorized management load runs maintenance before listing articles');
assert.match(adminPageSource,/await admin\(\)[\s\S]*await getManagementState\(\)/,'the first authenticated admin page request runs the management load server-side');
assert.match(maintenanceSource,/status='published' AND status_override IS NULL/,'maintenance considers only non-overridden published articles');
assert.match(maintenanceSource,/EDITORIAL_MAINTENANCE_KEY/,'editorial maintenance remains one-time and idempotent');
console.log('Administrator overrides: 24 assertions passed');
