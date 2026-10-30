'use client';

import {useRef,useState,type FormEvent,type KeyboardEvent} from 'react';
import {displayUrl} from './api-client';
import styles from './free-workspace.module.css';

type Mode='chat'|'qa';
type FreeAnswer={
  mode:Mode;status:'ok'|'insufficient_evidence';answer:string;
  sources:{citation:number;title:string;source:string;published:string;url:string}[];
  limitations:string[];warnings:string[];
};
type FreeError={error?:{code?:string;message?:string}};

export default function FreeAssistantWorkspace({active=true}:{active?:boolean}){
  const [mode,setMode]=useState<Mode>('chat');
  const [query,setQuery]=useState('');
  const [submitted,setSubmitted]=useState('');
  const [result,setResult]=useState<FreeAnswer|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [copyStatus,setCopyStatus]=useState('');
  const inFlight=useRef(false);

  function changeMode(next:Mode){
    if(inFlight.current||next===mode)return;
    setMode(next);setQuery('');setSubmitted('');setResult(null);setError('');setCopyStatus('');
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(inFlight.current||!active||!query.trim())return;
    inFlight.current=true;setBusy(true);setError('');setCopyStatus('');setResult(null);setSubmitted(query.trim());
    const id=crypto.randomUUID();
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),45000);
    try{
      const response=await fetch('/api/assistant/free',{
        method:'POST',credentials:'same-origin',signal:controller.signal,
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({mode,requestId:id,query:query.trim()}),
      });
      let raw:FreeAnswer|FreeError;
      try{raw=await response.json() as FreeAnswer|FreeError;}
      catch{throw new Error('응답을 확인하지 못했습니다. 자동 재시도는 하지 않습니다.');}
      if(!response.ok){
        const problem=(raw as FreeError).error;
        if(problem?.code==='LOGIN_REQUIRED')throw new Error('Google 계정 로그인 후 이용해 주세요.');
        if(problem?.code==='ADMISSION_LIMIT')throw new Error('현재 무료 AI 요청 한도에 도달했습니다. 나중에 다시 이용해 주세요.');
        throw new Error(problem?.message||'AI 요청을 처리하지 못했습니다. 자동 재시도는 하지 않습니다.');
      }
      if(!raw||typeof raw!=='object'||!('answer' in raw))throw new Error('응답 형식이 올바르지 않습니다.');
      setResult(raw as FreeAnswer);
      setQuery('');
    }catch(reason){
      setError(controller.signal.aborted?'응답 시간이 초과되어 결과를 확인하지 못했습니다. 자동 재시도는 하지 않습니다.':reason instanceof Error?reason.message:'네트워크 오류로 요청 결과를 확인할 수 없습니다.');
    }finally{
      clearTimeout(timeout);inFlight.current=false;setBusy(false);
    }
  }
  function onKeyDown(event:KeyboardEvent<HTMLTextAreaElement>){
    if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing&&event.keyCode!==229){
      event.preventDefault();
      if(!busy&&active)event.currentTarget.form?.requestSubmit();
    }
  }
  async function copyAnswer(){
    if(!result)return;
    const lines=[result.answer,...result.sources.map(s=>'['+s.citation+'] '+s.title+' — '+s.url)];
    try{
      if(!navigator.clipboard)throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(lines.join('\n\n'));setCopyStatus('복사했습니다.');
    }catch{setCopyStatus('이 브라우저에서 복사할 수 없습니다. 답변을 선택해 복사해 주세요.');}
  }

  return <section className={styles.workspace} aria-label="무료 AI 도우미">
    <nav className={styles.tabs} aria-label="AI 도우미 기능">
      <button type="button" disabled={busy} aria-pressed={mode==='chat'} onClick={()=>changeMode('chat')}>일반 채팅</button>
      <button type="button" disabled={busy} aria-pressed={mode==='qa'} onClick={()=>changeMode('qa')}>뉴스 Q&A</button>
      <span className={styles.tag}>무료 베타</span>
    </nav>
    <p className={styles.description}>{mode==='chat'
      ?'스타워즈에 관해 자유롭게 질문할 수 있습니다. 현재 대화의 이전 질문을 기억하지 않는 단일 요청 방식이며, 최신 뉴스는 검증하지 않습니다.'
      :'최근 90일간 HOLOCRON에 공개된 뉴스의 제목과 요약을 검색하고, 그 근거에 한정해 답합니다.'}</p>
    <p className={styles.hint}>Google Account 로그인 필요 · Credit 차감 없음 · 운영비 보호를 위해 요청 속도 및 전체 횟수 제한 적용</p>
    {submitted&&<article className={styles.question}><strong>질문</strong><p>{submitted}</p></article>}
    {busy&&<p className={styles.status} role="status" aria-live="polite">AI 답변을 생성하고 있습니다…</p>}
    {error&&<div className={styles.error} role="alert"><strong>요청 실패</strong><p>{error}</p><a href="/api/auth/google/start">로그인하기</a></div>}
    {result&&<article className={styles.answer} aria-live="polite">
      <div className={styles.answerHead}><h2>HOLOCRON 답변</h2><button type="button" onClick={copyAnswer}>답변 복사</button></div>
      {copyStatus&&<p role="status" className={styles.hint}>{copyStatus}</p>}
      <p className={styles.answerText}>{result.answer}</p>
      {result.sources.length>0&&<section className={styles.references} aria-label="참고 뉴스">
        <h3>아카이브 근거</h3>
        <ol>{result.sources.map(source=>{
          const url=displayUrl(source.url);
          return <li key={source.citation}><strong>[{source.citation}] {source.title}</strong><span>{source.source} · {source.published}</span>
            {url&&<a href={url} target="_blank" rel="noopener noreferrer">원문 보기</a>}</li>;
        })}</ol>
      </section>}
      {result.limitations.length>0&&<section className={styles.notes}><h3>확인 한계</h3><ul>{result.limitations.map((note,i)=><li key={i}>{note}</li>)}</ul></section>}
      {result.warnings.length>0&&<p className={styles.warning}>{result.warnings.join(' ')}</p>}
    </article>}
    <form onSubmit={event=>void submit(event)} className={styles.composer}>
      <label htmlFor="free-assistant-query">{mode==='chat'?'스타워즈 질문':'뉴스 아카이브 질문'}</label>
      <textarea id="free-assistant-query" required rows={3} maxLength={500} value={query}
        disabled={busy||!active} placeholder={mode==='chat'?'다스 베이더에 대해 알려줘.':'최근 스타워즈 신작 발표 내용 알려줘.'}
        onChange={event=>setQuery(event.target.value)} onKeyDown={onKeyDown}/>
      <div className={styles.footer}>
        <span>Enter 전송 · Shift+Enter 줄바꿈</span>
        <button type="submit" disabled={busy||!active||!query.trim()}>{busy?'생성 중…':'무료 질문하기'}</button>
      </div>
      <p className={styles.hint}>질문과 필요한 공개 뉴스 요약이 AI 제공자에게 전송됩니다. 민감한 정보는 입력하지 마세요. 서버는 답변 원문을 보관하지 않습니다.</p>
    </form>
  </section>;
}
