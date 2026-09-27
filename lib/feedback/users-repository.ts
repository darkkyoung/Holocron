import {db} from '@/lib/news';
import {feedbackDisplayTag} from './domain';

export type FeedbackUserSummary={
  tag:string;
  nickname:string;
  messageCount:number;
  firstSeenAt:string;
  lastSeenAt:string;
  banned:boolean;
  bannedAt:string|null;
};

type FeedbackUserRow={
  displayTag:string;
  nickname:string;
  messageCount:number;
  firstSeenAt:string;
  lastSeenAt:string;
  banned:number;
  bannedAt:string|null;
};

function summary(row:FeedbackUserRow):FeedbackUserSummary{
  return {tag:row.displayTag,nickname:row.nickname,messageCount:row.messageCount,firstSeenAt:row.firstSeenAt,lastSeenAt:row.lastSeenAt,banned:row.banned===1,bannedAt:row.bannedAt};
}

export async function ensureFeedbackUser(sessionHash:string,nickname:string,now:Date){
  const existing=await db().prepare('SELECT display_tag AS displayTag,nickname,message_count AS messageCount,first_seen_at AS firstSeenAt,last_seen_at AS lastSeenAt,banned,banned_at AS bannedAt FROM feedback_sessions WHERE session_hash=?').bind(sessionHash).first<FeedbackUserRow>();
  if(existing){
    if(existing.banned===1)return summary(existing);
    if(existing.nickname!==nickname)await db().prepare('UPDATE feedback_sessions SET nickname=? WHERE session_hash=?').bind(nickname,sessionHash).run();
    return {...summary(existing),nickname};
  }
  const timestamp=now.toISOString();
  const tag=feedbackDisplayTag(sessionHash);
  await db().prepare('INSERT INTO feedback_sessions (session_hash,display_tag,nickname,message_count,first_seen_at,last_seen_at,banned,banned_at) VALUES (?,?,?,?,?,?,0,NULL)').bind(sessionHash,tag,nickname,0,timestamp,timestamp).run();
  return {tag,nickname,messageCount:0,firstSeenAt:timestamp,lastSeenAt:timestamp,banned:false,bannedAt:null} satisfies FeedbackUserSummary;
}

export async function recordFeedbackDelivery(sessionHash:string,nickname:string,now:Date){
  await db().prepare('UPDATE feedback_sessions SET nickname=?,message_count=message_count+1,last_seen_at=? WHERE session_hash=?').bind(nickname,now.toISOString(),sessionHash).run();
}

export async function listFeedbackUsers():Promise<FeedbackUserSummary[]>{
  const rows=await db().prepare('SELECT display_tag AS displayTag,nickname,message_count AS messageCount,first_seen_at AS firstSeenAt,last_seen_at AS lastSeenAt,banned,banned_at AS bannedAt FROM feedback_sessions ORDER BY banned DESC,last_seen_at DESC').all<FeedbackUserRow>();
  return rows.results.map(summary);
}

export async function setFeedbackUserBanned(tag:string,banned:boolean,now:Date){
  if(!/^HK-[A-F0-9]{10}$/.test(tag))throw new Error('피드백 사용자 태그를 확인해 주세요.');
  const result=await db().prepare('UPDATE feedback_sessions SET banned=?,banned_at=? WHERE display_tag=?').bind(banned?1:0,banned?now.toISOString():null,tag).run();
  if((result.meta?.changes??0)<1)throw new Error('피드백 사용자를 찾을 수 없습니다.');
}
