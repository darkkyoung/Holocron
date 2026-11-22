// Isolated scheduled-event entry point. Intentionally not mounted on the production worker.
import {keyFor,type SealBindings} from '../racing/phase3a/keyring';
import {racingOperations} from '../racing/phase3a/operations';
import {nextMonday} from './commands';
export async function scheduledWeek(scheduledTime:number,env:SealBindings&{RACING_ISOLATED_DB:D1Database},now=Date.now){
 const key=await keyFor(env,['encrypt']);
 return racingOperations({db:env.RACING_ISOLATED_DB,key,role:()=>'scheduler',now}).createRegular(nextMonday(scheduledTime));
}
const worker={scheduled:(event:ScheduledController,env:Parameters<typeof scheduledWeek>[1])=>scheduledWeek(event.scheduledTime,env).then(()=>{})};
export default worker;
