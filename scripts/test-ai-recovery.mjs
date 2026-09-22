import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

async function loadPureModule(path){
  const source=await readFile(new URL(path,import.meta.url),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`);
}

const policy=await loadPureModule('../lib/collection/recovery-policy.ts');
const source=await readFile(new URL('../lib/collection/recovery.ts',import.meta.url),'utf8');
const repository=await readFile(new URL('../lib/collection/repository.ts',import.meta.url),'utf8');
const adminService=await readFile(new URL('../lib/admin/service.ts',import.meta.url),'utf8');
const adminPanel=await readFile(new URL('../components/admin/admin-command-rail.tsx',import.meta.url),'utf8');

const article=(extra={})=>({status:'review',reason:'AI 처리 실패: OpenAI API 키가 설정되지 않았습니다.',statusOverride:null,topicOverride:null,...extra});
assert.equal(policy.isRetryableAiArticle(article()),true,'AI-failed review is retryable');
assert.equal(policy.isRetryableAiArticle(article({reason:'Review 콘텐츠'})),false,'editorial review is not retryable');
assert.equal(policy.isRetryableAiArticle(article({reason:'Character Spotlight'})),false,'character spotlight is not retryable');
assert.equal(policy.isRetryableAiArticle(article({reason:'metadata 문제: 설명 누락'})),false,'metadata review is not retryable');
assert.equal(policy.isRetryableAiArticle(article({statusOverride:'published'})),false,'published admin override is protected');
assert.equal(policy.isRetryableAiArticle(article({topicOverride:'manual-topic'})),false,'topic admin override is protected');

const output={title:'한국어 제목',summary:'한국어 요약입니다.',category:'영화',topic:'topic-1'};
assert.deepEqual(policy.successfulRecoveryPatch(output),{title:'한국어 제목',summary:'한국어 요약입니다.',category:'영화',topic:'topic-1',status:'published',reason:''},'successful recovery publishes and replaces AI fields');
assert.deepEqual(policy.failedRecoveryPatch(new Error('OpenAI 응답 오류 (503)')),{status:'review',reason:'AI 처리 실패: OpenAI 응답 오류 (503)'},'failed recovery remains review with refreshed reason');

assert.match(source,/MAX_AI_RECOVERY_ARTICLES=20/,'recovery has a bounded batch size');
assert.match(source,/for\(const stored of candidates\)[\s\S]*catch\{skipped\+\+;\}/,'recovery isolates each article');
assert.match(source,/article\.source,url:article\.url,published:article\.published/,'recovery sends stored source, URL and publication metadata to AI');
assert.match(repository,/status='review' AND reason LIKE \? AND status_override IS NULL AND topic_override IS NULL/,'repository only updates un-overridden AI-failed reviews');
assert.match(adminService,/action==='retry-ai'/,'admin service exposes the recovery action');
assert.match(adminPanel,/AI 실패 재처리/,'admin UI exposes a clear recovery action');
assert.match(adminPanel,/OpenAI API 키가 없으면 새 기사는 검토 필요 상태로 보관됩니다\./,'admin UI explains the current no-key policy');
console.log('AI recovery: 13 assertions passed');
