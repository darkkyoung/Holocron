'use client';
/* eslint-disable @next/next/no-img-element */

import {useState} from 'react';
import type {PosterSource,ReleasePrecision,Work,WorkStatus,WorkType} from '@/lib/works/types';
import {composeReleaseDate,isValidReleaseDateParts,parseReleaseDate,partsForPrecisionChange,sanitizeReleaseDatePart,type ReleaseDateParts} from '@/lib/works/release-date-input';
import TmdbPosterPicker from './tmdb-poster-picker';

export type WorkFormValue={
  title:string; originalTitle:string; type:WorkType; status:WorkStatus;
  posterUrl:string; posterSource?:PosterSource; posterReferenceUrl?:string; posterTmdbPath?:string;
  releaseDate:string; releasePrecision:ReleasePrecision; officialUrl:string;
  seriesKey:string; seasonNumber:string;
  tmdbMediaType?:'movie'|'tv'; tmdbId?:string; tmdbSeasonNumber?:string;
};

const empty:WorkFormValue={
  title:'',originalTitle:'',type:'영화',status:'upcoming',releaseDate:'',releasePrecision:'unknown',
  posterUrl:'',posterSource:'unknown',posterReferenceUrl:'',posterTmdbPath:'',officialUrl:'',seriesKey:'',seasonNumber:'',
};

function fromWork(work?:Work):WorkFormValue {
  return work ? {
    title:work.title, originalTitle:work.originalTitle, type:work.type, status:work.status,
    releaseDate:work.releaseDate??'', releasePrecision:work.releasePrecision,
    posterUrl:work.posterUrl, posterSource:work.posterSource??'unknown',
    posterReferenceUrl:work.posterReferenceUrl??'', posterTmdbPath:work.posterTmdbPath??'',
    officialUrl:work.officialUrl??'', seriesKey:work.seriesKey??'', seasonNumber:work.seasonNumber?.toString()??'',
    tmdbMediaType:work.tmdbMediaType??undefined, tmdbId:work.tmdbId?.toString()??undefined,
    tmdbSeasonNumber:work.tmdbSeasonNumber?.toString()??undefined,
  } : empty;
}

function posterLabel(source:PosterSource|undefined) {
  switch(source) {
    case 'tmdb-season': return '시즌 전용';
    case 'tmdb-series-fallback': return '시리즈 공통 fallback';
    case 'tmdb-movie': return 'TMDB 영화 포스터';
    case 'manual-official': return '수동 공식 이미지';
    case 'manual-reference': return '수동 참고 이미지';
    default: return '출처 미확인';
  }
}

