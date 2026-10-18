import {policyValueSql,readPolicy} from '../policy-settings/repository';
import {publicPolicy} from '../policy-settings/domain';
import {rewardWalletsSql} from './provenance';
import {prepareRewardMutation} from '../repository';
import {CreditError,type CreditOwner} from '../types';
import {validateOwner} from '../policy';
import {FIRST_VISIT_KEY,OPENING_KEY,attendanceKey,attendanceState,kstWeek,type GuestCreditState,type RewardSummary} from './policy';

type RewardRow={id:string;key:string;requested:number;applied:number;date:string|null};
export async function claimVisitRewards(database:D1Database,owner:CreditOwner,now:Date):Promise<GuestCreditState>{
  validateOwner(owner);
  const {today,week,dates}=kstWeek(now),keys=dates.map(date=>attendanceKey(week,date));
  const claims=[{key:FIRST_VISIT_KEY,reason:'first_visit'},{key:OPENING_KEY,reason:'opening'},{key:attendanceKey(week,today),reason:'attendance'}] as const;
  const ids=claims.map(()=>crypto.randomUUID());
  const statements=claims.map((claim,index)=>prepareRewardMutation(database,{owner,idempotencyKey:claim.key,reference:{type:claim.reason,id:index===2?today:'v1'}},ids[index],now,index===2?{
    // Seven consecutive days within Mon–Sun is possible only on Sunday. Read the six prior keys atomically.
    sql:`SELECT CASE WHEN ?=? AND (SELECT COUNT(DISTINCT idempotency_key) FROM credit_ledger WHERE wallet_id IN (${rewardWalletsSql}) AND idempotency_key IN (${keys.slice(0,6).map(()=>'?').join(',')}))=6 THEN ${policyValueSql('attendanceDay7')} ELSE ${policyValueSql('attendanceDaily')} END`,
    bindings:[today,dates[6],owner.principalId,owner.principalId,...keys.slice(0,6)],
  }:{sql:`SELECT ${policyValueSql(index===0?'guestFirst':'opening')} FROM credit_principals WHERE id=? AND type='guest' AND retired_at IS NULL`,bindings:[owner.principalId]}));
  statements.push(database.prepare(`SELECT balance,p.type FROM credit_wallets w JOIN credit_principals p ON p.id=w.principal_id WHERE p.id=? AND p.retired_at IS NULL`).bind(owner.principalId));
  statements.push(database.prepare(`SELECT id,idempotency_key AS key,requested_amount AS requested,applied_amount AS applied,reference_id AS date FROM credit_ledger WHERE wallet_id IN (${rewardWalletsSql}) AND idempotency_key IN (${[...keys,FIRST_VISIT_KEY,OPENING_KEY].map(()=>'?').join(',')})`).bind(owner.principalId,owner.principalId,...keys,FIRST_VISIT_KEY,OPENING_KEY));
  try{
    const results=await database.batch(statements);
    if(results.some(result=>!result.success))throw new Error();
    const wallet=results[3].results[0] as {balance:number;type:'guest'|'account'}|undefined,rows=results[4].results as RewardRow[];
    if(!wallet||claims.filter(claim=>wallet.type==='guest'||claim.reason==='attendance').some(claim=>!rows.some(row=>row.key===claim.key)))throw new Error();
    const attendance=attendanceState(now,rows.filter(row=>keys.includes(row.key)).map(row=>row.date!));
    const rewards:RewardSummary[]=claims.flatMap((claim,index)=>{
      const row=rows.find(row=>row.id===ids[index]);
      return row?[{reason:claim.reason,requested:row.requested,applied:row.applied,...(index===2?{streak:attendance.streak}:{})}]:[];
    });
    return {balance:wallet.balance,ownerType:wallet.type,cap:wallet.type==='guest'?10:null,attendance,rewards,policy:publicPolicy(await readPolicy(database))};
  }catch{throw new CreditError('UNAVAILABLE');}
}
