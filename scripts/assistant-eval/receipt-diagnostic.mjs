import {request,secrets} from './local-runtime.mjs';
const REASONS=new Set(['SESSION_COOKIE_INVALID_AT_ISSUE','RECEIPT_INVALID_AT_ISSUE','SESSION_BINDING_CHANGED','RECEIPT_NOT_YET_VALID','RECEIPT_EXPIRED','EVIDENCE_SNAPSHOT_OR_SELECTION','RECEIPT_DIAGNOSTIC_UNAVAILABLE']);
const delta=v=>Number.isSafeInteger(v)&&Math.abs(v)<=31*86400000?v:null;
export class EvaluationEvidenceError extends Error{
  constructor(caseId,detail){
    super('EVIDENCE_CHANGED');this.code='EVIDENCE_CHANGED';
    this.evaluationDiagnostic=Object.freeze({phase:'selected_evidence_preparation',caseId:/^[PS][0-9]{2}$/.test(caseId)?caseId:'UNKNOWN',
      reason:REASONS.has(detail.reason)?detail.reason:'RECEIPT_DIAGNOSTIC_UNAVAILABLE',
      issuedDeltaMs:delta(detail.issuedDeltaMs),expiryRemainingMs:delta(detail.expiryRemainingMs),
      bindingSame:typeof detail.bindingSame==='boolean'?detail.bindingSame:null,
      receiptValidAtIssue:detail.receiptValidAtIssue===true});
  }
}
/** On failure only: use the ORIGINAL cookie/receipt and production verifiers at
 * their issuance time to classify. Never replace either, retry retrieval, or
 * turn failure into success. No decryption/validation implementation is copied. */
export async function evidenceFailure(runtime,{caseId,cookie,receipt,binding,issuedAt,verifiedAt}){
  const detail={reason:'RECEIPT_DIAGNOSTIC_UNAVAILABLE'};
  try{
    const session=await runtime.m('assistant/identity').assistantSession(request('/',{},cookie),secrets.secret,issuedAt);
    if(session.setCookie)detail.reason='SESSION_COOKIE_INVALID_AT_ISSUE';
    else{
      detail.reason='RECEIPT_INVALID_AT_ISSUE';
      const claims=await runtime.m('assistant/receipts').verifyReceipt(receipt,session.binding,secrets.secret,issuedAt);
      Object.assign(detail,{receiptValidAtIssue:true,bindingSame:claims.binding===binding,issuedDeltaMs:verifiedAt-claims.issued,expiryRemainingMs:claims.expires-verifiedAt});
      detail.reason=!detail.bindingSame?'SESSION_BINDING_CHANGED':claims.issued>verifiedAt?'RECEIPT_NOT_YET_VALID':claims.expires<=verifiedAt?'RECEIPT_EXPIRED':'EVIDENCE_SNAPSHOT_OR_SELECTION';
    }
  }catch{/* Keep only the fixed stage reached; never retain the exception/payload. */}
  return new EvaluationEvidenceError(caseId,detail);
}
export function evaluationFailureReport(error){
  return {status:'STOP',code:/^[A-Z_]+$/.test(error?.message)?error.message:'EVALUATION_FAILED',
    ...(error instanceof EvaluationEvidenceError?{evaluationDiagnostic:error.evaluationDiagnostic}:{})};
}
