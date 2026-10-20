import {createState} from '../assistant-e5h/state.mjs';
import * as fixed from './revision.mjs';
import {historyReader} from './history.mjs';
export {syncDir,totals} from '../assistant-e5h/state.mjs';
export const {planToken,context,recheck,validateGrant,grantFor,checkpoint,inspect,authorize}=createState({...fixed,historyReader,prior:{attempts:9,reservedMicros:244800,usageEstimateMicros:32355},approvalPrefix:'eval-e5j-',conflictCode:'E5J_CONFIGURATION_CONFLICT',authorizeConfirmation:'AUTHORIZE_E5J_P44_ONCE',review:()=>import('./review.mjs')});
