'use client';
/* eslint-disable @next/next/no-img-element */

import {useEffect,useMemo,useState} from 'react';
import {Check,CheckCircle2,CircleHelp,Clock3,XCircle} from 'lucide-react';
import type {PublicQuiz,QuizResult,QuizSummary} from '@/lib/quiz/types';

type ParticipationResponse={quiz:PublicQuiz;result:QuizResult|null;error?:string};

function formatPublished(value:string|null){
  if(!value)return '바로 공개';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return '공개 시각 확인 필요';
  return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}

export default function DailyQuiz({initialQuiz,archive}:{initialQuiz:PublicQuiz|null;archive:QuizSummary[]}){
  const [quiz,setQuiz]=useState(initialQuiz);
  const [result,setResult]=useState<QuizResult|null>(null);
  const [selected,setSelected]=useState('');
  const [busy,setBusy]=useState(false);
  const [checking,setChecking]=useState(!!initialQuiz);
  const [error,setError]=useState('');
  const resultById=useMemo(()=>new Map(result?.options.map(option=>[option.id,option])??[]),[result]);
  const correctOption=result&&quiz?quiz.options.find(option=>resultById.get(option.id)?.isCorrect):null;

  useEffect(()=>{
    if(!initialQuiz)return;
    const controller=new AbortController();
    fetch(`/api/quiz?quizId=${encodeURIComponent(initialQuiz.id)}`,{signal:controller.signal})
      .then(async response=>{const data=await response.json() as ParticipationResponse;if(!response.ok)throw new Error(data.error??'퀴즈 상태를 불러오지 못했습니다.');return data;})
      .then(data=>{setQuiz(data.quiz);setResult(data.result);if(data.result)setSelected(data.result.selectedOptionId);})
      .catch(reason=>{if(!controller.signal.aborted)setError((reason as Error).message);})
      .finally(()=>{if(!controller.signal.aborted)setChecking(false);});
    return ()=>controller.abort();
  },[initialQuiz]);

  async function vote(optionId:string){
    if(!quiz||result||busy||checking)return;
    setSelected(optionId);setBusy(true);setError('');
    try{
      const response=await fetch('/api/quiz',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quizId:quiz.id,optionId})});
      const data=await response.json() as ParticipationResponse;
      if(!response.ok)throw new Error(data.error??'응답을 저장하지 못했습니다.');
      setQuiz(data.quiz);setResult(data.result);
    }catch(reason){setError((reason as Error).message);setSelected('');}
    finally{setBusy(false);}
  }

  return <div className="quiz-layout">
    <section className="quiz-main" aria-live="polite">
      {!quiz?<div className="quiz-empty"><CircleHelp size={38}/><strong>아직 공개된 퀴즈가 없습니다.</strong><span>새로운 은하계 퀴즈가 준비되면 이곳에 나타납니다.</span></div>:<>
        <div className="quiz-meta"><span>DAILY QUIZ</span><span><Clock3 size={13}/>{formatPublished(quiz.publishAt)}</span></div>
        <h2>{quiz.title}</h2>
        {quiz.heroImageUrl&&<img className="quiz-hero-image" src={quiz.heroImageUrl} alt="퀴즈 메인 이미지"/>}
        <p className="quiz-question">{quiz.question}</p>
        <div className="quiz-options" data-result={!!result||undefined}>
          {quiz.options.map((option,index)=>{
            const stats=resultById.get(option.id);
            const isSelected=(result?.selectedOptionId??selected)===option.id;
            const state=result?(stats?.isCorrect?'correct':isSelected?'wrong':'neutral'):isSelected?'selected':'idle';
            return <button key={option.id} type="button" className="quiz-option" data-state={state} disabled={checking||busy||!!result} onClick={()=>void vote(option.id)}>
              {option.imageUrl&&<img src={option.imageUrl} alt=""/>}
              <span className="quiz-option-copy"><small>{String.fromCharCode(65+index)}</small><strong>{option.label}</strong></span>
              {result&&<span className="quiz-option-result"><b>{stats?.percent??0}%</b>{stats?.isCorrect?<CheckCircle2 size={21}/>:isSelected?<XCircle size={21}/>:null}</span>}
              {result&&<span className="quiz-option-meter" aria-hidden="true"><i style={{width:`${stats?.percent??0}%`}}/></span>}
            </button>;
          })}
        </div>
        {!result&&<p className="quiz-once-note">{checking?'이 브라우저의 참여 기록을 확인하고 있습니다…':'이 브라우저에서는 각 퀴즈에 한 번만 참여할 수 있습니다. 선택하면 바로 정답과 전체 선택 비율이 공개됩니다.'}</p>}
        {error&&<p className="quiz-error" role="alert">{error}</p>}
        {result&&<section className="quiz-answer-sheet"><div><Check size={18}/><strong>정답: {correctOption?.label??'확인 중'}</strong><span>총 {result.totalVotes.toLocaleString('ko-KR')}명 참여</span></div><p>{result.explanation}</p></section>}
      </>}
    </section>
    <aside className="quiz-archive">
      <div className="quiz-archive-heading"><strong>퀴즈 아카이브</strong><span>{archive.length}</span></div>
      <div className="quiz-archive-list">{archive.map(item=><a key={item.id} href={`/quiz?quiz=${encodeURIComponent(item.id)}`} data-active={quiz?.id===item.id||undefined}><span>{formatPublished(item.publishAt)}</span><strong>{item.title}</strong><small>{item.question}</small></a>)}</div>
      {!archive.length&&<p>아직 공개된 퀴즈가 없습니다.</p>}
    </aside>
  </div>;
}
