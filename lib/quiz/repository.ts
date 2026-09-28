import {db} from '@/lib/news';
import type {AdminQuiz,PublicQuiz,QuizDraft,QuizOption,QuizResult,QuizStatus,QuizSummary} from './types';

type QuizRow={
  id:string;title:string;question:string;heroImageUrl:string|null;explanation:string;status:QuizStatus;
  publishAt:string|null;createdAt:string;updatedAt:string;
};
type OptionRow={id:string;quizId:string;label:string;imageUrl:string|null;position:number;isCorrect:number};
type CountRow={optionId:string;votes:number};
type ResponseRow={optionId:string};

function quizFromRow(row:QuizRow,options:QuizOption[]):PublicQuiz{
  return {
    id:row.id,title:row.title,question:row.question,heroImageUrl:row.heroImageUrl,
    status:row.status,publishAt:row.publishAt,createdAt:row.createdAt,updatedAt:row.updatedAt,options,
  };
}
function adminQuizFromRow(row:QuizRow,options:OptionRow[]):AdminQuiz{
  return {...row,options:options.map(option=>({id:option.id,label:option.label,imageUrl:option.imageUrl,position:option.position,isCorrect:option.isCorrect===1}))};
}
async function optionRows(quizId:string){
  const result=await db().prepare('SELECT id,quiz_id AS quizId,label,image_url AS imageUrl,position,is_correct AS isCorrect FROM quiz_options WHERE quiz_id=? ORDER BY position ASC').bind(quizId).all<OptionRow>();
  return result.results;
}
function publicOptions(rows:OptionRow[]):QuizOption[]{
  return rows.map(option=>({id:option.id,label:option.label,imageUrl:option.imageUrl,position:option.position}));
}
async function quizRow(id:string){
  return db().prepare('SELECT id,title,question,hero_image_url AS heroImageUrl,explanation,status,publish_at AS publishAt,created_at AS createdAt,updated_at AS updatedAt FROM quizzes WHERE id=?').bind(id).first<QuizRow>();
}

export async function loadAdminQuiz(id:string):Promise<AdminQuiz|null>{
  const row=await quizRow(id);
  if(!row)return null;
  return adminQuizFromRow(row,await optionRows(id));
}

export async function listAdminQuizzes(){
  const rows=await db().prepare('SELECT id,title,question,hero_image_url AS heroImageUrl,explanation,status,publish_at AS publishAt,created_at AS createdAt,updated_at AS updatedAt FROM quizzes ORDER BY COALESCE(publish_at,created_at) DESC,created_at DESC').all<QuizRow>();
  const output:AdminQuiz[]=[];
  for(const row of rows.results)output.push(adminQuizFromRow(row,await optionRows(row.id)));
  return output;
}

export async function listPublicQuizSummaries(now:Date,limit=30):Promise<QuizSummary[]>{
  const iso=now.toISOString();
  const rows=await db().prepare(`SELECT id,title,question,hero_image_url AS heroImageUrl,status,publish_at AS publishAt,created_at AS createdAt,updated_at AS updatedAt
    FROM quizzes
    WHERE (status='published' AND (publish_at IS NULL OR publish_at<=?)) OR (status='scheduled' AND publish_at IS NOT NULL AND publish_at<=?)
    ORDER BY COALESCE(publish_at,created_at) DESC,created_at DESC LIMIT ?`).bind(iso,iso,limit).all<QuizSummary>();
  return rows.results;
}

export async function loadPublicQuiz(id:string,now:Date):Promise<PublicQuiz|null>{
  const row=await quizRow(id);
  if(!row)return null;
  const due=row.status==='published'&&(!row.publishAt||Date.parse(row.publishAt)<=now.getTime())||row.status==='scheduled'&&!!row.publishAt&&Date.parse(row.publishAt)<=now.getTime();
  if(!due)return null;
  return quizFromRow(row,publicOptions(await optionRows(id)));
}

export async function loadLatestPublicQuiz(now:Date){
  const summaries=await listPublicQuizSummaries(now,1);
  return summaries[0]?loadPublicQuiz(summaries[0].id,now):null;
}

