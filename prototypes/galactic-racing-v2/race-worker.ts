/// <reference lib="webworker" />
import {simulateMeetingV6} from '../../lib/racing/v6/simulator';
self.onmessage=(event:MessageEvent)=>{
 try{self.postMessage({meeting:simulateMeetingV6(event.data.seed,true,event.data.settings)});}
 catch(error){self.postMessage({error:error instanceof Error?error.message:'GENERATION_FAILED'});}
};
