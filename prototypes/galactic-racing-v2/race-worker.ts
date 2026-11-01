import {simulateMeetingV8} from '../../lib/racing/v8/simulator';
/// <reference lib="webworker" />
import {simulateMeetingV6} from '../../lib/racing/v6/simulator';
import {simulateMeetingV7} from '../../lib/racing/v7/simulator';
self.onmessage=(event:MessageEvent)=>{
 try{self.postMessage({meeting:(event.data.version==='galactic-racing-0.8.0'?simulateMeetingV8:event.data.version==='galactic-racing-0.7.0'?simulateMeetingV7:simulateMeetingV6)(event.data.seed,true,event.data.settings)});}
 catch(error){self.postMessage({error:error instanceof Error?error.message:'GENERATION_FAILED'});}
};
