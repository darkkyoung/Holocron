export type SchedulerAuthorization='authorized'|'unauthorized'|'unconfigured';

function secureEqual(left:string,right:string){
  const encoder=new TextEncoder();
  const a=encoder.encode(left);const b=encoder.encode(right);
  const length=Math.max(a.length,b.length);
  let mismatch=a.length^b.length;
  for(let index=0;index<length;index++)mismatch|=(a[index]??0)^(b[index]??0);
  return mismatch===0;
}

export function authorizeScheduler(authorization:string|null,configuredSecret:string|undefined):SchedulerAuthorization{
  if(!configuredSecret)return 'unconfigured';
  if(!authorization?.startsWith('Bearer '))return 'unauthorized';
  const token=authorization.slice(7);
  return token&&secureEqual(token,configuredSecret)?'authorized':'unauthorized';
}
