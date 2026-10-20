import {pathToFileURL} from 'node:url';
import {createCli} from '../assistant-e5h/cli.mjs';
import * as state from './state.mjs';
import * as fixed from './revision.mjs';
import * as review from './review.mjs';
import {execute} from './execute.mjs';
export const {parse,run,safeFailure}=createCli({...state,...fixed,...review,execute,conflictCode:'E5J_CONFIGURATION_CONFLICT',integrityCode:'E5J_INTEGRITY_FAILED',stopCode:'E5J_STOP'});
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const r=await run();console.log(JSON.stringify(r,null,2));if(r.status?.startsWith('STOP'))process.exitCode=1;}catch(e){console.error(JSON.stringify(safeFailure(e)));process.exitCode=1;}}
