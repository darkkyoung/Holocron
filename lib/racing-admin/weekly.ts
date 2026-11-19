// Isolated scheduled-event entry point. Intentionally not mounted on the production worker.
import {bytes} from '../racing/phase3a/crypto';
import {racingOperations} from '../racing/phase3a/operations';
import {nextMonday} from './commands';
export async function scheduledWeek(scheduledTime:number,env:{RACING_ISOLATED_DB:D1Database;RACING_SEAL_KEY:string},now=Date.now){
 const key=await crypto.subtle.importKey('raw',bytes(env.RACING_SEAL_KEY),'AES-GCM',false,['encrypt']);
 return racingOperations({db:env.RACING_ISOLATED_DB,key,role:()=>'scheduler',now}).createRegular(nextMonday(scheduledTime));
}
export default {scheduled:(event:ScheduledController,env:Parameters<typeof scheduledWeek>[1])=>scheduledWeek(event.scheduledTime,env).then(()=>{})};