export default function WorkForm({work,initialValue,onCancel,onSave,busy}:{
  work?:Work; initialValue?:WorkFormValue; onCancel:()=>void; onSave:(value:WorkFormValue)=>Promise<void>; busy:boolean;
}) {
  const initial=initialValue??fromWork(work);
  const [value,setValue]=useState<WorkFormValue>(initial);
  const [dateParts,setDateParts]=useState<ReleaseDateParts>(()=>parseReleaseDate(initial.releaseDate));
  const [dateError,setDateError]=useState('');
  const update=<K extends keyof WorkFormValue>(key:K,next:WorkFormValue[K])=>setValue(current=>({...current,[key]:next}));
  const changePrecision=(precision:ReleasePrecision)=>{
    const nextParts=partsForPrecisionChange(dateParts,precision);
    setDateParts(nextParts);
    setDateError('');
    setValue(current=>({...current,releasePrecision:precision,releaseDate:composeReleaseDate(nextParts,precision)}));
  };
  const changeDatePart=(part:keyof ReleaseDateParts,maxLength:number,next:string)=>{
    const nextParts={...dateParts,[part]:sanitizeReleaseDatePart(next,maxLength)};
    setDateParts(nextParts);
    setDateError('');
    setValue(current=>({...current,releaseDate:composeReleaseDate(nextParts,current.releasePrecision)}));
  };
  const setManualPoster=(posterUrl:string)=>setValue(current=>({
    ...current,posterUrl,posterSource:current.posterReferenceUrl?'manual-reference':'manual-official',posterTmdbPath:'',
  }));
  const setReference=(posterReferenceUrl:string)=>setValue(current=>({
    ...current,posterReferenceUrl,posterSource:current.posterUrl?(posterReferenceUrl?'manual-reference':'manual-official'):current.posterSource,
  }));

  return <div className="work-form-backdrop" role="presentation">
    <section className="work-form-sheet" role="dialog" aria-modal="true" aria-labelledby="work-form-title">
      <header><div><span className="yellow-line"/><h2 id="work-form-title">{work?'작품 편집':'작품 등록'}</h2></div><button type="button" className="work-form-close" onClick={onCancel} aria-label="닫기">×</button></header>
      <p>별도의 공개 단위만 등록해 주세요. 시즌은 제목과 시즌 메타데이터로 독립 관리할 수 있습니다.</p>
      <form onSubmit={event=>{event.preventDefault();if(!isValidReleaseDateParts(dateParts,value.releasePrecision)){setDateError('실제 달력에 존재하는 공개일을 입력해 주세요.');return;}void onSave(value);}}>
        <label>한국어 제목 *<input required value={value.title} onChange={event=>update('title',event.target.value)} placeholder="아소카 시즌 2"/></label>
        <label>원제<input value={value.originalTitle} onChange={event=>update('originalTitle',event.target.value)} placeholder="Ahsoka Season 2"/></label>
        <div className="work-form-grid"><label>유형 *<select value={value.type} onChange={event=>update('type',event.target.value as WorkType)}><option>영화</option><option>드라마</option><option>애니메이션</option><option>기타</option></select></label><label>상태 *<select value={value.status} onChange={event=>update('status',event.target.value as WorkStatus)}><option value="upcoming">공개 예정</option><option value="recent">최근 공개</option><option value="archive">아카이브</option></select></label></div>
        <div className="work-form-grid"><label>공개일 정밀도<select value={value.releasePrecision} onChange={event=>changePrecision(event.target.value as ReleasePrecision)}><option value="day">정확한 날짜</option><option value="month">월까지만</option><option value="year">연도만</option><option value="unknown">미정</option></select></label>{value.releasePrecision!=='unknown'&&<div className="work-form-date-field"><span>공개일</span><div className="work-form-date-parts"><label><small>연</small><input type="text" required inputMode="numeric" minLength={4} maxLength={4} pattern="[0-9]{4}" value={dateParts.year} onChange={event=>changeDatePart('year',4,event.target.value)} placeholder="YYYY"/></label>{(value.releasePrecision==='month'||value.releasePrecision==='day')&&<label><small>월</small><input type="text" required inputMode="numeric" maxLength={2} pattern="[0-9]{1,2}" value={dateParts.month} onChange={event=>changeDatePart('month',2,event.target.value)} placeholder="MM"/></label>}{value.releasePrecision==='day'&&<label><small>일</small><input type="text" required inputMode="numeric" maxLength={2} pattern="[0-9]{1,2}" value={dateParts.day} onChange={event=>changeDatePart('day',2,event.target.value)} placeholder="DD"/></label>}</div></div>}</div>
        {dateError&&<p className="work-form-date-error" role="alert">{dateError}</p>}
        <div className="work-form-grid"><label>시리즈 키<input value={value.seriesKey} onChange={event=>update('seriesKey',event.target.value)} placeholder="ahsoka"/></label><label>시즌 번호<input inputMode="numeric" value={value.seasonNumber} onChange={event=>update('seasonNumber',event.target.value)} placeholder="2"/></label></div>
        <label>Poster Image URL<input type="url" value={value.posterUrl} onChange={event=>setManualPoster(event.target.value)} placeholder="https://..."/></label>
        <label>포스터 참고 URL (공식/Fandom 파일 페이지)<input type="url" value={value.posterReferenceUrl??''} onChange={event=>setReference(event.target.value)} placeholder="https://..."/></label>
        <p>포스터: {posterLabel(value.posterSource)}</p>
        {value.posterUrl&&<img className="work-form-preview" src={value.posterUrl} alt="포스터 미리보기" onError={event=>{event.currentTarget.style.display='none';}}/>}
        <TmdbPosterPicker tmdbId={value.tmdbMediaType==='tv'?value.tmdbId:undefined} seasonNumber={value.tmdbSeasonNumber} onUse={candidate=>setValue(current=>({...current,posterUrl:candidate.url,posterSource:candidate.source,posterTmdbPath:candidate.path}))}/>
        <label>공식 페이지 URL<input type="url" value={value.officialUrl} onChange={event=>update('officialUrl',event.target.value)} placeholder="https://www.starwars.com/..."/></label>
        <footer><button type="button" className="work-form-secondary" onClick={onCancel}>취소</button><button type="submit" className="work-form-submit" disabled={busy}>{busy?'저장 중…':work?'변경 저장':'작품 등록'}</button></footer>
      </form>
    </section>
  </div>;
}
