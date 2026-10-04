import {db} from '@/lib/news';

export const ADMIN_LOGIN_WINDOW_MS=15*60*1000;
export const ADMIN_LOGIN_MAX_FAILURES=8;
export const ADMIN_LOGIN_BLOCK_MS=15*60*1000;
export const ADMIN_LOGIN_STALE_MS=48*60*60*1000;
export const ADMIN_LOGIN_CLEANUP_LIMIT=100;

export type AdminLoginRateLimit={failedCount:number;windowStartedAt:number;blockedUntil:number|null;updatedAt:number;blocked:boolean};
type RateLimitRow={failedCount:number;windowStartedAt:number;blockedUntil:number|null;updatedAt:number};

function status(row:RateLimitRow|null|undefined,now:number):AdminLoginRateLimit{
  return {...(row??{failedCount:0,windowStartedAt:now,blockedUntil:null,updatedAt:now}),blocked:!!row?.blockedUntil&&row.blockedUntil>now};
}

export async function getAdminLoginRateLimit(clientHash:string,now:number){
  const row=await db().prepare('SELECT failed_count AS failedCount,window_started_at AS windowStartedAt,blocked_until AS blockedUntil,updated_at AS updatedAt FROM admin_login_rate_limits WHERE client_hash=?').bind(clientHash).first<RateLimitRow>();
  return status(row,now);
}

export async function recordFailedAdminLogin(clientHash:string,now:number){
  const cutoff=now-ADMIN_LOGIN_WINDOW_MS,blockedUntil=now+ADMIN_LOGIN_BLOCK_MS;
  const row=await db().prepare(`INSERT INTO admin_login_rate_limits (client_hash,failed_count,window_started_at,blocked_until,updated_at) VALUES (?,1,?,NULL,?)
    ON CONFLICT(client_hash) DO UPDATE SET
      failed_count=CASE WHEN admin_login_rate_limits.blocked_until>? THEN admin_login_rate_limits.failed_count WHEN admin_login_rate_limits.window_started_at<=? THEN 1 ELSE admin_login_rate_limits.failed_count+1 END,
      window_started_at=CASE WHEN admin_login_rate_limits.blocked_until>? THEN admin_login_rate_limits.window_started_at WHEN admin_login_rate_limits.window_started_at<=? THEN ? ELSE admin_login_rate_limits.window_started_at END,
      blocked_until=CASE WHEN admin_login_rate_limits.blocked_until>? THEN admin_login_rate_limits.blocked_until WHEN admin_login_rate_limits.window_started_at<=? THEN NULL WHEN admin_login_rate_limits.failed_count+1>=? THEN ? ELSE NULL END,
      updated_at=?
    RETURNING failed_count AS failedCount,window_started_at AS windowStartedAt,blocked_until AS blockedUntil,updated_at AS updatedAt`)
    .bind(clientHash,now,now,now,cutoff,now,cutoff,now,now,cutoff,ADMIN_LOGIN_MAX_FAILURES,blockedUntil,now).first<RateLimitRow>();
  if(!row)throw new Error('로그인 제한 상태를 기록할 수 없습니다.');
  return status(row,now);
}

export async function clearAdminLoginRateLimit(clientHash:string){
  await db().prepare('DELETE FROM admin_login_rate_limits WHERE client_hash=?').bind(clientHash).run();
}

export async function cleanupStaleAdminLoginRateLimits(now:number){
  const cutoff=now-ADMIN_LOGIN_STALE_MS;
  await db().prepare('DELETE FROM admin_login_rate_limits WHERE client_hash IN (SELECT client_hash FROM admin_login_rate_limits WHERE updated_at<? ORDER BY updated_at LIMIT ?)').bind(cutoff,ADMIN_LOGIN_CLEANUP_LIMIT).run();
}
