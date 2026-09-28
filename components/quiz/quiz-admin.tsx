'use client';

import {useMemo,useRef,useState} from 'react';
import {ExternalLink,Minus,Plus} from 'lucide-react';
import {Header} from '@/app/newsroom';
import QuizImageCropControl from './image-crop-control';
import {DEFAULT_QUIZ_IMAGE_CROP,QUIZ_MAX_OPTIONS,QUIZ_MIN_OPTIONS,type AdminQuiz,type QuizImageCrop,type QuizStatus} from '@/lib/quiz/types';

type ManagedQuiz=AdminQuiz&{effectiveStatus:'draft'|'scheduled'|'published';responseCount:number};
type ManagementState={quizzes:ManagedQuiz[];now:string};
type FormOption={label:string;imageUrl:string;imageCrop:QuizImageCrop;isCorrect:boolean};
type FormValue={question:string;heroImageUrl:string;heroImageCrop:QuizImageCrop;heroLinkUrl:string;explanation:string;status:QuizStatus;publishAt:string;options:FormOption[]};
type FormErrors=Record<string,string>;

const blankOption=():FormOption=>({label:'',imageUrl:'',imageCrop:{...DEFAULT_QUIZ_IMAGE_CROP},isCorrect:false});
const emptyForm=():FormValue=>({question:'',heroImageUrl:'',heroImageCrop:{...DEFAULT_QUIZ_IMAGE_CROP},heroLinkUrl:'',explanation:'',status:'draft',publishAt:'',options:[blankOption(),blankOption()]});

function localInputValue(value:string|null){
  if(!value)return '';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '';
  const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
  return parts.replace(' ','T');
}
function fromQuiz(quiz:ManagedQuiz):FormValue{
  return {
    question:quiz.question,heroImageUrl:quiz.heroImageUrl??'',heroImageCrop:quiz.heroImageCrop,heroLinkUrl:quiz.heroLinkUrl??'',explanation:quiz.explanation,
    status:quiz.status,publishAt:localInputValue(quiz.publishAt),
    options:quiz.options.map(option=>({label:option.label,imageUrl:option.imageUrl??'',imageCrop:option.imageCrop,isCorrect:option.isCorrect})),
  };
}
function statusLabel(status:ManagedQuiz['effectiveStatus']){return status==='published'?'공개 중':status==='scheduled'?'예약':'임시저장';}
function formatTime(value:string|null){
  if(!value)return '즉시';
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'시각 확인 필요':new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
}

function validHttpUrl(value:string){
  if(!value.trim())return true;
  try{const url=new URL(value.trim());return url.protocol==='http:'||url.protocol==='https:';}catch{return false;}
}

function parseKstPublishAt(value:string){
  const normalized=value.trim();
  if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized))return null;
  const parsed=new Date(normalized+':00+09:00');
  if(Number.isNaN(parsed.getTime())||localInputValue(parsed.toISOString())!==normalized)return null;
  return parsed.toISOString();
}

function validateForm(value:FormValue):FormErrors{
  const errors:FormErrors={};
  if(!value.question.trim())errors.question='퀴즈 문제를 입력해 주세요.';
  else if(value.question.trim().length>600)errors.question='퀴즈 문제는 600자 이하로 입력해 주세요.';
  if(!value.explanation.trim())errors.explanation='정답 해설을 입력해 주세요.';
  else if(value.explanation.trim().length>2400)errors.explanation='정답 해설은 2,400자 이하로 입력해 주세요.';
  if(!validHttpUrl(value.heroImageUrl))errors.heroImageUrl='메인 이미지에는 http/https URL을 입력해 주세요.';
  if(!validHttpUrl(value.heroLinkUrl))errors.heroLinkUrl='메인 이미지 링크에는 http/https URL을 입력해 주세요.';
  else if(value.heroLinkUrl.trim()&&!value.heroImageUrl.trim())errors.heroImageUrl='메인 이미지 링크를 사용하려면 메인 이미지 URL을 입력해 주세요.';
  if(value.status==='scheduled'&&!parseKstPublishAt(value.publishAt))errors.publishAt='유효한 KST 공개 시각을 YYYY-MM-DDTHH:MM 형식으로 입력해 주세요.';
  if(value.options.length<QUIZ_MIN_OPTIONS||value.options.length>QUIZ_MAX_OPTIONS)errors.options=`선택지는 ${QUIZ_MIN_OPTIONS}개 이상 ${QUIZ_MAX_OPTIONS}개 이하로 구성해 주세요.`;
  value.options.forEach((option,index)=>{
    if(!option.label.trim())errors[`option-${index}-label`]=`${index+1}번 선택지를 입력해 주세요.`;
    else if(option.label.trim().length>160)errors[`option-${index}-label`]=`${index+1}번 선택지는 160자 이하로 입력해 주세요.`;
    if(!validHttpUrl(option.imageUrl))errors[`option-${index}-imageUrl`]=`${index+1}번 이미지에는 http/https URL을 입력해 주세요.`;
  });
  if(value.options.filter(option=>option.isCorrect).length!==1)errors.correct='정답 선택지를 정확히 하나 지정해 주세요.';
  return errors;
}

