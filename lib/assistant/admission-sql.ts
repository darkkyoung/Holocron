import {policyVersionSql,policyValueSql} from '../credit/policy-settings/repository';
import {kstMonth} from '../credit/policy-settings/domain';
import {ADMISSION_LIMITS as L,utcDay} from './limits';
import {spendKey,terminalAssistantRefundSql} from './credit';
export type AdmissionInput={securityPolicy?:'edge-v1'|'account-v1';requestId:string;action:'retrieve'|'qa'|'planner'|'draft';sessionHash:string;networkHash:string;previousNetworkHash:string;
  inputHmac:string;ownerToken:string;principalId:string|null;debitEntryId:string|null;weight:number;credits:number;reservedCostMicros:number;policyVersion?:number;now:number};
export function admissionDecision(i:AdmissionInput){
  const columns=['request_id','action','session_hash','network_hash','previous_network_hash','input_hmac','owner_token','principal_id','debit_entry_id','weight','credits','reserved_cost_micros','now','day','spend_key','policy_version','month','security_policy'];
  const bindings=[i.requestId,i.action,i.sessionHash,i.networkHash,i.previousNetworkHash,i.inputHmac,i.ownerToken,i.principalId,i.debitEntryId,i.weight,i.credits,i.reservedCostMicros,i.now,utcDay(i.now),spendKey(i.requestId,i.inputHmac),i.policyVersion??1,kstMonth(i.now),i.securityPolicy??'edge-v1'];
  const sql=`WITH i AS (SELECT ${columns.map(c=>`? AS ${c}`).join(',')}), usage AS (
    SELECT count(*) AS capacity,
      COALESCE(sum(a.action<>'retrieve' AND a.state='started' AND a.lease_expires_at>i.now),0) AS active_global,
      COALESCE(sum(a.action<>'retrieve' AND a.state='started' AND a.lease_expires_at>i.now AND (a.session_hash=i.session_hash OR a.principal_id=i.principal_id)),0) AS active_session,
      COALESCE(sum(IIF(a.action<>'retrieve' AND a.created_at>i.now-3600000 AND (a.session_hash=i.session_hash OR (i.security_policy='account-v1' AND a.principal_id=i.principal_id)),a.weight,0)),0) AS session_hour,
      COALESCE(sum(IIF(a.action<>'retrieve' AND a.created_at>=i.day AND (a.session_hash=i.session_hash OR (i.security_policy='account-v1' AND a.principal_id=i.principal_id)),a.weight,0)),0) AS session_day,
      COALESCE(sum(IIF(a.action<>'retrieve' AND a.created_at>i.now-3600000 AND a.network_hash IN (i.network_hash,i.previous_network_hash),a.weight,0)),0) AS network_hour,
      COALESCE(sum(IIF(a.action<>'retrieve' AND a.created_at>=i.day AND a.network_hash=i.network_hash,a.weight,0)),0) AS network_day,
      COALESCE(sum(IIF(a.action<>'retrieve' AND a.created_at>=i.day,a.weight,0)),0) AS global_day,
      COALESCE(sum(IIF(a.action<>'retrieve' AND (a.created_at>=i.day OR a.state IN ('started','refund_pending')),COALESCE(a.actual_cost_micros,a.reserved_cost_micros),0)),0) AS cost,
      COALESCE(sum(a.action='retrieve' AND a.created_at>i.now-60000 AND a.session_hash=i.session_hash),0) AS retrieval_session,
      COALESCE(sum(a.action='retrieve' AND a.created_at>i.now-60000 AND a.network_hash IN (i.network_hash,i.previous_network_hash)),0) AS retrieval_network,
      COALESCE(sum(a.action='retrieve' AND a.created_at>i.now-60000),0) AS retrieval_global
    FROM assistant_admissions a CROSS JOIN i
  ), decision AS (SELECT CASE
    WHEN EXISTS (SELECT 1 FROM assistant_admissions a WHERE a.request_id=i.request_id AND (a.security_policy<>i.security_policy OR a.input_hmac<>i.input_hmac OR a.session_hash<>i.session_hash OR a.principal_id IS NOT i.principal_id)) THEN 'REQUEST_CONFLICT'
    WHEN EXISTS (SELECT 1 FROM assistant_admissions a WHERE a.request_id=i.request_id AND a.state='started' AND a.lease_expires_at>i.now) THEN 'REQUEST_IN_PROGRESS'
    WHEN EXISTS (SELECT 1 FROM assistant_admissions a WHERE a.request_id=i.request_id) THEN 'RESULT_NOT_RETAINED'
    WHEN EXISTS (SELECT 1 FROM credit_ledger WHERE reference_type='assistant_request' AND reference_id=i.request_id AND kind='ai_spend' AND (wallet_id IS NOT i.principal_id OR idempotency_key<>i.spend_key)) THEN 'REQUEST_CONFLICT'
    WHEN EXISTS (SELECT 1 FROM credit_ledger WHERE reference_type='assistant_request' AND reference_id=i.request_id) THEN 'RESULT_NOT_RETAINED'
    WHEN usage.capacity>=${L.capacity} THEN 'ADMISSION_CAPACITY'
    WHEN i.action<>'retrieve' AND EXISTS (SELECT 1 FROM credit_principals WHERE id=i.principal_id AND type='guest') THEN 'LOGIN_REQUIRED'
    WHEN i.action<>'retrieve' AND NOT EXISTS (SELECT 1 FROM credit_wallets w JOIN credit_principals p ON p.id=w.principal_id WHERE p.id=i.principal_id AND p.type='account' AND p.retired_at IS NULL) THEN 'OWNER_UNAVAILABLE'
    WHEN i.action<>'retrieve' AND (i.policy_version<>${policyVersionSql} OR i.credits<>IIF(i.action='qa',${policyValueSql('qaCredits')},IIF(i.action='planner',${policyValueSql('plannerCredits')},15))) THEN 'PRICE_CHANGED'
    WHEN i.action<>'retrieve' AND i.reserved_cost_micros>${policyValueSql('monthlyLimitUsd')}*1000000-COALESCE((SELECT reserved_micros-reconciled_reserved_micros+actual_micros FROM assistant_monthly_costs WHERE month=i.month),0) THEN 'MONTHLY_BUDGET_EXCEEDED'
    WHEN i.action<>'retrieve' AND (SELECT balance FROM credit_wallets WHERE principal_id=i.principal_id)<i.credits THEN 'INSUFFICIENT_BALANCE'
    WHEN i.action='retrieve' AND (usage.retrieval_session>=${L.retrievalSession} OR usage.retrieval_network>=${L.retrievalNetwork} OR usage.retrieval_global>=${L.retrievalGlobal}) THEN 'ADMISSION_LIMIT'
    WHEN i.action<>'retrieve' AND (usage.active_session>=${L.sessionConcurrent} OR usage.active_global>=${L.globalConcurrent}
      OR usage.session_hour+i.weight>${L.sessionHour} OR usage.session_day+i.weight>${L.sessionDay}
      OR (i.security_policy='edge-v1' AND (usage.network_hour+i.weight>${L.networkHour} OR usage.network_day+i.weight>${L.networkDay}))
      OR usage.global_day+i.weight>${L.globalDay} OR usage.cost+i.reserved_cost_micros>${L.dailyMicros}) THEN 'ADMISSION_LIMIT'
    ELSE NULL END AS error FROM i CROSS JOIN usage)
  `;
  return {sql,bindings};
}
export const cleanupSql=`DELETE FROM assistant_admissions WHERE request_id IN (
  SELECT request_id FROM assistant_admissions WHERE expires_at<=?
    AND (state='completed' OR (state='failed' AND ${terminalAssistantRefundSql}))
    ORDER BY expires_at,request_id LIMIT ${L.cleanup}
)`;
