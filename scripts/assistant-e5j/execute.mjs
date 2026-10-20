import {createExecute} from '../assistant-e5h/execute.mjs';
import * as state from './state.mjs';
import * as fixed from './revision.mjs';
import * as review from './review.mjs';
export const execute=createExecute({...state,...fixed,...review,conflictCode:'E5J_CONFIGURATION_CONFLICT',integrityCode:'E5J_INTEGRITY_FAILED'});
