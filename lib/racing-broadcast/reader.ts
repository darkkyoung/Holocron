import {watch} from './http';
import type {Bindings} from './private';
// Internal service binding only. No workers.dev URL, route, cron, KV signer, or public bucket.
const reader={fetch:(req:Request,env:Bindings)=>watch(req,env)};
export default reader;
