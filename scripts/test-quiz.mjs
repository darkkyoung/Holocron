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
equal(types.QUIZ_MIN_OPTIONS,2,'Daily Quiz requires at least two options');
equal(types.QUIZ_MAX_OPTIONS,5,'Daily Quiz allows at most five options');
equal(types.effectiveQuizStatus('scheduled','2026-09-28T03:00:00.000Z',new Date('2026-09-28T04:00:00.000Z')),'published','due scheduled quiz is effectively published');
equal(types.effectiveQuizStatus('published','2026-09-28T05:00:00.000Z',new Date('2026-09-28T04:00:00.000Z')),'scheduled','future timestamp is treated as scheduled');
check(types.isQuizPublic('published',null,new Date()),'immediate published quiz is public');
check(!types.isQuizPublic('draft',null,new Date()),'draft quiz stays private');

const validation=await import(await transpile('../lib/quiz/validation.ts',{'./types':typesUrl}));
const draft=validation.parseQuizDraft({
  question:'다음 중 키가 가장 큰 인물은 누구일까요?',heroImageUrl:'https://example.com/hero.jpg',heroImageCrop:{x:35,y:65,zoom:145},heroLinkUrl:'https://youtube.com/watch?v=quiz',
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
equal(validation.parseQuizDraft({...draft,options:[draft.options[0],{...draft.options[1],isCorrect:true}]}).options.length,2,'two-choice quiz is accepted');
equal(draft.options.filter(option=>option.isCorrect).length,1,'exactly one answer is preserved');
equal(draft.title,draft.question.slice(0,140),'database compatibility title is derived from the question');
equal(draft.heroImageCrop.zoom,145,'hero crop metadata is preserved');
equal(draft.options[0].imageCrop.zoom,100,'missing option crop metadata receives a source-agnostic default');
equal(draft.heroLinkUrl,'https://youtube.com/watch?v=quiz','optional hero destination is normalized');
equal(draft.publishAt,'2026-09-29T00:00:00.000Z','09:00 KST schedule is stored as the matching UTC instant');
assert.throws(()=>validation.parseQuizDraft({...draft,options:draft.options.map(option=>({...option,isCorrect:false}))}),/정답/);assertions++;
assert.throws(()=>validation.parseQuizDraft({...draft,options:draft.options.slice(0,1)}),/선택지/);assertions++;
assert.throws(()=>validation.parseQuizDraft({...draft,options:[...draft.options,{label:'F',imageUrl:null,isCorrect:false}]}),/선택지/);assertions++;
assert.throws(()=>validation.parseQuizDraft({...draft,status:'scheduled',publishAt:null}),/예약 공개 시각/);assertions++;
assert.throws(()=>validation.parseQuizDraft({...draft,heroLinkUrl:'javascript:alert(1)'}),/http\/https/);assertions++;
assert.throws(()=>validation.parseQuizDraft({...draft,heroImageUrl:null,heroLinkUrl:'https://youtube.com/watch?v=quiz'}),/메인 이미지 URL/);assertions++;
assert.throws(()=>validation.parseQuizDraft({...draft,heroImageCrop:{x:-1,y:50,zoom:100}}),/자르기 설정/);assertions++;

const schema=await source('../db/schema.ts');
const migration=await source('../drizzle/0011_daily_quiz.sql');
const cropMigration=await source('../drizzle/0012_quiz_image_crop.sql');
const publicApi=await source('../app/api/quiz/route.ts');
const adminApi=await source('../app/api/admin/quiz/route.ts');
const repository=await source('../lib/quiz/repository.ts');
const service=await source('../lib/quiz/service.ts');
const page=await source('../app/quiz/page.tsx');
const client=await source('../components/quiz/daily-quiz.tsx');
const admin=await source('../components/quiz/quiz-admin.tsx');
const cropControl=await source('../components/quiz/image-crop-control.tsx');
const quizImageAspects=await source('../components/quiz/quiz-image-aspects.css');
const newsroom=await source('../app/newsroom.tsx');

check(schema.includes("sqliteTable('quizzes'")&&schema.includes("sqliteTable('quiz_options'")&&schema.includes("sqliteTable('quiz_responses'"),'quiz schema includes content options and responses');
check(migration.includes('PRIMARY KEY(')&&migration.includes('session_hash'),'migration enforces one response per session and quiz');
check(cropMigration.includes('hero_crop_x')&&cropMigration.includes('hero_crop_y')&&cropMigration.includes('hero_crop_zoom')&&cropMigration.includes('hero_link_url'),'additive migration stores hero crop and destination metadata');
check(cropMigration.includes('image_crop_x')&&cropMigration.includes('image_crop_y')&&cropMigration.includes('image_crop_zoom'),'additive migration stores option crop metadata');
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
check(admin.includes('options:[blankOption(),blankOption()]'),'new quiz starts with the minimum two choices');
check(admin.includes('addOption')&&admin.includes('removeOption')&&admin.includes('QUIZ_MAX_OPTIONS')&&admin.includes('QUIZ_MIN_OPTIONS'),'admin can add and remove choices within shared limits');
check(admin.includes('noValidate')&&admin.includes('validateForm')&&admin.includes('scrollIntoView'),'admin reports validation failures and focuses the first invalid field');
check(!admin.includes('퀴즈 제목 *')&&!client.includes('quiz.title'),'separate quiz title is absent from admin and public rendering');
check(cropControl.includes('가로 위치')&&cropControl.includes('세로 위치')&&cropControl.includes('확대'),'crop editor controls position and zoom without an image-processing dependency');
check(cropControl.includes("type QuizImageAspect='square'|'wide'")&&cropControl.includes("aspect==='wide'?'16:9':'1:1'"),'crop editor distinguishes the hero 16:9 viewport from square options');
check(client.includes('aspect="wide"')&&admin.includes('label="메인 이미지" aspect="wide"'),'public and admin hero previews request the 16:9 crop viewport');
check(quizImageAspects.includes(".quiz-crop-frame[data-aspect='wide']")&&quizImageAspects.includes('aspect-ratio: 16 / 9')&&quizImageAspects.includes('.quiz-main .quiz-hero-link > .quiz-hero-image')&&quizImageAspects.includes('position: relative'),'hero stays in normal flow at 16:9 and the full width of the quiz content column');
check(client.indexOf('quiz.heroImageUrl')<client.indexOf('className="quiz-question"'),'public hero renders before the question in normal document flow');
check(client.includes('target="_blank"')&&client.includes('rel="noopener noreferrer"'),'public hero destination opens safely in a new tab');
check(client.includes('CroppedQuizImage')&&admin.includes('QuizImageCropControl'),'public and administrator previews share crop rendering metadata');
check(client.includes('percent')&&client.includes('정답: {correctOption?.label'),'public quiz reveals percentages and the correct answer label');
check(client.includes('checking')&&client.includes('참여 기록을 확인'),'client prevents a session-cookie race before voting');

const repositoryStub=dataUrl(`
let response=null;
const crop={x:50,y:50,zoom:100};
const quiz={id:'quiz-1',question:'문제',heroImageUrl:null,heroImageCrop:crop,heroLinkUrl:null,status:'published',publishAt:null,createdAt:'2026-09-28T00:00:00.000Z',updatedAt:'2026-09-28T00:00:00.000Z',options:[
 {id:'a',label:'A',imageUrl:null,imageCrop:crop,position:0},{id:'b',label:'B',imageUrl:null,imageCrop:crop,position:1},{id:'c',label:'C',imageUrl:null,imageCrop:crop,position:2},{id:'d',label:'D',imageUrl:null,imageCrop:crop,position:3},{id:'e',label:'E',imageUrl:null,imageCrop:crop,position:4}
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
  question:'수정 문제',heroImageUrl:'https://example.com/new-hero.jpg',heroImageCrop:{x:25,y:70,zoom:160},heroLinkUrl:'https://youtube.com/watch?v=updated',explanation:'수정 해설',status:'published',publishAt:null,
  options:['A','B','C','D','E'].map((label,index)=>({label,imageUrl:null,imageCrop:{x:50,y:50,zoom:100},isCorrect:index===2})),
};
equal((await quizService.updateManagedQuiz('quiz-1',lockedDraft)).metadataUpdated,true,'metadata remains editable after responses exist');
await assert.rejects(()=>quizService.updateManagedQuiz('quiz-1',{...lockedDraft,options:lockedDraft.options.map((option,index)=>index===0?{...option,label:'변경된 선택지'}:option)}),/선택지나 정답/);assertions++;
await assert.rejects(()=>quizService.updateManagedQuiz('quiz-1',{...lockedDraft,options:lockedDraft.options.map((option,index)=>index===0?{...option,imageCrop:{x:40,y:50,zoom:100}}:option)}),/선택지나 정답/);assertions++;

console.log('Daily Quiz: '+assertions+' assertions passed');
