import {MAX_CREDIT_INTEGER} from './policy';
import type {CreditCommand} from './types';
/** Correlated aliases: refund, debit, assistant_admissions. Requested amount consumes
 * the entire original entitlement; applied amount may be capped by existing guards.
 * A missing ledger entry (including an Account overflow) is NEVER a settlement. */
export const assistantRefundMatchSql=`refund.original_entry_id=debit.id AND refund.wallet_id=debit.wallet_id
    AND debit.wallet_id=assistant_admissions.principal_id
    AND debit.operation='debit' AND debit.kind='ai_spend' AND debit.reference_type='assistant_request' AND debit.reference_id=assistant_admissions.request_id
    AND refund.operation='refund' AND refund.kind='refund' AND refund.idempotency_key='assistant:refund:'||assistant_admissions.request_id
    AND refund.reference_type='assistant_request' AND refund.reference_id=assistant_admissions.request_id
    AND refund.requested_amount=-debit.applied_amount AND refund.applied_amount BETWEEN 0 AND refund.requested_amount`;
export const terminalAssistantRefundSql=`EXISTS (
  SELECT 1 FROM credit_ledger refund JOIN credit_ledger debit ON debit.id=assistant_admissions.debit_entry_id
  WHERE ${assistantRefundMatchSql}
)`;
/** Internal SQL predicate, correlated with prepareMutation's w and input aliases.
 * Requires the canonical 0017 schema. Reserves ledger slots ONLY, never wallet balance.
 * Closed success is owner-token CAS; failed labels need durable refund proof.
 * An expired lease still needs a settlement entry. No second balance is stored. */
export function refundSequencePredicate(command:CreditCommand,entryId:string){
  return {sql:`(WITH m AS (SELECT ? AS operation,? AS kind,? AS key,? AS ref_type,? AS ref_id,? AS original,? AS entry_id),
    pending AS (
      SELECT debit.id,-debit.applied_amount AS amount,assistant_admissions.request_id,assistant_admissions.state
      FROM assistant_admissions JOIN credit_ledger debit ON debit.id=assistant_admissions.debit_entry_id
      WHERE assistant_admissions.principal_id=w.principal_id AND debit.wallet_id=w.principal_id
        AND debit.operation='debit' AND debit.kind='ai_spend' AND debit.reference_type='assistant_request'
        AND debit.reference_id=assistant_admissions.request_id AND assistant_admissions.state<>'completed'
        AND NOT ${terminalAssistantRefundSql}
    ), totals AS (SELECT count(*) AS slots FROM pending),
    own_refund AS (
      SELECT amount FROM pending,m WHERE pending.id=m.original AND m.operation='refund' AND m.kind='refund'
        AND m.key='assistant:refund:'||pending.request_id AND m.ref_type='assistant_request' AND m.ref_id=pending.request_id
        AND input.amount=pending.amount AND pending.state='refund_pending'
    ), change AS (SELECT
      IIF(m.operation='debit' AND m.kind='ai_spend' AND m.ref_type='assistant_request',1,0) AS reserving,
      (SELECT count(*) FROM own_refund) AS released_slots FROM m)
    SELECT
      -- Subtraction avoids overflow; even a zero-applied refund needs one entry.
      totals.slots-change.released_slots+change.reserving<=${MAX_CREDIT_INTEGER}-w.version-1
      -- Only a request for the entire original debit consumes its reserved slot.
      AND (NOT EXISTS (SELECT 1 FROM pending,m WHERE pending.id=m.original) OR change.released_slots=1)
      -- Generic callers cannot invent an assistant debit outside atomic admission.
      AND (change.reserving=0 OR EXISTS (SELECT 1 FROM assistant_admissions a,m
        WHERE a.principal_id=w.principal_id AND a.request_id=m.ref_id AND a.debit_entry_id=m.entry_id AND a.state='started'
          AND m.key='assistant:spend:'||a.request_id||':'||a.input_hmac
          AND a.action<>'retrieve' AND input.amount<0))
    FROM totals CROSS JOIN change)`,bindings:[command.operation,command.kind,command.idempotencyKey,
      command.reference?.type??null,command.reference?.id??null,command.originalEntryId??null,entryId]};
}
