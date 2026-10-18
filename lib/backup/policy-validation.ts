import {validatePolicy,DEFAULT_CREDIT_POLICY} from '../credit/policy-settings/domain';
import type {HolocronBackup} from './format';
/** v7 only. Historical v1–v6 envelopes retain their exact dataset and audit contracts. */
export function validatePolicyBackup(backup:HolocronBackup,fail:(message:string)=>never){
  const rows=[...backup.tables.credit_policy_revisions??[]].sort((a,b)=>Number(a.version)-Number(b.version));
  if(!rows.length)fail('Missing Credit policy history.');
  let previous:string|null=null,time='';
  for(let i=0;i<rows.length;i++){
    const row=rows[i];let values;
    try{values=validatePolicy(JSON.parse(String(row.policy_json)));}catch{fail('Invalid Credit policy values.');}
    if(row.version!==i+1||row.previous_json!==previous||row.actor!==(i===0?'system':'admin'))fail('Invalid Credit policy chain.');
    if(i===0&&JSON.stringify(values)!==JSON.stringify(DEFAULT_CREDIT_POLICY))fail('Invalid default Credit policy.');
    const t=String(row.changed_at);
    if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(t)||!Number.isFinite(Date.parse(t))||new Date(t).toISOString()!==t||t<time)fail('Invalid Credit policy timestamp.');
    previous=String(row.policy_json);time=t;
  }
  for(const row of backup.tables.assistant_monthly_costs??[]){
    const reserved=Number(row.reserved_micros),reconciled=Number(row.reconciled_reserved_micros),actual=Number(row.actual_micros),attempts=Number(row.attempts),known=Number(row.known_attempts);
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(row.month))||reserved<0||reconciled<0||reconciled>reserved||actual<0||actual>reconciled||attempts<1||known<0||known>attempts||(known===0&&(actual!==0||reconciled!==0))||(known===attempts&&reconciled!==reserved))fail('Invalid monthly Assistant cost audit.');
  }
}
