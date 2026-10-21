export const SNOOZE_KEY='holocron.announcement.snooze.v1';
export const SNOOZE_MS=168*60*60*1000;
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function isSnoozed(store:Store,id:string,now=Date.now()){
 try{
  const raw=store.getItem(SNOOZE_KEY);if(!raw)return false;const value=JSON.parse(raw);
  if(!value||Object.keys(value).sort().join(',')!=='expiresAt,id'||typeof value.id!=='string'||!Number.isSafeInteger(value.expiresAt)||value.expiresAt<=now||value.expiresAt>now+SNOOZE_MS){store.removeItem(SNOOZE_KEY);return false;}
  return value.id===id;
 }catch{try{store.removeItem(SNOOZE_KEY);}catch{}return false;}
}
export function snooze(store:Store,id:string,now=Date.now()){
 try{store.setItem(SNOOZE_KEY,JSON.stringify({id,expiresAt:now+SNOOZE_MS}));return true;}catch{return false;}
}
