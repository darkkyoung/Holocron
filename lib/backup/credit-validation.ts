import type {BackupRow,HolocronBackup} from './format';

/** v4 only. Validates graph and complete ledger effects without executing restore SQL. */
export function validateCreditBackup(backup:HolocronBackup,fail:(message:string)=>never){
  const tables=backup.tables,users=new Set(tables.users!.map(row=>row.id));
  const principals=new Map(tables.credit_principals!.map(row=>[row.id,row]));
  const wallets=new Map(tables.credit_wallets!.map(row=>[row.principal_id,row]));
  const entries=new Map(tables.credit_ledger!.map(row=>[row.id,row]));
  const validText=(value:unknown,max=200)=>typeof value==='string'&&value.length>0&&value.length<=max&&value.trim()===value&&!/[\u0000-\u001f\u007f]/.test(value);
  const timestamp=(value:unknown)=>typeof value==='string'&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString()===value;
  for(const name of ['users','auth_accounts','credit_principals','credit_wallets','credit_ledger'] as const)for(const row of tables[name]!){
    if(!timestamp(row.created_at))fail('Invalid Credit creation timestamp.');
  }
  for(const row of tables.auth_accounts!){
    if(!users.has(row.user_id)||!validText(row.provider,32)||!/^[a-z][a-z0-9_-]*$/.test(String(row.provider))||!validText(row.provider_subject,255))fail('Invalid provider linkage.');
  }
  for(const row of principals.values()){
    if(!validText(row.id)||(row.retired_at!==null&&!timestamp(row.retired_at)))fail('Invalid Credit principal.');
    if(row.type==='guest'){
      if(row.user_id!==null||typeof row.guest_key_hash!=='string'||!/^[a-f0-9]{64}$/.test(row.guest_key_hash))fail('Invalid Guest principal.');
    }else if(row.type!=='account'||!users.has(row.user_id)||row.guest_key_hash!==null)fail('Invalid account principal.');
    if(!wallets.has(row.id))fail('Missing Credit wallet.');
  }
  const grouped=new Map<string,BackupRow[]>();
  for(const row of entries.values()){
    if(!wallets.has(row.wallet_id))fail('Orphan Credit ledger.');
    const key=String(row.wallet_id),list=grouped.get(key)??[];list.push(row);grouped.set(key,list);
  }
  for(const wallet of wallets.values()){
    const principal=principals.get(wallet.principal_id);
    if(!principal||!timestamp(wallet.updated_at)||Number(wallet.balance)<0||Number(wallet.version)<0)fail('Invalid Credit wallet.');
    let balance=BigInt(0),sequence=0;
    const refunded=new Map<string,bigint>();
    for(const row of (grouped.get(String(wallet.principal_id))??[]).sort((a,b)=>Number(a.sequence)-Number(b.sequence))){
      if(row.sequence!==++sequence||!validText(row.id)||!validText(row.kind,64)||!validText(row.idempotency_key))fail('Invalid Credit ledger sequence/metadata.');
      if(!((row.reference_type===null&&row.reference_id===null)||(validText(row.reference_type,64)&&validText(row.reference_id))))fail('Invalid Credit reference.');
      const requested=BigInt(row.requested_amount!),applied=BigInt(row.applied_amount!);
      if(!['credit','debit','refund','claim'].includes(String(row.operation)))fail('Invalid Credit operation.');
      if(row.operation==='claim'?requested!==BigInt(0):row.operation==='debit'?requested>=BigInt(0):requested<=BigInt(0))fail('Invalid Credit direction.');
      if(row.operation==='refund'){
        const original=entries.get(row.original_entry_id),key=String(row.original_entry_id);
        const total=(refunded.get(key)??BigInt(0))+requested;
        if(!original||original.wallet_id!==row.wallet_id||original.operation!=='debit'||Number(original.sequence)>=sequence||total>-BigInt(original.applied_amount!))fail('Invalid Credit refund.');
        refunded.set(key,total);
      }else if(row.original_entry_id!==null)fail('Invalid Credit original reference.');
      const expected=requested>BigInt(0)&&principal!.type==='guest'?(requested<BigInt(10)-balance?requested:BigInt(10)-balance):requested;
      balance+=applied;
      if(applied!==expected||balance<BigInt(0)||balance>BigInt(Number.MAX_SAFE_INTEGER)||balance!==BigInt(row.resulting_balance!))fail('Invalid Credit ledger effect.');
    }
    if(balance!==BigInt(wallet.balance!)||sequence!==wallet.version||(principal!.type==='guest'&&balance>BigInt(10)))fail('Credit ledger/wallet mismatch.');
  }
}