function QuizForm({quiz,busy,onCancel,onSave}:{quiz:ManagedQuiz|null;busy:boolean;onCancel:()=>void;onSave:(value:FormValue)=>Promise<void>}){
  const [value,setValue]=useState<FormValue>(()=>quiz?fromQuiz(quiz):emptyForm());
  const [errors,setErrors]=useState<FormErrors>({});
  const [submitError,setSubmitError]=useState('');
  const formRef=useRef<HTMLFormElement>(null);
  const lockedOptions=!!quiz&&quiz.responseCount>0;
  const update=<K extends keyof FormValue>(key:K,next:FormValue[K])=>{setValue(current=>({...current,[key]:next}));setErrors(current=>{const copy={...current};delete copy[String(key)];return copy;});};
  const updateOption=(index:number,patch:Partial<FormOption>)=>setValue(current=>({...current,options:current.options.map((option,i)=>i===index?{...option,...patch}:option)}));
  const chooseCorrect=(index:number)=>setValue(current=>({...current,options:current.options.map((option,i)=>({...option,isCorrect:i===index}))}));

  function addOption(){
    if(lockedOptions||value.options.length>=QUIZ_MAX_OPTIONS)return;
    setValue(current=>({...current,options:[...current.options,blankOption()]}));
  }
  function removeOption(index:number){
    if(lockedOptions||value.options.length<=QUIZ_MIN_OPTIONS)return;
    setValue(current=>{
      const options=current.options.filter((_,i)=>i!==index);
      return {...current,options};
    });
  }

  async function submit(event:React.FormEvent){
    event.preventDefault();
    setSubmitError('');
    const nextErrors=validateForm(value);
    setErrors(nextErrors);
    const firstKey=Object.keys(nextErrors)[0];
    if(firstKey){
      requestAnimationFrame(()=>{
        const target=formRef.current?.querySelector<HTMLElement>(`[data-field="${firstKey}"]`);
        target?.scrollIntoView({behavior:'smooth',block:'center'});
        target?.focus();
      });
      return;
    }
    try{await onSave(value);}catch(error){setSubmitError((error as Error).message);}
  }

  return <div className="quiz-form-backdrop" role="presentation"><section className="quiz-form-sheet" role="dialog" aria-modal="true" aria-labelledby="quiz-editor-title">
    <header><h2 id="quiz-editor-title">{quiz?'퀴즈 편집':'새 퀴즈 만들기'}</h2><button type="button" onClick={onCancel} aria-label="닫기">×</button></header>
    <p>예약 상태는 공개 시각이 지나면 별도 작업 없이 자동으로 공개됩니다. 이미지는 URL로 등록하고 미리보기를 눌러 1:1 표시 영역을 조정할 수 있습니다.</p>
    <form ref={formRef} onSubmit={submit} noValidate>
      <label>문제 *<textarea data-field="question" aria-invalid={!!errors.question} rows={3} maxLength={600} value={value.question} onChange={event=>update('question',event.target.value)} placeholder="다음 중 키가 가장 큰 인물은?"/>{errors.question&&<span className="quiz-field-error">{errors.question}</span>}</label>
      <div className="quiz-form-grid">
        <label>메인 이미지 URL<input data-field="heroImageUrl" aria-invalid={!!errors.heroImageUrl} value={value.heroImageUrl} onChange={event=>update('heroImageUrl',event.target.value)} placeholder="https://..."/>{errors.heroImageUrl&&<span className="quiz-field-error">{errors.heroImageUrl}</span>}</label>
        <label>메인 이미지 링크 URL<input data-field="heroLinkUrl" aria-invalid={!!errors.heroLinkUrl} value={value.heroLinkUrl} onChange={event=>update('heroLinkUrl',event.target.value)} placeholder="https://youtube.com/..."/>{errors.heroLinkUrl&&<span className="quiz-field-error">{errors.heroLinkUrl}</span>}</label>
      </div>
      {value.heroImageUrl&&<div className="quiz-form-hero-preview"><QuizImageCropControl src={value.heroImageUrl} crop={value.heroImageCrop} label="메인 이미지" onChange={heroImageCrop=>update('heroImageCrop',heroImageCrop)}/>{value.heroLinkUrl&&validHttpUrl(value.heroLinkUrl)&&<a href={value.heroLinkUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/> 설정된 링크 확인</a>}</div>}
      <div className="quiz-form-grid">
        <label>상태<select value={value.status} onChange={event=>update('status',event.target.value as QuizStatus)}><option value="draft">임시저장</option><option value="scheduled">예약 공개</option><option value="published">즉시/공개</option></select></label>
        <label>공개 시각 · KST {value.status==='scheduled'?'*':''}<input data-field="publishAt" aria-invalid={!!errors.publishAt} type="text" inputMode="numeric" value={value.publishAt} onChange={event=>update('publishAt',event.target.value)} placeholder="2026-09-29T09:00"/>{errors.publishAt&&<span className="quiz-field-error">{errors.publishAt}</span>}</label>
      </div>
      <label>정답 해설 *<textarea data-field="explanation" aria-invalid={!!errors.explanation} rows={4} maxLength={2400} value={value.explanation} onChange={event=>update('explanation',event.target.value)} placeholder="정답과 간단한 설명을 적어주세요."/>{errors.explanation&&<span className="quiz-field-error">{errors.explanation}</span>}</label>
      {lockedOptions&&<p className="quiz-form-warning">이미 {quiz?.responseCount}명이 참여했습니다. 응답 기록을 보존하기 위해 선택지와 정답은 잠겨 있으며 나머지 문구·이미지·해설·공개 설정만 수정할 수 있습니다.</p>}
      <div className="quiz-form-options-heading"><strong>선택지 {value.options.length}/{QUIZ_MAX_OPTIONS}</strong>{!lockedOptions&&<button type="button" onClick={addOption} disabled={value.options.length>=QUIZ_MAX_OPTIONS}><Plus size={14}/> 선택지 추가</button>}</div>
      <div className="quiz-form-options">
        {value.options.map((option,index)=><div className="quiz-form-option" key={index}>
          <span>{String.fromCharCode(65+index)}</span>
          <label>선택지 *<input data-field={`option-${index}-label`} aria-invalid={!!errors[`option-${index}-label`]} disabled={lockedOptions} maxLength={160} value={option.label} onChange={event=>updateOption(index,{label:event.target.value})}/>{errors[`option-${index}-label`]&&<span className="quiz-field-error">{errors[`option-${index}-label`]}</span>}</label>
          <label>이미지 URL<input data-field={`option-${index}-imageUrl`} aria-invalid={!!errors[`option-${index}-imageUrl`]} disabled={lockedOptions} value={option.imageUrl} onChange={event=>updateOption(index,{imageUrl:event.target.value})} placeholder="https://..."/>{errors[`option-${index}-imageUrl`]&&<span className="quiz-field-error">{errors[`option-${index}-imageUrl`]}</span>}</label>
          <label className="quiz-correct-radio" title="정답"><input type="radio" name="correct-option" checked={option.isCorrect} disabled={lockedOptions} onChange={()=>chooseCorrect(index)}/></label>
          {!lockedOptions&&<button type="button" className="quiz-form-remove" onClick={()=>removeOption(index)} disabled={value.options.length<=QUIZ_MIN_OPTIONS} aria-label={`${index+1}번 선택지 삭제`}><Minus size={14}/></button>}
          {option.imageUrl&&<div className="quiz-form-option-preview"><QuizImageCropControl src={option.imageUrl} crop={option.imageCrop} label={`${index+1}번 선택지 이미지`} disabled={lockedOptions} onChange={imageCrop=>updateOption(index,{imageCrop})}/></div>}
        </div>)}
      </div>
      {errors.options&&<p className="quiz-error" data-field="options" tabIndex={-1}>{errors.options}</p>}
      {errors.correct&&<p className="quiz-error" data-field="correct" tabIndex={-1}>{errors.correct}</p>}
      {submitError&&<p className="quiz-error" role="alert">{submitError}</p>}
      <footer className="quiz-form-footer"><button type="button" onClick={onCancel}>취소</button><button className="primary" type="submit" disabled={busy}>{busy?'저장 중…':quiz?'변경 저장':'퀴즈 저장'}</button></footer>
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
      let publishAt:string|null=value.status==='scheduled'?(value.publishAt.trim()||null):null;
      if(publishAt){
        const parsed=parseKstPublishAt(publishAt);
        if(!parsed)throw new Error('유효한 KST 공개 시각을 확인해 주세요.');
        publishAt=parsed;
      }
      const quiz={...value,heroImageUrl:value.heroImageUrl.trim()||null,heroLinkUrl:value.heroLinkUrl.trim()||null,publishAt,options:value.options.map(option=>({...option,imageUrl:option.imageUrl.trim()||null}))};
      const action=editing?'update':'create';
      const response=await fetch('/api/admin/quiz',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,id:editing?.id,quiz})});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw new Error(data.error??'퀴즈를 저장하지 못했습니다.');
      await refresh();setEditing(undefined);setMessage(editing?'퀴즈를 수정했습니다.':'퀴즈를 만들었습니다.');
    }catch(error){setMessage((error as Error).message);throw error;}
    finally{setBusy(false);}
  }
  async function remove(quiz:ManagedQuiz){
    if(!window.confirm('"'+quiz.question+'" 퀴즈와 참여 기록을 모두 삭제할까요?'))return;
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
    <section className="quiz-admin-heading"><div><div className="eyebrow"><span className="yellow-line"/> HOLOCRON / QUIZ CONTROL</div><h1>Daily Quiz <span>관리</span></h1><p>문제·1:1 이미지·정답·해설을 만들고 즉시 공개하거나 원하는 시각으로 예약할 수 있습니다.</p></div><button type="button" onClick={()=>setEditing(null)}>+ 새 퀴즈</button></section>
    {message&&<div className="admin-message" role="status">{message}</div>}
    <section className="quiz-admin-list">{sorted.map(quiz=><article className="quiz-admin-item" key={quiz.id}><div><div className="quiz-admin-item-meta"><span className="quiz-admin-status" data-status={quiz.effectiveStatus}>{statusLabel(quiz.effectiveStatus)}</span><span>{formatTime(quiz.publishAt)}</span><span>참여 {quiz.responseCount}명</span><span>선택지 {quiz.options.length}개</span></div><h2>{quiz.question}</h2></div><div className="quiz-admin-actions"><button type="button" disabled={busy} onClick={()=>setEditing(quiz)}>편집</button><button type="button" className="danger" disabled={busy} onClick={()=>void remove(quiz)}>삭제</button></div></article>)}
      {!sorted.length&&<div className="quiz-admin-empty">아직 등록된 퀴즈가 없습니다. 첫 Daily Quiz를 만들어보세요.</div>}
    </section>
    {editing!==undefined&&<QuizForm quiz={editing} busy={busy} onCancel={()=>setEditing(undefined)} onSave={save}/>}
  </main></>;
}
