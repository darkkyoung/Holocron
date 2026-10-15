import {resolveAccountSession} from './account-session';
import {resolveGuest} from './service';
/** Invalid Account credentials fail closed; never downgrade to a different Guest wallet. */
export async function resolveCurrentCreditOwner(request:Request,database:D1Database,secrets:{account?:string;guest?:string},now=Date.now()){
  const account=await resolveAccountSession(request,database,secrets.account,now);
  return account?.owner??await resolveGuest(request,database,secrets.guest,now);
}
