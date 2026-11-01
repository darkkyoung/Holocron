import {useEffect,useRef,useState} from 'react';
import type {Meeting} from '../../lib/racing/v2/types';
/** Isolated prototype only. Generate a new immutable record off the render thread. */
export function RaceSettingsPanel({apply,version}:{apply:(m:Meeting)=>void;version:string}){
 const [laps,setLaps]=useState(10),[preshow,setPreshow]=useState(120),[seed,setSeed]=useState('9rf-0');
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const worker=useRef<Worker|null>(null);
 useEffect(()=>()=>worker.current?.terminate(),[]);
 function generate(){
  if(worker.current)return;
  setError('');setBusy(true);
  const task=new Worker(new URL('./race-worker.ts',import.meta.url),{type:'module'});worker.current=task;
  const done=()=>{task.terminate();worker.current=null;setBusy(false);};
  task.onmessage=e=>{if(e.data.error)setError(e.data.error);else apply(e.data.meeting);done();};
  task.onerror=()=>{setError('경기 생성 실패 · 현재 경기는 유지됩니다.');done();};
  task.postMessage({seed,version,settings:{laps,preshowSeconds:preshow}});
 }
 return <details className="local-race-settings"><summary>로컬 경기 설정 · 새 경기 생성</summary>
  <p>현재 기록은 그대로 유지됩니다. 생성 버튼을 누르면 새 기록으로 전환합니다. 운영 관리자·시즌과 연결되지 않습니다.</p>
  <div><label>랩 수 <select aria-label="랩 수 프리셋" value={[3,5,10,15].includes(laps)?laps:'custom'} onChange={e=>e.target.value==='custom'?setLaps(12):setLaps(Number(e.target.value))}>
   {[3,5,10,15].map(n=><option key={n} value={n}>{n}랩{n===10?' · 기본':''}</option>)}<option value="custom">사용자 지정</option></select></label>
   <label>사용자 지정 랩 <input aria-label="사용자 지정 랩" type="number" min="1" max="30" value={laps} onChange={e=>setLaps(Number(e.target.value))}/></label>
   <label>프리쇼 <select aria-label="본경기 프리쇼" value={preshow} onChange={e=>setPreshow(Number(e.target.value))}>{[60,90,120].map(n=><option key={n} value={n}>{n}초</option>)}</select></label>
   <label>Seed <input aria-label="경기 Seed" value={seed} maxLength={64} onChange={e=>setSeed(e.target.value)}/></label>
   <button disabled={busy||!Number.isInteger(laps)||laps<1||laps>30||!/^[A-Za-z0-9_-]{1,64}$/.test(seed)} onClick={generate}>{busy?'새 경기 계산 중…':'새 경기 생성'}</button></div>
  {error&&<p role="alert">{error}</p>}
 </details>;
}
