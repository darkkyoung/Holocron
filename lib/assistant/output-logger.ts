import {outputDiagnostic,type OutputObserver} from './output-diagnostic';

/** Content-free server observer. One event per HTTP request, at most 20 per
 * minute per isolate. No request/account identifiers or model text are accepted.
 * This is an observability bound, not a replacement for admission rate limits. */
export function outputLoggerFactory(write:(event:object)=>void|Promise<void>,now=Date.now){
  let windowStart=0,count=0;
  return ():OutputObserver=>{
    let emitted=false;
    return diagnostic=>{
      if(emitted)return;
      emitted=true;
      const time=now();
      if(time-windowStart>=60_000||time<windowStart){windowStart=time;count=0;}
      if(count>=20)return;
      count++;
      const safe=outputDiagnostic(diagnostic.reason,diagnostic.path);
      try{return Promise.resolve(write({event:'ASSISTANT_OUTPUT_DIAGNOSTIC_V1',...safe})).catch(()=>{});}catch{/* Never affect settlement. */}
    };
  };
}
export const createOutputLogger=outputLoggerFactory(event=>console.warn(JSON.stringify(event)));
