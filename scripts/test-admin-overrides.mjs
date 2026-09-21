import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function loadPureModule(path){
  const source=await readFile(new URL(path,import.meta.url),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const {applyAutomaticDecision,buildAdminPatches}=await loadPureModule('../lib/admin/override-policy.ts');
const {matchAdminIdentity,normalizeEmail,parseStoredAdminIdentity,preferredLegacyIdentity,serializeAdminIdentity}=await loadPureModule('../lib/admin/identity.ts');
const {buildStories}=await loadPureModule('../lib/news/stories.ts');
const collectorSource=await readFile(new URL('../lib/collect.ts',import.meta.url),'utf8');
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

const principal={userId:'site-user-current',email:'Owner@Example.com'};
const stored=parseStoredAdminIdentity(serializeAdminIdentity(principal));
assert.equal(normalizeEmail(principal.email),'owner@example.com');
assert.equal(matchAdminIdentity(principal,stored,null,null),'stored','current persisted identity authorizes the administrator');
assert.equal(matchAdminIdentity(principal,null,'site-user-current',null),'legacy','legacy user ID remains compatible');
assert.equal(matchAdminIdentity({userId:null,email:'owner@example.com'},null,'old-site-user','owner@example.com'),'configured-owner','only configured verified owner email may rescue an old identifier');
assert.equal(matchAdminIdentity({userId:'attacker',email:'other@example.com'},null,'old-site-user','owner@example.com'),null,'another authenticated user cannot claim an existing administrator record');
assert.equal(preferredLegacyIdentity({userId:null,email:'Owner@Example.com'}),'owner@example.com','verified email is a bounded fallback when a user ID is absent');
assert.equal(parseStoredAdminIdentity('{bad json'),null,'malformed identity state fails closed');
console.log('Administrator overrides: 20 assertions passed');
