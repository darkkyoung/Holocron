import {db} from '@/lib/news';

export const FEEDBACK_COOLDOWN_MS=60_000;

export async function acquireFeedbackWindow(sessionHash:string,now:Date){
  const nextAllowedAt=new Date(now.getTime()+FEEDBACK_COOLDOWN_MS).toISOString();
  const result=await db().prepare(`INSERT INTO feedback_rate_limits (session_hash,next_allowed_at) VALUES (?,?)
    ON CONFLICT(session_hash) DO UPDATE SET next_allowed_at=excluded.next_allowed_at
    WHERE feedback_rate_limits.next_allowed_at<=?`)
    .bind(sessionHash,nextAllowedAt,now.toISOString()).run();
  return {acquired:(result.meta?.changes??0)>0,nextAllowedAt};
}

export async function releaseFeedbackWindow(sessionHash:string,nextAllowedAt:string){
  await db().prepare('DELETE FROM feedback_rate_limits WHERE session_hash=? AND next_allowed_at=?').bind(sessionHash,nextAllowedAt).run();
}
