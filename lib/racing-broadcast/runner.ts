import {racingService,type Dependencies} from '../racing/phase3a/service';
import {bytes,canonical} from '../racing/phase3a/crypto';
import {objects,keyFor,type Bindings} from './private';
type Signed={ref:string;value:string;signature:string};
export type RunnerEnv=Bindings&{RACING_BEACON:{get(ref:string):Promise<string|null>};RACING_BEACON_PUBLIC_JWK:string};
// The isolated producer supplies signed, immutable, stage-specific contributions.
// This runner has only the verifier. Missing/invalid contribution fails closed.
export async function verifiedContribution(env:RunnerEnv,ref:string){
 const raw=await env.RACING_BEACON.get(ref);if(!raw||raw.length>2048)throw Error('ENTROPY_UNAVAILABLE');
 const e=JSON.parse(raw) as Signed;if(e.ref!==ref||!/^[a-f0-9]{64}$/.test(e.value)||!/^[a-f0-9]{128}$/.test(e.signature))throw Error('BAD_CONTRIBUTION');
 const key=await crypto.subtle.importKey('jwk',JSON.parse(env.RACING_BEACON_PUBLIC_JWK),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
 if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,bytes(e.signature),new TextEncoder().encode(canonical({ref,value:e.value}))))throw Error('BAD_SIGNATURE');
 return e.value;
}
export async function wake(env:RunnerEnv,now=Date.now,mark?:Dependencies['mark']){
 const d={mark,db:env.RACING_ISOLATED_DB,key:await keyFor(env),artifacts:objects(env),now,entropy:(ref:string)=>verifiedContribution(env,ref)};
 const scheduler=racingService({...d,role:()=>'scheduler'}),generator=racingService({...d,role:()=>'generator'});
 const errors:string[]=[];
 for(const task of await scheduler.dueWork()){
  try{await generator.generate(task.raceId,task.stage);}catch{errors.push('GENERATION_INCOMPLETE');}
 }
 const rows=await d.db.prepare("SELECT id FROM racing_races WHERE (state='READY' AND starts_at<=?) OR (state='RUNNING' AND finish_at<=?) OR (state='PROVISIONAL' AND final_at<=?) ORDER BY starts_at LIMIT 32").bind(now(),now(),now()).all<{id:string}>();
 for(const r of rows.results)await scheduler.advance(r.id);
 if(errors.length)throw Error('RETRY_REQUIRED');
}
const worker={scheduled:(_event:ScheduledController,env:RunnerEnv,ctx:ExecutionContext)=>ctx.waitUntil(wake(env))};
export default worker;
