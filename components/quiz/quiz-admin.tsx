'use client';
/* eslint-disable @next/next/no-img-element */

import {useMemo,useState} from 'react';
import {Header} from '@/app/newsroom';
import type {AdminQuiz,QuizStatus} from '@/lib/quiz/types';

type ManagedQuiz=AdminQuiz&{effectiveStatus:'draft'|'scheduled'|'published';responseCount:number};
type ManagementState={quizzes:ManagedQuiz[];now:string};
type FormOption={label:string;imageUrl:string;isCorrect:boolean};
type FormValue={title:string;question:string;heroImageUrl:string;explanation:string;status:QuizStatus;publishAt:string;options:FormOption[]};

const blankOption=():FormOption=>({label:'',imageUrl:'',isCorrect:false});
const emptyForm=():FormValue=>({title:'',question:'',heroImageUrl:'',explanation:'',status:'draft',publishAt:'',options:[blankOption(),blankOption(),blankOption(),blankOption(),blankOption()]});

function localInputValue(value:string|null){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
  return parts.replace(' ','T');
}
function fromQuiz(quiz:ManagedQuiz):FormValue{
  return {
    title:quiz.title,question:quiz.question,heroImageUrl:quiz.heroImageUrl??'',explanation:quiz.explanation,
    status:quiz.status,publishAt:localInputValue(quiz.publishAt),
    options:quiz.options.map(option=>({label:option.label,imageUrl:option.imageUrl??'',isCorrect:option.isCorrect})),
  };
}
function statusLabel(status:ManagedQuiz['effectiveStatus']){return status==='published'?'공개 중':status==='scheduled'?'예약':'임시저장';}
function formatTime(value:string|null){
  if(!value)return '즉시';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'시각 확인 필요':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
}

function QuizForm({quiz,busy,onCancel,onSave}:{quiz:ManagedQuiz|null;busy:boolean;onCancel:()=>void;onSave:(value:FormValue)=>Promise<void>}){
  const [value,setValue]=useState<FormValue>(()=>quiz?fromQuiz(quiz):emptyForm());
  const lockedOptions=!!quiz&&quiz.responseCount>0;
  const update=<K extends keyof FormValue>(key:K,next:FormValue[K])=>setValue(current=>({...current,[key]:next}));
  const updateOption=(index:number,patch:Partial<FormOption>)=>setValue(current=>({...current,options:current.options.map((option,i)=>i===index?{...option,...patch}:option)}));
  const chooseCorrect=(index:number)=>setValue(current=>({...current,options:current.options.map((option,i)=>({...option,isCorrect:i===index}))}));
  const validCorrect=value.options.filter(option=>option.isCorrect).length===1;

  async function submit(event:React.FormEvent){
    event.preventDefault();
    if(!validCorrect)return;
    await onSave(value);
  }

  return <div className="quiz-form-backdrop" role="presentation"><section className="quiz-form-sheet" role="dialog" aria-modal="true" aria-labelledby="quiz-editor-title">
    <header><h2 id="quiz-editor-title">{quiz?'퀴즈 편집':'새 퀴즈 만들기'}</h2><button type="button" onClick={onCancel} aria-label="닫기">×</button></header>
    <p>예약 상태는 공개 시각이 지나면 별도 작업 없이 자동으로 공개됩니다. 이미지 입력은 가벼운 URL 방식입니다.</p>
    <form onSubmit={submit}>
      <label>퀴즈 제목 *<input required maxLength={140} value={value.title} onChange={event=>update('title',event.target.value)} placeholder="오늘의 스타워즈 퀴즈"/></label>
      <label>문제 *<textarea required rows={3} maxLength={600} value={value.question} onChange={event=>update('question',event.target.value)} placeholder="다음 중 키가 가장 큰 인물은?"/></label>
      <label>메인 이미지 URL<input type="url" value={value.heroImageUrl} onChange={event=>update('heroImageUrl',event.target.value)} placeholder="https://..."/></label>
      {value.heroImageUrl&&<img className="quiz-form-hero-preview" src={value.heroImageUrl} alt="메인 이미지 미리보기"/>}
      <div className="quiz-form-grid">
        <label>상태<select value={value.status} onChange={event=>update('status',event.target.value as QuizStatus)}><option value="draft">임시저장</option><option value="scheduled">예약 공개</option><option value="published">즉시/공개</option></select></label>
        <label>공개 시각 · KST {value.status==='scheduled'?'*':''}<input type="text" inputMode="numeric" required={value.status==='scheduled'} value={value.publishAt} onChange={event=>update('publishAt',event.target.value)} placeholder="2026-09-29T09:00"/></label>
      </div>
      <label>정답 해설 *<textarea required rows={4} maxLength={2400} value={value.explanation} onChange={event=>update('explanation',event.target.value)} placeholder="정답과 간단한 설명을 적어주세요."/></label>
      {lockedOptions&&<p className="quiz-form-warning">이미 {quiz?.responseCount}명이 참여했습니다. 응답 기록을 보존하기 위해 선택지와 정답은 잠겨 있으며 나머지 문구·이미지·해설·공개 설정만 수정할 수 있습니다.</p>}
      <div className="quiz-form-options">
        {value.options.map((option,index)=><div className="quiz-form-option" key={index}>
          <span>{String.fromCharCode(65+index)}</span>
          <label>선택지 *<input required disabled={lockedOptions} maxLength={160} value={option.label} onChange={event=>updateOption(index,{label:event.target.value})}/></label>
          <label>이미지 URL<input type="url" disabled={lockedOptions} value={option.imageUrl} onChange={event=>updateOption(index,{imageUrl:event.target.value})} placeholder="https://..."/></label>
          <label className="quiz-correct-radio" title="정답"><input type="radio" name="correct-option" checked={option.isCorrect} disabled={lockedOptions} onChange={()=>chooseCorrect(index)}/></label>
          
          {option.imageUrl&&<img className="quiz-form-option-preview" src={option.imageUrl} alt=""/>}
        </div>)}
        
      </div>
      {!validCorrect&&<p className="quiz-error">정답 선택지를 하나 지정해 주세요.</p>}
      <footer className="quiz-form-footer"><button type="button" onClick={onCancel}>취소</button><button className="primary" type="submit" disabled={busy||!validCorrect}>{busy?'저장 중…':quiz?'변경 저장':'퀴즈 저장'}</button></footer>
    </form>
  </section></div>;
}

