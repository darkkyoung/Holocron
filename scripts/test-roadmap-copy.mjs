import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import ts from 'typescript';

async function source(path){return readFile(new URL(path,import.meta.url),'utf8');}
async function loadPure(path){
  const output=ts.transpileModule(await source(path),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const model=await loadPure('../lib/roadmap-copy.ts');
const repository=await source('../lib/roadmap-copy-repository.ts');
const route=await source('../app/api/admin/roadmap-copy/route.ts');
const page=await source('../app/admin/roadmap/page.tsx');
const editor=await source('../components/admin/roadmap-copy-admin.tsx');
const roadmap=await source('../components/roadmap/roadmap.tsx');
const publicPage=await source('../app/roadmap/page.tsx');
const rail=await source('../components/admin/admin-command-rail.tsx');
const migrations=await readdir(new URL('../drizzle/',import.meta.url));
const pkg=JSON.parse(await source('../package.json'));
let assertions=0;

assert.equal(model.ROADMAP_COPY_SETTING_KEY,'public_roadmap_copy_v1');assertions++;
assert.deepEqual(model.ROADMAP_ITEM_COUNTS,{available:3,next:4,exploring:4});assertions++;
assert.deepEqual(model.ROADMAP_STAGE_IDS,['available','next','exploring']);assertions++;
assert.equal(model.DEFAULT_ROADMAP_COPY.hero.titlePrimary,'HOLOCRON');assertions++;
assert.equal(model.DEFAULT_ROADMAP_COPY.hero.titleAccent,'ROADMAP');assertions++;
assert.equal(model.DEFAULT_ROADMAP_COPY.stages.available.items.length,3);assertions++;
assert.equal(model.DEFAULT_ROADMAP_COPY.stages.next.items.length,4);assertions++;
assert.equal(model.DEFAULT_ROADMAP_COPY.stages.exploring.items.length,4);assertions++;
assert.equal(model.normalizeRoadmapCopy({}).stages.next.items[0].title,'AI Assistant 확장');assertions++;
assert.equal(model.normalizeRoadmapCopy({hero:{titlePrimary:'  새 제목  '}}).hero.titlePrimary,'새 제목');assertions++;
assert.throws(()=>model.validateRoadmapCopy({}),/문구/);assertions++;
const valid=structuredClone(model.DEFAULT_ROADMAP_COPY);valid.hero.titlePrimary='  새 제목  ';
assert.equal(model.validateRoadmapCopy(valid).hero.titlePrimary,'새 제목');assertions++;
const tooLong=structuredClone(model.DEFAULT_ROADMAP_COPY);tooLong.stages.next.items[0].description='x'.repeat(model.ROADMAP_COPY_LIMITS.itemDescription+1);
assert.throws(()=>model.validateRoadmapCopy(tooLong),/최대 320자/);assertions++;
const wrongCount=structuredClone(model.DEFAULT_ROADMAP_COPY);wrongCount.stages.available.items.pop();
assert.throws(()=>model.validateRoadmapCopy(wrongCount),/항목 개수/);assertions++;

assert.match(repository,/SELECT value FROM settings WHERE key=\?/);assertions++;
assert.match(repository,/if\(!row\?\.value\)return structuredClone\(DEFAULT_ROADMAP_COPY\)/);assertions++;
assert.match(repository,/catch\{return structuredClone\(DEFAULT_ROADMAP_COPY\);\}/);assertions++;
assert.match(repository,/validateRoadmapCopy\(value\)/);assertions++;
assert.match(repository,/setting\(ROADMAP_COPY_SETTING_KEY,JSON\.stringify\(copy\)\)/);assertions++;
assert.match(repository,/DELETE FROM settings WHERE key=\?/);assertions++;
assert.match(route,/getAdminSession/);assertions++;
assert.match(route,/request\.headers\.get\('origin'\)/);assertions++;
assert.match(route,/body\.action==='save'/);assertions++;
assert.match(route,/body\.action==='reset'/);assertions++;
assert.match(page,/requireAdminSession/);assertions++;
assert.match(page,/loadRoadmapCopy/);assertions++;
assert.match(editor,/useState\(initialCopy\)/);assertions++;
assert.match(editor,/content=\{draft\}/);assertions++;
assert.match(editor,/onCopySelect=\{focusField\}/);assertions++;
assert.match(editor,/scrollIntoView/);assertions++;
assert.match(editor,/\.focus\(/);assertions++;
assert.match(editor,/저장되지 않은 변경사항/);assertions++;
assert.match(editor,/기본 문구로 되돌리기/);assertions++;
assert.match(editor,/변경사항 저장/);assertions++;
assert.match(roadmap,/data-roadmap-copy-key/);assertions++;
assert.match(roadmap,/selectedCopyKey===key/);assertions++;
assert.match(publicPage,/loadRoadmapCopy/);assertions++;
assert.match(publicPage,/content=\{roadmapCopy\}/);assertions++;
assert.match(rail,/href="\/admin\/roadmap"/);assertions++;
assert.equal(migrations.filter(name=>name.endsWith('.sql')).at(-1),'0012_quiz_image_crop.sql');assertions++;
for(const dependency of ['three','d3','gsap']){assert.equal(pkg.dependencies?.[dependency]??pkg.devDependencies?.[dependency],undefined);assertions++;}

console.log(`Roadmap copy management: ${assertions} assertions passed`);
