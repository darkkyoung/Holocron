import {AssistantError} from './types';

/** Internal, content-free observations. Never serialized into the public API.
 * Reasons and paths describe code/schema, never rejected keys, IDs or prose. */
const stages={
  CONTENT_TYPE:'response_body',MISSING_BODY:'response_body',BODY_READ_OR_ENCODING:'response_body',BODY_LIMIT:'response_body',ENVELOPE_JSON:'response_body',
  ENVELOPE_OBJECT:'response_envelope',RESPONSE_STATUS:'response_envelope',RESPONSE_METADATA:'response_envelope',OUTPUT_COUNT:'response_envelope',MESSAGE_SHAPE:'response_envelope',INVALID_USAGE:'response_envelope',REFUSAL:'response_envelope',
  OUTPUT_JSON:'output_json',
  SCHEMA_TYPE:'schema',STRING_LENGTH:'schema',STRING_ENUM:'schema',ARRAY_LENGTH:'schema',OBJECT_KEYS:'schema',
  UNSAFE_PROSE:'grounding',DUPLICATE_REFERENCE:'grounding',MISSING_REFERENCE:'grounding',UNKNOWN_EVIDENCE:'grounding',UNSAFE_CITATION:'grounding',MISSING_SUPPORT:'grounding',SUPPORT_REFERENCE:'grounding',SUPPORT_SPAN:'grounding',UNCOVERED_EVIDENCE:'grounding',OFFICIAL_PROMOTION:'grounding',SPECULATION_SUPPORT:'grounding',UNCERTAINTY_LOST:'grounding',UNSUPPORTED_NUMBER:'grounding',DATE_ORDER:'grounding',STATUS_CONTENT:'grounding',UNKNOWN_FACT:'grounding',TEXT_TOTAL:'grounding',
  DRAFT_PRESENCE:'draft',DRAFT_FACT_TEXT:'draft',CREATIVE_BOUNDARY:'draft',PUBLIC_BODY_LIMIT:'output_size',
} as const;
export type OutputReason=keyof typeof stages;
export type OutputDiagnostic={stage:typeof stages[OutputReason];reason:OutputReason;path:string};
const field='status|answer|limitations|facts|factId|text|evidenceIds|certainty|supports|evidenceId|field|span|caveats|outline|heading|factIds|creativeNote|draft|kind';
const pathPattern=new RegExp(`^\\$(?:\\.(?:${field})|\\[(?:0|[1-9][0-9]{0,2})\\])*$`);
export function outputDiagnostic(reason:OutputReason,path='$'):OutputDiagnostic{
  // Defensive runtime allowlist even when a JS test observer supplies bad values.
  const safe=Object.hasOwn(stages,reason)?reason:'RESPONSE_METADATA';
  return Object.freeze({stage:stages[safe],reason:safe,path:typeof path==='string'&&path.length<=200&&pathPattern.test(path)?path:'$'});
}
export class OutputValidationError extends AssistantError{
  readonly diagnostic:OutputDiagnostic;
  constructor(reason:OutputReason,path='$'){super('INVALID_OUTPUT',502);this.diagnostic=outputDiagnostic(reason,path);}
}
export const invalidOutput=(reason:OutputReason,path='$'):never=>{throw new OutputValidationError(reason,path);};
export type OutputObserver=(diagnostic:OutputDiagnostic)=>void|Promise<void>;
export function observeOutput(observer:OutputObserver|undefined,value:OutputDiagnostic|undefined){
  if(!observer||!value)return;
  // Observation failure must never replace the original error or affect settlement.
  try{void Promise.resolve(observer(outputDiagnostic(value.reason,value.path))).catch(()=>{});}catch{/* No observer error text is exposed. */}
}
