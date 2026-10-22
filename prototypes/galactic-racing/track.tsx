import type {RacerFrame,RaceRecord} from '../../lib/racing/types';

export function Track({race,racers,finished}:{race:RaceRecord;racers:readonly RacerFrame[];finished:boolean}){
  const lapLength=race.config.track.length/race.config.track.laps;
  const leader=racers.find(r=>r.rank===1)!;
  const second=racers.find(r=>r.rank===2)!;
  const battle=!finished&&leader.status==='RACING'&&second.status==='RACING'&&leader.progress-second.progress<4000;
  return <svg viewBox="0 0 1000 540" role="img" aria-label="베스퍼 링 트랙 위 8인 레이스. 정확한 순위와 상태는 옆 순위표에서 확인하세요.">
    <defs>
      <radialGradient id="space"><stop stopColor="#263039"/><stop offset="1" stopColor="#10151b"/></radialGradient>
      <pattern id="finish" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="#dddcca"/><path d="M0 0h6v6H0zM6 6h6v6H6z" fill="#222930"/></pattern>
    </defs>
    <rect width="1000" height="540" fill="url(#space)"/>
    {Array.from({length:48},(_,i)=><circle key={i} cx={(i*137+41)%1000} cy={(i*83+31)%540} r={i%4===0?1.5:.7} fill="#a8bac5" opacity=".35"/>)}
    <ellipse cx="500" cy="270" rx="380" ry="150" fill="none" stroke="#080d12" strokeWidth="93"/>
    <ellipse cx="500" cy="270" rx="380" ry="150" fill="none" stroke="#3c4449" strokeWidth="80"/>
    <ellipse cx="500" cy="270" rx="380" ry="150" fill="none" stroke="#252e36" strokeWidth="73"/>
    <ellipse cx="500" cy="270" rx="380" ry="150" fill="none" stroke="#d9c65a" strokeWidth="1.5" strokeDasharray="8 16" opacity=".5"/>
    <ellipse cx="500" cy="270" rx="421" ry="191" fill="none" stroke="#d0b75b" strokeWidth="2" opacity=".5"/>
    <path d="M290 375 Q500 350 720 375" fill="none" stroke="#60c3bc" strokeWidth="9" opacity=".35" strokeDasharray="8 5"/>
    <text x="500" y="365" className="track-label" textAnchor="middle">MAINTENANCE CUT · 지름길</text>
    <rect x="494" y="79" width="12" height="82" fill="url(#finish)"/>
    <text x="500" y="60" className="track-label" textAnchor="middle">START / FINISH</text>
    <text x="500" y="236" className="track-title" textAnchor="middle">VESPER RING</text>
    <text x="500" y="272" className="track-subtitle" textAnchor="middle">{finished?'RACE COMPLETE':battle?'선두 접전 · 40m 이내':'외곽 궤도 · 3 LAP CIRCUIT'}</text>
    <text x="500" y="309" className="track-label" textAnchor="middle">2D 중계 프로토타입 / 위치는 기록된 진행도</text>
    {racers.map((r,i)=>{
      const meta=race.racers[i];
      const phase=r.progress/lapLength,angle=phase*Math.PI*2-Math.PI/2;
      const lane=(i-3.5)*5,rx=380+lane,ry=150+lane;
      const x=500+rx*Math.cos(angle),y=270+ry*Math.sin(angle);
      const heading=Math.atan2(ry*Math.cos(angle),-rx*Math.sin(angle))*180/Math.PI;
      const retired=r.status==='DNF'||r.status==='DSQ';
      return <g key={r.id} opacity={retired?.38:1}>
        {(r.ultimate||r.rank===1)&&<circle cx={x} cy={y} r={r.ultimate?23:20} fill="none" stroke={r.ultimate?'#fff':meta.color} strokeWidth="2" strokeDasharray={r.ultimate?'3 4':undefined}/>}
        <g transform={`translate(${x} ${y}) rotate(${heading})`}>
          {(r.ultimate||r.motion==='BOOST')&&<path d="M-10 -4L-29 0L-10 4" fill={r.ultimate?'#f5e8ff':'#ffc94a'}/>}
          <path d="M16 0L-10 -9L-5 0L-10 9Z" fill={meta.color} stroke="#0a1118" strokeWidth="2"/>
          {r.motion==='DAMAGED'&&<path d="M-9 -12L0 -4L-5 5" stroke="#ff615e" strokeWidth="4" fill="none"/>}
        </g>
        <rect x={x-11} y={y-38} width="22" height="19" rx="5" fill="#10171e" stroke={meta.color}/>
        <text x={x} y={y-24} textAnchor="middle" className="vehicle-number">{i+1}</text>
      </g>;
    })}
  </svg>;
}
