import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function source(path){return readFile(new URL(path,import.meta.url),'utf8');}
async function loadPure(path){
  const output=ts.transpileModule(await source(path),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const mod=await loadPure('../lib/site-copy.ts');
let assertions=0;
assert.equal(mod.DEFAULT_SITE_COPY.newsHeroTitle,'은하계의 소식,');assertions++;
assert.equal(mod.DEFAULT_SITE_COPY.newsExplainerTitle,'같은 소식은 하나로.');assertions++;
assert.equal(mod.DEFAULT_SITE_COPY.worksHeroTitle,'작품의 이야기,');assertions++;
assert.equal(mod.DEFAULT_SITE_COPY.feedbackSuccessTitle,'메모를 전송했습니다.');assertions++;
assert.match(mod.DEFAULT_SITE_COPY.feedbackSuccessDescription,/\{tag\}/);assertions++;
assert.equal(mod.normalizeSiteCopy({newsHeroTitle:'  새 제목  '}).newsHeroTitle,'새 제목');assertions++;
assert.equal(mod.normalizeSiteCopy({newsHeroTitle:''}).newsHeroTitle,mod.DEFAULT_SITE_COPY.newsHeroTitle);assertions++;
assert.throws(()=>mod.validateSiteCopy({}),/사이트 문구/);assertions++;
const valid={...mod.DEFAULT_SITE_COPY,newsHeroTitle:'  새 제목  '};
assert.equal(mod.validateSiteCopy(valid).newsHeroTitle,'새 제목');assertions++;
assert.throws(()=>mod.validateSiteCopy({...mod.DEFAULT_SITE_COPY,newsHeroTitle:'x'.repeat(mod.SITE_COPY_LIMITS.newsHeroTitle+1)}),/너무 깁니다/);assertions++;

const repository=await source('../lib/site-copy-repository.ts');
const route=await source('../app/api/admin/site-copy/route.ts');
const adminPage=await source('../app/admin/site-copy/page.tsx');
const adminComponent=await source('../components/admin/site-copy-admin.tsx');
const newsroom=await source('../app/newsroom.tsx');
const worksPage=await source('../app/works/page.tsx');
const home=await source('../app/page.tsx');
const commandRail=await source('../components/admin/admin-command-rail.tsx');

assert.match(repository,/SELECT value FROM settings WHERE key=\?/);assertions++;
assert.match(repository,/setting\(SITE_COPY_SETTING_KEY,JSON\.stringify\(copy\)\)/);assertions++;
assert.match(route,/getAdminSession/);assertions++;
assert.match(route,/request\.headers\.get\('origin'\)/);assertions++;
assert.match(adminPage,/requireAdminSession/);assertions++;
assert.match(adminComponent,/사이트 문구 저장/);assertions++;
assert.match(adminComponent,/기본값으로 되돌리기/);assertions++;
assert.match(adminComponent,/FEEDBACK SUCCESS/);assertions++;
assert.match(newsroom,/copy\.newsHeroTitle[\s\S]*copy\.feedbackSuccessTitle[\s\S]*copy\.newsExplainerTitle[\s\S]*copy\.siteFooterLegal/);assertions++;
assert.match(worksPage,/copy\.worksHeroTitle[\s\S]*copy\.worksHeroDescription/);assertions++;
assert.match(home,/loadSiteCopy/);assertions++;
assert.match(commandRail,/href="\/admin\/site-copy"/);assertions++;
console.log(`Site copy management: ${assertions} assertions passed`);