export async function createQuizRecord(id:string,draft:QuizDraft,now:Date){
  const createdAt=now.toISOString();
  const quizStatement=db().prepare('INSERT INTO quizzes (id,title,question,hero_image_url,explanation,status,publish_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
    .bind(id,draft.title,draft.question,draft.heroImageUrl,draft.explanation,draft.status,draft.publishAt,createdAt,createdAt);
  const optionStatements=draft.options.map((option,index)=>db().prepare('INSERT INTO quiz_options (id,quiz_id,label,image_url,position,is_correct) VALUES (?,?,?,?,?,?)')
    .bind(crypto.randomUUID(),id,option.label,option.imageUrl,index,option.isCorrect?1:0));
  await db().batch([quizStatement,...optionStatements]);
  const row=await quizRow(id);
  if(!row)throw new Error('퀴즈를 저장하지 못했습니다.');
  return adminQuizFromRow(row,await optionRows(id));
}

export async function quizResponseCount(id:string){
  const row=await db().prepare('SELECT COUNT(*) AS count FROM quiz_responses WHERE quiz_id=?').bind(id).first<{count:number}>();
  return Number(row?.count??0);
}

export async function hasQuizResponses(id:string){return (await quizResponseCount(id))>0;}

export async function updateQuizMetadata(id:string,draft:QuizDraft,now:Date){
  const existing=await quizRow(id);
  if(!existing)throw new Error('퀴즈를 찾을 수 없습니다.');
  await db().prepare('UPDATE quizzes SET title=?,question=?,hero_image_url=?,explanation=?,status=?,publish_at=?,updated_at=? WHERE id=?')
    .bind(draft.title,draft.question,draft.heroImageUrl,draft.explanation,draft.status,draft.publishAt,now.toISOString(),id).run();
  const row=await quizRow(id);
  if(!row)throw new Error('퀴즈를 저장하지 못했습니다.');
  return adminQuizFromRow(row,await optionRows(id));
}

export async function updateQuizRecord(id:string,draft:QuizDraft,now:Date){
  const existing=await quizRow(id);
  if(!existing)throw new Error('퀴즈를 찾을 수 없습니다.');
  const update=db().prepare('UPDATE quizzes SET title=?,question=?,hero_image_url=?,explanation=?,status=?,publish_at=?,updated_at=? WHERE id=?')
    .bind(draft.title,draft.question,draft.heroImageUrl,draft.explanation,draft.status,draft.publishAt,now.toISOString(),id);
  const removeOptions=db().prepare('DELETE FROM quiz_options WHERE quiz_id=?').bind(id);
  const removeResponses=db().prepare('DELETE FROM quiz_responses WHERE quiz_id=?').bind(id);
  const optionStatements=draft.options.map((option,index)=>db().prepare('INSERT INTO quiz_options (id,quiz_id,label,image_url,position,is_correct) VALUES (?,?,?,?,?,?)')
    .bind(crypto.randomUUID(),id,option.label,option.imageUrl,index,option.isCorrect?1:0));
  await db().batch([removeResponses,removeOptions,update,...optionStatements]);
  const row=await quizRow(id);
  if(!row)throw new Error('퀴즈를 저장하지 못했습니다.');
  return adminQuizFromRow(row,await optionRows(id));
}

export async function deleteQuizRecord(id:string){
  const existing=await quizRow(id);
  if(!existing)throw new Error('퀴즈를 찾을 수 없습니다.');
  await db().batch([
    db().prepare('DELETE FROM quiz_responses WHERE quiz_id=?').bind(id),
    db().prepare('DELETE FROM quiz_options WHERE quiz_id=?').bind(id),
    db().prepare('DELETE FROM quizzes WHERE id=?').bind(id),
  ]);
  return {ok:true};
}

export async function loadQuizResponse(quizId:string,sessionHash:string){
  return db().prepare('SELECT option_id AS optionId FROM quiz_responses WHERE quiz_id=? AND session_hash=?').bind(quizId,sessionHash).first<ResponseRow>();
}

export async function insertQuizResponse(quizId:string,sessionHash:string,optionId:string,now:Date){
  await db().prepare('INSERT OR IGNORE INTO quiz_responses (quiz_id,session_hash,option_id,created_at) VALUES (?,?,?,?)').bind(quizId,sessionHash,optionId,now.toISOString()).run();
  return loadQuizResponse(quizId,sessionHash);
}

export async function buildQuizResult(quizId:string,selectedOptionId:string):Promise<QuizResult>{
  const row=await quizRow(quizId);
  if(!row)throw new Error('퀴즈를 찾을 수 없습니다.');
  const options=await optionRows(quizId);
  const counts=await db().prepare('SELECT option_id AS optionId,COUNT(*) AS votes FROM quiz_responses WHERE quiz_id=? GROUP BY option_id').bind(quizId).all<CountRow>();
  const byId=new Map(counts.results.map(item=>[item.optionId,Number(item.votes)]));
  const totalVotes=counts.results.reduce((sum,item)=>sum+Number(item.votes),0);
  return {
    selectedOptionId,
    totalVotes,
    explanation:row.explanation,
    options:options.map(option=>{
      const votes=byId.get(option.id)??0;
      return {id:option.id,votes,percent:totalVotes?Math.round(votes/totalVotes*100):0,isCorrect:option.isCorrect===1};
    }),
  };
}

export async function optionBelongsToQuiz(quizId:string,optionId:string){
  const row=await db().prepare('SELECT id FROM quiz_options WHERE quiz_id=? AND id=?').bind(quizId,optionId).first<{id:string}>();
  return !!row;
}