export default function QuizAdmin({initialState}:{initialState:ManagementState}){
  const [quizzes,setQuizzes]=useState(initialState.quizzes);
  const [editing,setEditing]=useState<ManagedQuiz|null|undefined>(undefined);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const sorted=useMemo(()=>quizzes,[quizzes]);

  async function refresh(){
    const response=await fetch('/api/admin/quiz');
    const data=await response.json() as ManagementState&{error?:string};
    if(!response.ok)throw new Error(data.error??'퀴즈 목록을 불러오지 못했습니다.');
    setQuizzes(data.quizzes);
  }
  async function save(value:FormValue){
    setBusy(true);setMessage('');
    try{
      let publishAt:string|null=value.publishAt.trim()||null;
      if(publishAt){
        const parsed=new Date(publishAt+':00+09:00');
        if(Number.isNaN(parsed.getTime()))throw new Error('공개 시각을 확인해 주세요.');
        publishAt=parsed.toISOString();
      }
      const quiz={...value,heroImageUrl:value.heroImageUrl.trim()||null,publishAt,options:value.options.map(option=>({...option,imageUrl:option.imageUrl.trim()||null}))};
      const action=editing?'update':'create';
      const response=await fetch('/api/admin/quiz',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id:editing?.id,quiz})});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error??'퀴즈를 저장하지 못했습니다.');
      await refresh();setEditing(undefined);setMessage(editing?'퀴즈를 수정했습니다.':'퀴즈를 만들었습니다.');
    }catch(error){setMessage((error as Error).message);}
    finally{setBusy(false);}
  }
  async function remove(quiz:ManagedQuiz){
    if(!window.confirm('"'+quiz.title+'" 퀴즈와 참여 기록을 모두 삭제할까요?'))return;
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/admin/quiz',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id:quiz.id})});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error??'퀴즈를 삭제하지 못했습니다.');
      await refresh();setMessage('퀴즈를 삭제했습니다.');
    }catch(error){setMessage((error as Error).message);}
    finally{setBusy(false);}
  }

  return <><Header admin archive="quiz"/><main className="shell quiz-admin-shell">
    <section className="quiz-admin-heading"><div><div className="eyebrow"><span className="yellow-line"/> HOLOCRON / QUIZ CONTROL</div><h1>Daily Quiz <span>관리</span></h1><p>문제·메인 이미지·선택지 이미지·정답·해설을 만들고 즉시 공개하거나 원하는 시각으로 예약할 수 있습니다.</p></div><button type="button" onClick={()=>setEditing(null)}>+ 새 퀴즈</button></section>
    {message&&<div className="admin-message" role="status">{message}</div>}
    <section className="quiz-admin-list">{sorted.map(quiz=><article className="quiz-admin-item" key={quiz.id}><div><div className="quiz-admin-item-meta"><span className="quiz-admin-status" data-status={quiz.effectiveStatus}>{statusLabel(quiz.effectiveStatus)}</span><span>{formatTime(quiz.publishAt)}</span><span>참여 {quiz.responseCount}명</span><span>선택지 {quiz.options.length}개</span></div><h2>{quiz.title}</h2><p>{quiz.question}</p></div><div className="quiz-admin-actions"><button type="button" disabled={busy} onClick={()=>setEditing(quiz)}>편집</button><button type="button" className="danger" disabled={busy} onClick={()=>void remove(quiz)}>삭제</button></div></article>)}
      {!sorted.length&&<div className="quiz-admin-empty">아직 등록된 퀴즈가 없습니다. 첫 Daily Quiz를 만들어보세요.</div>}
    </section>
    {editing!==undefined&&<QuizForm quiz={editing} busy={busy} onCancel={()=>setEditing(undefined)} onSave={save}/>}
  </main></>;
}
