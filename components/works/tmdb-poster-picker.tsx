'use client';

/* eslint-disable @next/next/no-img-element */
import {useState} from 'react';

type Candidate={url:string;path:string;source:'tmdb-season'|'tmdb-series-fallback'};
export default function TmdbPosterPicker({tmdbId,seasonNumber,onUse}:{tmdbId?:string;seasonNumber?:string;onUse:(candidate:Candidate)=>void}){
  const [candidates,setCandidates]=useState<Candidate[]>([]);const [message,setMessage]=useState('');const [loading,setLoading]=useState(false);
  async function load(){if(!tmdbId||!seasonNumber)return;setLoading(true);setMessage('');try{const response=await fetch('/api/admin/works/tmdb/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'posters',id:tmdbId,seasonNumber})});const data=await response.json() as {candidates?:Candidate[];error?:string};if(!response.ok)throw new Error(data.error??'TMDB에서 시즌 포스터를 가져오지 못했습니다.');setCandidates(data.candidates??[]);if(!(data.candidates??[]).length)setMessage('시즌 전용 포스터를 찾지 못했습니다.');}catch(error){setMessage((error as Error).message);}finally{setLoading(false);}}
  if(!tmdbId||!seasonNumber)return null;
  return <section className="tmdb-poster-manager"><strong>TMDB 시즌 포스터</strong><p>시즌 전용 후보가 먼저 보입니다. 시리즈 공통 fallback은 별도로 표시됩니다.</p><button type="button" className="work-tmdb-button tmdb-poster-reload" onClick={()=>void load()} disabled={loading}>{loading?'불러오는 중…':'TMDB 시즌 포스터 다시 불러오기'}</button>{message&&<p className="tmdb-poster-message" role="status">{message}</p>}{candidates.length>0&&<div className="tmdb-poster-candidates">{candidates.map(candidate=><div className="tmdb-poster-candidate" key={candidate.path}><img src={candidate.url} alt="TMDB 포스터 후보"/><span>{candidate.source==='tmdb-season'?'시즌 전용':'시리즈 공통 fallback'}</span><button type="button" onClick={()=>onUse(candidate)}>이 포스터 사용</button></div>)}</div>}</section>;
}
