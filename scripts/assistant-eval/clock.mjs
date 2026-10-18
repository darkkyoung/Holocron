import {performance} from 'node:perf_hooks';
import {fail} from './budget.mjs';
/** Synthetic archive time advances by monotonic elapsed milliseconds, not wall
 * clock corrections. Approval expiry and review-file retention never use this. */
export function evaluationClock(capturedAt,source=()=>performance.now()){
  const epoch=Date.parse(capturedAt),start=source();let previous=start,offset=0;
  if(!Number.isSafeInteger(epoch)||!Number.isFinite(start))fail('INVALID_EVALUATION_CLOCK');
  function elapsedMs(){
    const current=source();
    if(!Number.isFinite(current)||current<previous)fail('EVALUATION_CLOCK_REGRESSION');
    previous=current;const elapsed=Math.floor(current-start);
    if(!Number.isSafeInteger(elapsed)||!Number.isSafeInteger(epoch+elapsed+offset))fail('INVALID_EVALUATION_CLOCK');
    return elapsed;
  }
  return {elapsedMs,now:()=>epoch+elapsedMs()+offset,
    advance(ms){if(!Number.isSafeInteger(ms)||ms<0||!Number.isSafeInteger(offset+ms))fail('INVALID_EVALUATION_CLOCK');offset+=ms;}};
}
