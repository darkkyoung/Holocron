import {useState} from 'react';
import type {Meeting} from '../../lib/racing/v2/types';

export type WatchSegment='qualifying'|'race'|'ceremony';

interface Props {
  meeting:Meeting;
  revealed:boolean;
  activeSegment:WatchSegment;
  chooseSegment:(segment:WatchSegment)=>void;
  special:boolean;
  toggleSpecial:()=>void;
}

const segments:readonly {id:WatchSegment;title:string;description:string;thumbnail:string}[]=[
  {id:'qualifying',title:'퀄리파잉 다시보기',description:'8명 · 3라운드 타임어택',thumbnail:'qualifying'},
  {id:'race',title:'본경기 다시보기',description:'베스퍼 서킷 · 3랩',thumbnail:'race'},
  {id:'ceremony',title:'시상식 다시보기',description:'잠정 포디엄 · 공식 순위',thumbnail:'ceremony'},
];
const seasonFixtures=[
  {id:1,title:'시즌 1',start:'2026-11-02'},
  {id:2,title:'시즌 2',start:'2026-11-09'},
  {id:3,title:'시즌 3',start:'2026-11-16'},
] as const;
const weekDays=['월','화','수','목','금','토','일'] as const;
function dateFor(start:string,offset:number){
  const [y,m,d]=start.split('-').map(Number);
  const date=new Date(Date.UTC(y,m-1,d+offset));
  return (date.getUTCMonth()+1)+'.'+String(date.getUTCDate()).padStart(2,'0');
}
function elapsed(ms:number){
  const seconds=Math.floor(ms/1000);
  return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
}
function bounds(m:Meeting,segment:WatchSegment){
  if(segment==='qualifying')return m.qualifying.durationMs;
  if(segment==='race')return m.ceremonyStartMs-m.raceStartMs;
  return m.durationMs-m.ceremonyStartMs;
}
function Thumbnail({type,duration}:{type:string;duration:string}){
  return <span className={'playlist-thumbnail playlist-thumbnail--'+type} aria-hidden="true">
    <span className="thumb-ribbon"/>
    <span className="thumb-track"/>
    <span className="thumb-vehicle"/>
    {type==='ceremony'&&<span className="thumb-podium">Ⅰ Ⅱ Ⅲ</span>}
    <small className="thumb-duration">{duration}</small>
  </span>;
}
export default function SeasonPlaylist({revealed,meeting,activeSegment,chooseSegment,special,toggleSpecial}:Props){
  const [seasonId,setSeasonId]=useState<number>(1);
  const season=seasonFixtures.find(item=>item.id===seasonId)??seasonFixtures[0];
  const winner=meeting.official[0],winnerName=meeting.race.racers.find(r=>r.id===winner.id)?.name??'';
  return <aside className="season-side" aria-label="경기 다시보기와 시즌 재생목록">
    <section className="playlist-block">
      <div className="playlist-heading">
        <div><small>UP NEXT</small><h2>이 경기 다시보기</h2></div><span>3개 영상</span>
      </div>
      <div className="playlist-replays">
        {segments.map(item=><button key={item.id} type="button"
          className={'playlist-entry '+(activeSegment===item.id?'is-current':'')}
          aria-current={activeSegment===item.id?'true':undefined}
          onClick={()=>chooseSegment(item.id)}>
          <Thumbnail type={item.thumbnail} duration={elapsed(bounds(meeting,item.id))}/>
          <span className="playlist-entry-copy">
            <strong>{item.title}</strong>
            <small>{item.description}</small>
            <span>{activeSegment===item.id?'지금 보는 영상':'재생하기'}</span>
          </span>
        </button>)}
      </div>
    </section>
    <section className="playlist-block season-playlist">
      <div className="playlist-heading">
        <div><small>SEASON PLAYLIST</small><h2>시즌별 경기</h2></div>
        <select aria-label="시즌 선택" value={seasonId} onChange={e=>setSeasonId(Number(e.target.value))}>
          {seasonFixtures.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </div>
      <div className="season-banner">
        <div>
          <small>SEASON {String(season.id).padStart(2,'0')}</small>
          <strong>{season.title}</strong>
          <span>{dateFor(season.start,0)} – {dateFor(season.start,6)} · 7경기</span>
        </div>
        <span className="season-demo-badge">시연 일정</span>
      </div>
      <div className="season-round-list" aria-label={season.title+' 경기 목록'}>
        {weekDays.map((day,i)=>{
          const recorded=seasonId===1&&i===0;
          return <button type="button" key={day} className={'season-round '+(recorded?'has-replay':'')}
            disabled={!recorded} onClick={()=>recorded&&chooseSegment('race')}>
            <span className="round-number">{String(i+1).padStart(2,'0')}</span>
            <span className="round-info"><strong>R{i+1} · {day}요일 21:00</strong>
              <small>{dateFor(season.start,i)} · {recorded?'베스퍼 서킷':'경기 기록 없음'}</small>
              {recorded&&<em>{revealed?'시연 결과 · '+winnerName+' 우승':'리플레이 제공 · 결과는 시상식에서 공개'}</em>}
            </span>
            {recorded?<span className="round-watch">▶</span>:<span className="round-pending">—</span>}
          </button>;
        })}
      </div>
      <p className="season-note">시즌 운영 연결 전의 레이아웃입니다. 표시된 R1 외에는 실제 경기·결과가 생성되지 않았습니다.</p>
    </section>
    <details className="watch-demo-tools">
      <summary>로컬 시연 설정</summary>
      <button type="button" onClick={toggleSpecial}>{special?'일반 레이스로 변경':'특별 DSQ 레이스로 변경'}</button>
      <p>두 개의 고정 시뮬레이션 사례를 전환합니다. 실제 시즌이나 경기 결과를 수정하지 않습니다.</p>
    </details>
  </aside>;
}
