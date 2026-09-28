'use client';
/* eslint-disable @next/next/no-img-element */

import {useMemo,useState,type FormEvent} from 'react';
import type {AdminQuiz,QuizDraft,QuizStatus} from '@/lib/quiz/types';

type FormOption={label:string;imageUrl:string;isCorrect:boolean};
export type QuizFormValue=QuizDraft;

function kstInput(iso:string|null){
  if(!iso)return '';
  const date=new Date(iso);
  if(Number.isNaN(date.getTime()))return '';
  return new Date(date.getTime()+9*60*60*1000).toISOString().slice(0,16);
}
function kstIso(value:string){
  if(!value)return null;
  const date=new Date(`${value}:00+09:00`);
  return Number.isNaN(date.getTime())?null:date.toISOString();
}
function defaultOptions():FormOption[]{
  return Array.from({length:5},(_,index)=>({label:'',imageUrl:'',isCorrect:index===0}));
}

export default function QuizForm({quiz,busy,onCancel,onSave}:{quiz?:AdminQuiz&{responseCount?:number};busy:boolean;onCancel:()=>void;onSave:(value:QuizFormValue)=>Promise<void>|void}){
  const [title,setTitle]=useState(quiz?.title??'오늘의 퀴즈');
  const [question,setQuestion]=useState(quiz?.question??'');
  const [heroImageUrl,setHeroImageUrl]=useState(quiz?.heroImageUrl??'');
  const [explanation,setExplanation]=useState(quiz?.explanation??'');
  const [status,setStatus]=useState<QuizStatus>(quiz?.status??'draft');
  const [publishAt,setPublishAt]=useState(kstInput(quiz?.publishAt??null));
  const [options,setOptions]=useState<FormOption[]>(quiz?.options.map(option=>({label:option.label,imageUrl:option.imageUrl??'',isCorrect:option.isCorrect}))??defaultOptions());
  const [error,setError]=useState('');
  const responseLocked=Boolean(quiz?.responseCount);

  const correctIndex=useMemo(()=>options.findIndex(option=>option.isCorrect),[options]);

  function updateOption(index:number,patch:Partial<FormOption>){
    setOptions(current=>current.map((option,position)=>position===index?{...option,...patch}:option));
  }
  function markCorrect(index:number){
    setOptions(current=>current.map((option,position)=>({...option,isCorrect:position===index})));
  }
  function addOption(){
    if(options.length>=5)return;
    setOptions(current=>[...current,{label:'',imageUrl:'',isCorrect:false}]);
  }
  function removeOption(index:number){
    if(options.length<=2)return;
    setOptions(current=>{
      const next=current.filter((_,position)=>position!==index);
      if(next.some(option=>option.isCorrect))return next;
      return next.map((option,position)=>({...option,isCorrect:position===0}));
    });
  }

  async function submit(event:FormEvent){
    event.preventDefault();
    setError('');
    const scheduledAt=status==='scheduled'?kstIso(publishAt):null;
    if(status==='scheduled'&&!scheduledAt){setError('예약 공개 시각을 입력해 주세요.');return;}
    if(correctIndex<0){setError('정답을 하나 지정해 주세요.');return;}
    try{
      await onSave({
        title,
        question,
        heroImageUrl:heroImageUrl.trim()||null,
        explanation,
        status,
        publishAt:scheduledAt,
        options:options.map(option=>({label:option.label,imageUrl:option.imageUrl.trim()||null,isCorrect:option.isCorrect})),
      });
    }catch(reason){setError((reason as Error).message);}
  }

  return <div className="quiz-form-backdrop" role="presentation" onMouseDown={event=>{if(event.currentTarget===event.target&&!busy)onCancel();}}>
    <section className="quiz-form-sheet" role="dialog" aria-modal="true" aria-labelledby="quiz-form-title">
      <header><h2 id="quiz-form-title">{quiz?'퀴즈 수정':'새 퀴즈 만들기'}</h2><button type="button" aria-label="닫기" disabled={busy} onClick={onCancel}>×</button></header>
      <p>메인 이미지와 선택지 이미지는 URL로 등록합니다. 예약 공개는 KST 기준이며 별도 배포나 스케줄러 작업 없이 지정 시각부터 자동으로 공개됩니다.</p>
      {responseLocked&&<p className="quiz-form-warning">이미 참여 기록이 있습니다. 투표 일관성을 위해 선택지·정답은 변경할 수 없고 제목, 문제, 메인 이미지, 해설, 공개 설정만 수정할 수 있습니다.</p>}
      {error&&<p className="quiz-error" role="alert">{error}</p>}
      <form onSubmit={event=>void submit(event)}>
        <div className="quiz-form-grid">
          <label>퀴즈 제목<input value={title} maxLength={140} required disabled={busy} onChange={event=>setTitle(event.target.value)}/></label>
          <label>공개 상태<select value={status} disabled={busy} onChange={event=>setStatus(event.target.value as QuizStatus)}><option value="draft">임시 저장</option><option value="scheduled">예약 공개</option><option value="published">즉시 공개</option></select></label>
        </div>
        {status==='scheduled'&&<label>예약 공개 시각 · KST<input type="datetime-local" value={publishAt} required disabled={busy} onChange={event=>setPublishAt(event.target.value)}/></label>}
        <label>문제<textarea rows={3} value={question} maxLength={600} required disabled={busy} onChange={event=>setQuestion(event.target.value)} placeholder="예: 다음 중 키가 가장 큰 인물은?"/></label>
        <label>메인 이미지 URL · 선택<input type="url" value={heroImageUrl} disabled={busy} onChange={event=>setHeroImageUrl(event.target.value)} placeholder="https://..."/></label>
        {heroImageUrl&&<img className="quiz-form-hero-preview" src={heroImageUrl} alt="메인 이미지 미리보기" onError={event=>{event.currentTarget.style.display='none';}}/>}
        <section className="quiz-form-options">
          <div className="quiz-form-options-heading"><div><strong>선택지</strong><span>{options.length} / 5</span></div><small>2~5개 · 정답은 정확히 1개</small></div>
          {options.map((option,index)=><div className="quiz-form-option" key={index}>
            <span>{String.fromCharCode(65+index)}</span>
            <label>답안<input value={option.label} maxLength={160} required disabled={busy||responseLocked} onChange={event=>updateOption(index,{label:event.target.value})}/></label>
            <label>이미지 URL · 선택<input type="url" value={option.imageUrl} disabled={busy||responseLocked} onChange={event=>updateOption(index,{imageUrl:event.target.value})} placeholder="https://..."/></label>
            <label className="quiz-correct-radio" title="정답"><input type="radio" name="quiz-correct" checked={option.isCorrect} disabled={busy||responseLocked} onChange={()=>markCorrect(index)} aria-label={`${index+1}번 선택지를 정답으로 지정`}/></label>
            {!responseLocked&&<button type="button" disabled={busy||options.length<=2} onClick={()=>removeOption(index)} aria-label={`${index+1}번 선택지 삭제`}>×</button>}
            {option.imageUrl&&<img className="quiz-form-option-preview" src={option.imageUrl} alt="" onError={event=>{event.currentTarget.style.display='none';}}/>}
          </div>)}
          {!responseLocked&&options.length<5&&<button className="quiz-form-add" type="button" disabled={busy} onClick={addOption}>+ 선택지 추가</button>}
        </section>
        <label>정답 및 해설<textarea rows={5} value={explanation} maxLength={2400} required disabled={busy} onChange={event=>setExplanation(event.target.value)} placeholder="정답과 이유를 간단히 설명해 주세요."/></label>
        <footer className="quiz-form-footer"><button type="button" disabled={busy} onClick={onCancel}>취소</button><button className="primary" type="submit" disabled={busy}>{busy?'저장 중…':quiz?'변경 저장':'퀴즈 저장'}</button></footer>
      </form>
    </section>
  </div>;
}
