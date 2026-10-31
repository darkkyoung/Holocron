import {useState} from 'react';
export type CameraAngle='chase'|'front'|'side';
export type HudSize='small'|'medium'|'large';
export const timeLabel=(ms:number)=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}`;
interface Props{
 playing:boolean;visible:boolean;position:number;duration:number;rate:number;manual:string|null;
 angle:CameraAngle;hudSize:HudSize;full:boolean;racers:readonly {id:string;name:string}[];
 toggle:()=>void;seek:(value:number)=>void;speed:(value:number)=>void;camera:(value:string|null)=>void;
 shot:(value:CameraAngle)=>void;hud:(value:HudSize)=>void;fullscreen:()=>void;
}
/** One control surface in normal, native fullscreen and viewport fullscreen modes. */
export default function PlayerControls(p:Props){
 const [settings,setSettings]=useState(false);
 return <div className={'player-controls '+(p.visible||settings?'shown':'hidden')} onClick={e=>e.stopPropagation()}>
  {settings&&<section className="player-settings" aria-label="시청 설정">
   <label>재생 속도<select aria-label="재생 속도" value={p.rate} onChange={e=>p.speed(Number(e.target.value))}>{[.5,1,2,4,8].map(n=><option key={n} value={n}>{n}×</option>)}</select></label>
   <label>카메라<select aria-label="카메라 선택" value={p.manual??'auto'} onChange={e=>p.camera(e.target.value==='auto'?null:e.target.value)}><option value="auto">자동 중계</option>{p.racers.map(r=><option key={r.id} value={r.id}>{r.name} 추적</option>)}</select></label>
   <label>추적 각도<select aria-label="추적 카메라 각도" value={p.angle} disabled={!p.manual} onChange={e=>p.shot(e.target.value as CameraAngle)}><option value="chase">후방</option><option value="front">정면</option><option value="side">측면</option></select></label>
   <label>HUD 크기<select aria-label="HUD 크기" value={p.hudSize} onChange={e=>p.hud(e.target.value as HudSize)}><option value="small">작게</option><option value="medium">중간</option><option value="large">크게</option></select></label>
   <button onClick={()=>setSettings(false)}>설정 닫기</button>
  </section>}
  <input className="player-progress" type="range" min="0" max={p.duration} step="250" value={Math.min(p.duration,p.position)} aria-label="영상 재생 위치" aria-valuetext={`${timeLabel(p.position)} / ${timeLabel(p.duration)}`} onChange={e=>p.seek(Number(e.target.value))}/>
  <div className="control-row">
   <button aria-label={p.playing?'일시정지':'재생'} title="재생 / 일시정지 (K)" onClick={p.toggle}>{p.playing?'Ⅱ':'▶'}</button>
   <time>{timeLabel(p.position)} <span>/ {timeLabel(p.duration)}</span></time>
   <span className="camera-status">{p.manual?p.racers.find(r=>r.id===p.manual)?.name+' · '+({chase:'후방',front:'정면',side:'측면'}[p.angle]):'자동 중계'}</span>
   <button aria-label="시청 설정" aria-expanded={settings} title="속도 · 카메라 · HUD" onClick={()=>setSettings(v=>!v)}>⚙</button>
   <button aria-label={p.full?'전체화면 종료':'전체화면으로 보기'} title="전체화면 (F)" onClick={p.fullscreen}>{p.full?'↙':'⛶'}</button>
  </div>
 </div>;
}
