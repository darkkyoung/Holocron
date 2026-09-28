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
const dataUrl=value=>'data:text/javascript;base64,'+Buffer.from(value).toString('base64');

const typesUrl=await transpile('../lib/quiz/types.ts');
const types=await import(typesUrl);
equal(types.QUIZ_MIN_OPTIONS,5,'Daily Quiz requires five options');
equal(types.QUIZ_MAX_OPTIONS,5,'Daily Quiz allows exactly five options');
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
    {label:'두쿠',imageUrl:null,isCorrect:false},
    {label:'요다',imageUrl:null,isCorrect:false}
  ]
});
equal(draft.options.length,5,'five-choice quiz is accepted');
equal(draft.options.filter(option=>option.isCorrect).length,1,'exactly one answer is preserved');
equal(draft.publishAt,'2026-09-29T00:00:00.000Z','09:00 KST schedule is stored as the matching UTC instant');
assert.throws(()=>validation.parseQuizDraft({...draft,options:draft.options.map(option=>({...option,isCorrect:false}))}),/정답/);assertions++;
assert.throws(()=>validation.parseQuizDraft({...draft,options:draft.options.slice(0,4)}),/선택지/);assertions++;
assert.throws(()=>validation.parseQuizDraft({...draft,options:[...draft.options,{label:'F',imageUrl:null,isCorrect:false}]}),/선택지/);assertions++;
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
check(repository.indexOf('INSERT OR IGNORE INTO quiz_responses')<repository.indexOf('return loadQuizResponse(quizId,sessionHash)'),'duplicate vote returns the persisted first response');
check(repository.includes('COUNT(*) AS votes')&&repository.includes('Math.round(votes/totalVotes*100)'),'results aggregate option percentages');
check(repository.includes('db().batch([\n    db().prepare(\'DELETE FROM quiz_responses')&&repository.includes("db().prepare('DELETE FROM quiz_options")&&repository.includes("db().prepare('DELETE FROM quizzes"),'deletion removes responses, options, and quiz records');
check(!/function quizFromRow[\s\S]*?return \{\.\.\.row,options\}/.test(repository),'public quiz mapping does not spread the answer explanation');
check(/function quizFromRow[\s\S]*?status:row\.status[\s\S]*?options/.test(repository),'public quiz mapping explicitly selects safe fields');
check(publicApi.includes('anonymousSession')&&publicApi.includes('submitQuizVote'),'public API uses existing anonymous browser session');
check(adminApi.includes('getAdminSession')&&adminApi.includes("request.headers.get('origin')"),'management API is authenticated and origin protected');
check(service.includes('sameOptions')&&service.includes('이미 참여 기록'),'answer choices are protected after participation');
check(page.includes('<Header archive="quiz"'),'quiz route uses first-class navigation state');
check(newsroom.includes('href="/quiz"'),'primary navigation links to quiz');
check(admin.includes('예약 공개')&&admin.includes('메인 이미지 URL')&&admin.includes('이미지 URL'),'admin supports scheduling and URL images');
check(admin.includes('공개 시각 · KST')&&admin.includes("+':00+09:00'"),'admin treats scheduled quiz input explicitly as KST');
check(admin.includes('blankOption(),blankOption(),blankOption(),blankOption(),blankOption()'),'new quiz starts with exactly five choices');
check(client.includes('percent')&&client.includes('정답: {correctOption?.label'),'public quiz reveals percentages and the correct answer label');
check(client.includes('checking')&&client.includes('참여 기록을 확인'),'client prevents a session-cookie race before voting');

