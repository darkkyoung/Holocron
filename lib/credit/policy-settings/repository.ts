import {PolicyError,validatePolicy,kstMonth,DEFAULT_CREDIT_POLICY,type PolicyKey,type PolicySnapshot} from './domain';
export const policyVersionSql='(SELECT version FROM credit_policy_revisions ORDER BY version DESC LIMIT 1)';
/** Field names come only from the typed server call sites, never request text. */
export function policyValueSql(key:PolicyKey){return `(SELECT json_extract(policy_json,'$.${key}') FROM credit_policy_revisions ORDER BY version DESC LIMIT 1)`;}
type Row={version:number;policy_json:string;previous_json:string|null;changed_at:string;actor:string};
function snapshot(row:Row|undefined):PolicySnapshot{if(!row)throw new PolicyError('POLICY_UNAVAILABLE',503);return {version:row.version,values:validatePolicy(JSON.parse(row.policy_json)),changedAt:row.changed_at};}
export async function readPolicy(db:D1Database){return snapshot(await db.prepare('SELECT * FROM credit_policy_revisions ORDER BY version DESC LIMIT 1').first<Row>()??undefined);}
export async function savePolicy(db:D1Database,expectedVersion:unknown,input:unknown,now=new Date()){
  if(typeof expectedVersion!=='number'||!Number.isSafeInteger(expectedVersion)||expectedVersion<1||expectedVersion>=Number.MAX_SAFE_INTEGER)throw new PolicyError('INVALID_POLICY',400);
  const values=validatePolicy(input),id=crypto.randomUUID();
  const results=await db.batch([db.prepare(`INSERT INTO credit_policy_revisions(id,version,policy_json,previous_json,changed_at,actor)
    SELECT ?,version+1,?,policy_json,?,'admin' FROM credit_policy_revisions WHERE version=? AND version=${policyVersionSql}`)
    .bind(id,JSON.stringify(values),now.toISOString(),expectedVersion),db.prepare('SELECT * FROM credit_policy_revisions WHERE id=?').bind(id)]);
  if(results.some(r=>!r.success))throw new PolicyError('POLICY_UNAVAILABLE',503);
  if(!results[0].meta.changes)throw new PolicyError('POLICY_CONFLICT',409);
  return snapshot(results[1].results[0] as Row);
}
export type MonthlyCost={month:string;reserved_micros:number;reconciled_reserved_micros:number;actual_micros:number;attempts:number;known_attempts:number};
export async function policyDashboard(db:D1Database,now=Date.now()){
  const result=await db.batch([db.prepare('SELECT * FROM credit_policy_revisions ORDER BY version DESC LIMIT 20'),db.prepare('SELECT * FROM assistant_monthly_costs ORDER BY month DESC LIMIT 24'),db.prepare(`SELECT ${Object.keys(DEFAULT_CREDIT_POLICY).map(k=>`max(IIF(previous_json IS NULL OR json_extract(policy_json,'$.${k}')<>json_extract(previous_json,'$.${k}'),changed_at,NULL)) AS ${k}`).join(',')} FROM credit_policy_revisions`)]);
  if(result.some(r=>!r.success))throw new PolicyError('POLICY_UNAVAILABLE',503);
  const rows=result[0].results as Row[],policy=snapshot(rows[0]),months=result[1].results as MonthlyCost[],month=kstMonth(now);
  const current=months.find(m=>m.month===month),usedMicros=current?current.reserved_micros-current.reconciled_reserved_micros+current.actual_micros:0;
  return {policy,appliedAt:result[2].results[0] as Record<PolicyKey,string>,history:rows.map(r=>({...snapshot(r),previous:r.previous_json?validatePolicy(JSON.parse(r.previous_json)):null,actor:r.actor})),months,month,usedMicros,
    remainingMicros:Math.max(0,policy.values.monthlyLimitUsd*1000000-usedMicros),warning:usedMicros>=policy.values.monthlyWarningUsd*1000000,blocked:usedMicros>=policy.values.monthlyLimitUsd*1000000};
}
export type PolicyDashboard=Awaited<ReturnType<typeof policyDashboard>>;
