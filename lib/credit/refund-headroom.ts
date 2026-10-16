import {MAX_CREDIT_INTEGER} from './policy';
import type {CreditCommand} from './types';
/** Correlated with assistant_admissions. A terminal failure requires durable proof of
 * the entire original debit's compensation, not merely a mutable operational label. */
export const fullAssistantRefundSql=`EXISTS (
  SELECT 1 FROM credit_ledger refund JOIN credit_ledger debit ON debit.id=assistant_admissions.debit_entry_id
  WHERE refund.original_entry_id=debit.id AND refund.wallet_id=debit.wallet_id AND debit.wallet_id=assistant_admissions.principal_id
    AND debit.operation='debit' AND debit.kind='ai_spend' AND debit.reference_type='assistant_request' AND debit.reference_id=assistant_admissions.request_id
    AND refund.operation='refund' AND refund.kind='refund' AND refund.idempotency_key='assistant:refund:'||assistant_admissions.request_id
    AND refund.applied_amount=-debit.applied_amount
)`;
/** Internal SQL predicate, correlated with prepareMutation's w and input aliases.
 * Requires the canonical 0017 schema. No balance/quota check is made in JS.
 * Closed success is owner-token CAS; failed labels need durable refund proof.
 * An expired lease is still an obligation. No second balance is stored. */
export function refundHeadroomPredicate(command:CreditCommand,entryId:string){
  return {sql:`(WITH m AS (SELECT ? AS operation,? AS kind,? AS key,? AS ref_type,? AS ref_id,? AS original,? AS entry_id),
    pending AS (
      SELECT debit.id,-debit.applied_amount AS amount,assistant_admissions.request_id,assistant_admissions.state
      FROM assistant_admissions JOIN credit_ledger debit ON debit.id=assistant_admissions.debit_entry_id
      WHERE assistant_admissions.principal_id=w.principal_id AND debit.wallet_id=w.principal_id
        AND debit.operation='debit' AND debit.kind='ai_spend' AND debit.reference_type='assistant_request'
        AND debit.reference_id=assistant_admissions.request_id AND assistant_admissions.state<>'completed'
        AND NOT ${fullAssistantRefundSql}
    ), totals AS (SELECT COALESCE(sum(amount),0) AS liability,count(*) AS slots FROM pending),
    own_refund AS (
      SELECT amount FROM pending,m WHERE pending.id=m.original AND m.operation='refund' AND m.kind='refund'
        AND m.key='assistant:refund:'||pending.request_id AND m.ref_type='assistant_request' AND m.ref_id=pending.request_id
        AND input.amount=pending.amount AND pending.state='refund_pending'
    ), change AS (SELECT
      IIF(m.operation='debit' AND m.kind='ai_spend' AND m.ref_type='assistant_request',1,0) AS reserving,
      COALESCE((SELECT amount FROM own_refund),0) AS releasing,
      (SELECT count(*) FROM own_refund) AS released_slots FROM m)
    SELECT
      -- Subtract before comparing: never evaluate a JS sum near MAX_SAFE_INTEGER.
      totals.liability-change.releasing+IIF(change.reserving=1,-input.amount,0)
        <=${MAX_CREDIT_INTEGER}-(w.balance+input.amount)
      AND totals.slots-change.released_slots+change.reserving<=${MAX_CREDIT_INTEGER}-w.version-1
      -- Only the full, request-correlated refund can consume its reservation.
      AND (NOT EXISTS (SELECT 1 FROM pending,m WHERE pending.id=m.original) OR change.released_slots=1)
      -- Generic callers cannot invent an assistant debit outside atomic admission.
      AND (change.reserving=0 OR EXISTS (SELECT 1 FROM assistant_admissions a,m
        WHERE a.principal_id=w.principal_id AND a.request_id=m.ref_id AND a.debit_entry_id=m.entry_id AND a.state='started'
          AND m.key='assistant:spend:'||a.request_id||':'||a.input_hmac
          AND a.action<>'retrieve' AND input.amount<0))
    FROM totals CROSS JOIN change)`,bindings:[command.operation,command.kind,command.idempotencyKey,
      command.reference?.type??null,command.reference?.id??null,command.originalEntryId??null,entryId]};
}