const repositoryStub=dataUrl(`
let response=null;
const quiz={id:'quiz-1',title:'제목',question:'문제',heroImageUrl:null,status:'published',publishAt:null,createdAt:'2026-09-28T00:00:00.000Z',updatedAt:'2026-09-28T00:00:00.000Z',options:[
 {id:'a',label:'A',imageUrl:null,position:0},{id:'b',label:'B',imageUrl:null,position:1},{id:'c',label:'C',imageUrl:null,position:2},{id:'d',label:'D',imageUrl:null,position:3},{id:'e',label:'E',imageUrl:null,position:4}
]};
export async function listPublicQuizSummaries(){return [quiz]}
export async function loadLatestPublicQuiz(){return quiz}
export async function loadPublicQuiz(id){return id==='quiz-1'?quiz:null}
export async function loadQuizResponse(){return response}
export async function optionBelongsToQuiz(_quizId,optionId){return ['a','b','c','d','e'].includes(optionId)}
export async function insertQuizResponse(_quizId,_sessionHash,optionId){if(!response)response={optionId};return response}
export async function buildQuizResult(_quizId,selectedOptionId){return {selectedOptionId,totalVotes:1,explanation:'정답 해설',options:['a','b','c','d','e'].map((id,index)=>({id,votes:id===selectedOptionId?1:0,percent:id===selectedOptionId?100:0,isCorrect:index===2}))}}
export async function listAdminQuizzes(){return []}
export async function quizResponseCount(){return 0}
export async function createQuizRecord(_id,draft){return draft}
export async function loadAdminQuiz(){return {...quiz,explanation:'기존 해설',options:quiz.options.map((option,index)=>({...option,isCorrect:index===2}))}}
export async function hasQuizResponses(){return true}
export async function updateQuizMetadata(_id,draft){return {...draft,metadataUpdated:true}}
export async function updateQuizRecord(){throw new Error('unused')}
export async function deleteQuizRecord(){return {ok:true}}
`);
const serviceUrl=await transpile('../lib/quiz/service.ts',{'./repository':repositoryStub,'./types':typesUrl,'./validation':await transpile('../lib/quiz/validation.ts',{'./types':typesUrl})});
const quizService=await import(serviceUrl);
const beforeVote=await quizService.getQuizParticipation('quiz-1','session-1',new Date('2026-09-28T00:00:00Z'));
check(!('explanation' in beforeVote.quiz),'answer explanation is absent before voting');
equal(beforeVote.result,null,'new anonymous browser session has no previous result');
const firstVote=await quizService.submitQuizVote({quizId:'quiz-1',optionId:'a'},'session-1',new Date('2026-09-28T00:00:00Z'));
equal(firstVote.result.selectedOptionId,'a','first vote is stored');
equal(firstVote.result.totalVotes,1,'first vote contributes once to the aggregate');
equal(firstVote.result.options.reduce((sum,option)=>sum+option.percent,0),100,'single-vote percentages are safe');
const duplicateVote=await quizService.submitQuizVote({quizId:'quiz-1',optionId:'b'},'session-1',new Date('2026-09-28T00:01:00Z'));
equal(duplicateVote.result.selectedOptionId,'a','duplicate POST preserves the first selected option');
const restored=await quizService.getQuizParticipation('quiz-1','session-1',new Date('2026-09-28T00:02:00Z'));
equal(restored.result.selectedOptionId,'a','refresh restores the previous vote');
await assert.rejects(()=>quizService.submitQuizVote({quizId:'quiz-1',optionId:'invalid'},'session-2'),/선택지/);assertions++;
await assert.rejects(()=>quizService.submitQuizVote({quizId:'draft',optionId:'a'},'session-2'),/공개된 퀴즈/);assertions++;
const lockedDraft={
  title:'수정 제목',question:'수정 문제',heroImageUrl:'https://example.com/new-hero.jpg',explanation:'수정 해설',status:'published',publishAt:null,
  options:['A','B','C','D','E'].map((label,index)=>({label,imageUrl:null,isCorrect:index===2})),
};
equal((await quizService.updateManagedQuiz('quiz-1',lockedDraft)).metadataUpdated,true,'metadata remains editable after responses exist');
await assert.rejects(()=>quizService.updateManagedQuiz('quiz-1',{...lockedDraft,options:lockedDraft.options.map((option,index)=>index===0?{...option,label:'변경된 선택지'}:option)}),/선택지나 정답/);assertions++;

console.log('Daily Quiz: '+assertions+' assertions passed');
