import {rewardWalletsSql} from '../credit/rewards/provenance';
import {prepareRewardMutation} from '../credit/repository';
import {CreditError,type CreditOwner} from '../credit/types';
import {boundedIdentifier,validateOwner} from '../credit/policy';
import {quizRewardKey,type QuizCreditReward} from '../credit/rewards/policy';

// All three decisions (public Quiz, first response, correct choice) are rechecked within the batch.
const publicQuiz=`((q.status='published' AND (q.publish_at IS NULL OR q.publish_at<=?)) OR (q.status='scheduled' AND q.publish_at IS NOT NULL AND q.publish_at<=?))`;
export async function insertRewardedQuizResponse(database:D1Database,quizId:string,sessionHash:string,optionId:string,owner:CreditOwner,now:Date){
  validateOwner(owner);
  if(!boundedIdentifier(quizId,160)||!boundedIdentifier(optionId)||!boundedIdentifier(sessionHash))throw new CreditError('INVALID_INPUT');
  const key=quizRewardKey(quizId),entryId=crypto.randomUUID(),time=now.toISOString();
  const ledger=prepareRewardMutation(database,{owner,idempotencyKey:key,reference:{type:'quiz',id:quizId}},entryId,now,{
    sql:`SELECT CASE WHEN o.is_correct=1 THEN 3 ELSE 0 END FROM quiz_options o JOIN quizzes q ON q.id=o.quiz_id
      WHERE q.id=? AND o.id=? AND ${publicQuiz}
      AND NOT EXISTS (SELECT 1 FROM quiz_responses WHERE quiz_id=? AND session_hash=?)`,
    bindings:[quizId,optionId,time,time,quizId,sessionHash],
  });
  const response=database.prepare(`INSERT OR IGNORE INTO quiz_responses (quiz_id,session_hash,option_id,created_at)
    SELECT q.id,?,o.id,? FROM quizzes q JOIN quiz_options o ON o.quiz_id=q.id
    WHERE q.id=? AND o.id=? AND ${publicQuiz}
      AND EXISTS (SELECT 1 FROM credit_ledger e JOIN credit_principals p ON p.id=e.wallet_id
        WHERE e.wallet_id IN (${rewardWalletsSql}) AND e.idempotency_key=?)
      AND EXISTS (SELECT 1 FROM credit_principals WHERE id=? AND retired_at IS NULL)`)
    .bind(sessionHash,time,quizId,optionId,time,time,owner.principalId,owner.principalId,key,owner.principalId);
  // An unexpected ignored response must roll back a newly issued reward too. The immutable-ledger trigger aborts only on incoherence.
  const guard=database.prepare(`UPDATE credit_ledger SET id=id WHERE id=? AND NOT EXISTS (SELECT 1 FROM quiz_responses WHERE quiz_id=? AND session_hash=? AND option_id=?)`).bind(entryId,quizId,sessionHash,optionId);
  try{
    const results=await database.batch([ledger,response,guard,
      database.prepare('SELECT option_id AS optionId FROM quiz_responses WHERE quiz_id=? AND session_hash=?').bind(quizId,sessionHash),
      database.prepare(`SELECT e.id,e.requested_amount AS requested,e.applied_amount AS applied,w.balance FROM credit_ledger e JOIN credit_wallets w ON w.principal_id=? WHERE e.wallet_id IN (${rewardWalletsSql}) AND e.idempotency_key=?`).bind(owner.principalId,owner.principalId,owner.principalId,key),
    ]);
    if(results.some(result=>!result.success))throw new Error();
    const stored=results[3].results[0] as {optionId:string}|undefined;
    if(!stored)throw new Error();
    const entry=results[4].results[0] as {id:string;requested:number;applied:number;balance:number}|undefined;
    const credit:QuizCreditReward|null=entry?{requested:entry.requested,applied:entry.applied,balance:entry.balance,capped:entry.requested>entry.applied,newlyApplied:entry.id===entryId}:null;
    return {...stored,credit};
  }catch{throw new CreditError('UNAVAILABLE');}
}
