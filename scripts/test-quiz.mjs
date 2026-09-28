import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

let assertions=0;
function check(value,message){assert.ok(value,message);assertions++;}
function equal(actual,expected,message){assert.equal(actual,expected,message);assertions++;}
async function source(path){return readFile(new URL(path,import.meta.url),'utf8');}
async function transpile(path,replacements={}){
  let output=ts.transpileModule(await source(path),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [specifier,url] of Object.entries(replacements))output=output.replaceAll("'" + specifier + "'","'" + url + "'").replaceAll('"' + specifier + '"','"' + url + '"');
  return 'data:text/javascript;base64,'+Buffer.from(output).toString('base64');
}

const typesUrl=await transpile('../lib/quiz/types.ts');
const types=await import(typesUrl);
equal(types.QUIZ_MAX_OPTIONS,5,'quiz supports at most five options');
equal(types.effectiveQuizStatus('scheduled','2026-09-28T03:00:00.000Z',new Date('2026-09-28T04:00:00.000Z')),'published','due scheduled quiz is effectively published');
equal(types.effectiveQuizStatus('published','2026-09-28T05:00:00.000Z',new Date('2026-09-28T04:00:00.000Z')),'scheduled','future timestamp is treated as scheduled');
check(types.isQuizPublic('published',null,new Date()),'immediate published quiz is public');
check(!types.isQuizPublic('draft',null,new Date()),'draft quiz stays private');

const validation=await import(await transpile('../lib/quiz/validation.ts',{'./types':typesUrl}));
const draft=validation.parseQuizDraft({
  title:'키가 가장 큰 인물은?',question:'다음 중 키가 가장 큰 인물은 누구일까요?',heroImageUrl:'https://example.com/hero.jpg',
  explanation:'정답은 츄바카입니다.',status:'scheduled',publishAt:'2026-09-29T00:00:00.000Z',
  options:[
    {label:'다스 베이더',imageUrl:'https://example.com/vader.jpg',isCorrect:false},
    {label:'그리버스',imageUrl:null,isCorrect:false},
    {label:'츄바카',imageUrl:'https://example.com/chewie.jpg',isCorrect:true},
    {label:'두쿠',imageUrl:null,isCorrect:false}
  ]
});
equal(draft.options.length,4,'valid option count is accepted');
equal(draft.options.filter(option=>option.isCorrect).length,1,'exactly one answer is preserved');
assert.throws(()=>validation.parseQuizDraft({...draft,options:draft.options.map(option=>({...option,isCorrect:false}))}),/정답/);assertions++;
assert.throws(()=>validation.parseQuizDraft({...draft,options:[...draft.options,{label:'E',imageUrl:null,isCorrect:false},{label:'F',imageUrl:null,isCorrect:false}]}),/선택지/);assertions++;
assert.throws(()=>validation.parseQuizDraft({...draft,status:'scheduled',publishAt:null}),/예약 공개 시각/);assertions++;

const schema=await source('../db/schema.ts');
const migration=await source('../drizzle/0011_daily_quiz.sql');
const publicApi=await source('../app/api/quiz/route.ts');
const adminApi=await source('../app/api/admin/quiz/route.ts');
const repository=await source('../lib/quiz/repository.ts');
const service=await source('../lib/quiz/service.ts');
const page=await source('../app/quiz/page.tsx');
const client=await source('../components/quiz/daily-quiz.tsx');
const admin=await source('../components/quiz/quiz-admin.tsx');
const newsroom=await source('../app/newsroom.tsx');

check(schema.includes("sqliteTable('quizzes'")&&schema.includes("sqliteTable('quiz_options'")&&schema.includes("sqliteTable('quiz_responses'"),'quiz schema includes content options and responses');
check(migration.includes('PRIMARY KEY(')&&migration.includes('session_hash'),'migration enforces one response per session and quiz');
check(repository.includes('INSERT OR IGNORE INTO quiz_responses'),'vote insertion is idempotent');
check(repository.includes('COUNT(*) AS votes')&&repository.includes('Math.round(votes/totalVotes*100)'),'results aggregate option percentages');
check(publicApi.includes('anonymousSession')&&publicApi.includes('submitQuizVote'),'public API uses existing anonymous browser session');
check(adminApi.includes('getAdminSession')&&adminApi.includes("request.headers.get('origin')"),'management API is authenticated and origin protected');
check(service.includes('sameOptions')&&service.includes('이미 참여 기록'),'answer choices are protected after participation');
check(page.includes('<Header archive="quiz"'),'quiz route uses first-class navigation state');
check(newsroom.includes('href="/quiz"'),'primary navigation links to quiz');
check(admin.includes('예약 공개')&&admin.includes('메인 이미지 URL')&&admin.includes('이미지 URL'),'admin supports scheduling and URL images');
check(client.includes('percent')&&client.includes('정답 확인'),'public quiz reveals percentages and answer sheet');
check(client.includes('checking')&&client.includes('참여 기록을 확인'),'client prevents a session-cookie race before voting');

console.log('Daily Quiz: '+assertions+' assertions passed');
