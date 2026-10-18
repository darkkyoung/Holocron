'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import {CREDIT_CHANGED,initializeGuestCredits} from '@/components/credit/client';
import type {GuestCreditState} from '@/lib/credit/rewards/policy';
import type {AssistantMode,FilterChoices,FilterDraft,GenerationView,RetrievalView} from './contracts';
import {emptyFilters,generationCost,retrievalFilters} from './contracts';
import {generateSelection,retrieveCandidates,settlementText,WorkspaceRequestError} from './api-client';
import StorySelection,{SelectedReview} from './story-selection';
import AssistantResult from './assistant-result';
import styles from './assistant-workspace.module.css';

type Stage='idle'|'searching'|'results'|'generating'|'completed'|'error';
type Failure={code:string;message:string;settlement?:string};
const SOURCE_DISCLOSURE='최근 90일의 공개된 HOLOCRON 뉴스 제목과 요약을 근거로 답합니다. 인터넷 전체나 기사 원문 전체를 검색하지 않습니다.';

export default function AssistantWorkspace({workOptions,categories,sources}:FilterChoices){
  const [mode,setMode]=useState<AssistantMode>('qa'),[query,setQuery]=useState(''),[filters,setFilters]=useState<FilterDraft>(emptyFilters);
  const [instructions,setInstructions]=useState('');
  const [retrieval,setRetrieval]=useState<RetrievalView|null>(null),[selected,setSelected]=useState<string[]>([]),[retrievedAt,setRetrievedAt]=useState(0);
  const [result,setResult]=useState<GenerationView|null>(null),[stage,setStage]=useState<Stage>('idle'),[stale,setStale]=useState(false),[dirty,setDirty]=useState(false);
  const [failure,setFailure]=useState<Failure|null>(null),[notice,setNotice]=useState(''),[credit,setCredit]=useState<GuestCreditState|null>(null);
  const [resultInput,setResultInput]=useState<string|null>(null);
  const controller=useRef<AbortController|null>(null),resultHeading=useRef<HTMLHeadingElement>(null),errorHeading=useRef<HTMLHeadingElement>(null),searchHeading=useRef<HTMLHeadingElement>(null);
  const busy=stage==='searching'||stage==='generating',max=mode==='qa'?6:8;
  const needsSearch=dirty||stale;
  const inputSignature=JSON.stringify([mode,query,filters,instructions]);
  const inputChanged=Boolean(result&&resultInput!==inputSignature);

  useEffect(()=>{
    let mounted=true;
    const changed=(event:Event)=>{if(mounted)setCredit((event as CustomEvent<GuestCreditState|null>).detail);};
    const visible=()=>{if(document.visibilityState==='hidden')documentWasHidden.current=true;else if(document.visibilityState==='visible'&&documentWasHidden.current){documentWasHidden.current=false;setStale(true);}};
    const documentWasHidden={current:false};
    window.addEventListener(CREDIT_CHANGED,changed);document.addEventListener('visibilitychange',visible);
    void initializeGuestCredits().then(value=>{if(mounted)setCredit(value);}).catch(()=>{if(mounted)setCredit(null);});
    return()=>{mounted=false;controller.current?.abort();window.removeEventListener(CREDIT_CHANGED,changed);document.removeEventListener('visibilitychange',visible);};
  },[]);
  useEffect(()=>{if(retrievedAt){const timer=setTimeout(()=>setStale(true),Math.max(0,9*60*1000-(Date.now()-retrievedAt)));return()=>clearTimeout(timer);}},[retrievedAt]);
  useEffect(()=>{if(failure)errorHeading.current?.focus();else if(stage==='completed')resultHeading.current?.focus();else if(stage==='results')searchHeading.current?.focus();},[failure,stage]);

  function changeMode(next:AssistantMode){
    if(busy||next===mode)return;
    setMode(next);setQuery('');setFilters(emptyFilters());setInstructions('');setRetrieval(null);setSelected([]);setResult(null);setFailure(null);setNotice('');setStage('idle');setDirty(false);setStale(false);setRetrievedAt(0);
  }
  function changeFilters(patch:Partial<FilterDraft>){setFilters(previous=>({...previous,...patch}));setDirty(true);}
  async function search(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;
    const active=new AbortController();controller.current=active;
    setStage('searching');setFailure(null);setNotice('공개 아카이브에서 소식을 찾고 있습니다.');setStale(true);
    try{
      const response=await retrieveCandidates({mode,query,filters:retrievalFilters(filters)},active.signal);
      setRetrieval(response);setSelected(mode==='qa'?response.proposedStoryIds.slice(0,6):[]);setResult(null);setStale(false);setDirty(false);setRetrievedAt(response.status==='ready'?Date.now():0);setStage('results');
      setNotice(response.status==='clarification'?'작품이나 검색어를 더 구체적으로 선택해 주세요.':response.status==='insufficient_evidence'?'해당 근거가 없습니다. 검색어와 필터를 바꿔 다시 검색해 주세요.':`${response.candidates.length}개 소식을 찾았습니다. 생성할 근거를 검토해 주세요.`);
    }catch(reason){if(active.signal.aborted)return;const error=reason as WorkspaceRequestError;setFailure({code:error.code??'UNKNOWN',message:error instanceof WorkspaceRequestError?error.message:'검색할 수 없습니다. 다시 시도해 주세요.'});setStage('error');}
    finally{if(controller.current===active)controller.current=null;}
  }
  async function generate(){
    if(busy||!retrieval||retrieval.status!=='ready'||!retrieval.receipt||!selected.length||needsSearch||credit?.ownerType!=='account')return;
    if(Date.now()-retrievedAt>=9*60*1000){setStale(true);return;}
    const active=new AbortController();controller.current=active;
    setStage('generating');setFailure(null);setNotice('선택한 기사만 검증하고 있습니다. 결과가 확인될 때까지 기다려 주세요.');setResult(null);
    const requestId=crypto.randomUUID();
    try{
      const response=await generateSelection({requestId,mode,receipt:retrieval.receipt,selectedStoryIds:selected,instructions:mode==='qa'?'':instructions,includeDraft:false},active.signal);
      setResult(response);setResultInput(inputSignature);setStage('completed');setNotice(response.status==='ok'?'검증된 결과가 도착했습니다.':'선택한 근거로는 답을 만들 수 없습니다. 실제 환불 정산을 확인해 주세요.');
      void initializeGuestCredits(true).catch(()=>setNotice('결과는 도착했지만 현재 Credit 잔액은 다시 확인해 주세요.'));
    }catch(reason){
      if(active.signal.aborted){setStage('error');setFailure({code:'CANCELLED_UNKNOWN',message:'요청을 중단했습니다. 브라우저에서 실제 차감 또는 환불 여부를 확인할 수 없습니다. 자동 재요청하지 마세요.',settlement:settlementText(undefined)});return;}
      const error=reason as WorkspaceRequestError;
      setFailure({code:error.code??'UNKNOWN',message:error instanceof WorkspaceRequestError?error.message:'응답이 끊겼습니다. 차감·정산 여부를 확인할 수 없습니다. 자동 재요청하지 마세요.',settlement:settlementText(error instanceof WorkspaceRequestError?error.credit:undefined)});
      if(error instanceof WorkspaceRequestError&&error.code==='EVIDENCE_CHANGED')setStale(true);
      setStage('error');
      if(error instanceof WorkspaceRequestError&&error.credit)void initializeGuestCredits(true).catch(()=>{});
    }finally{if(controller.current===active)controller.current=null;}
  }
  function cancel(){controller.current?.abort();setNotice('취소를 요청했습니다. 제공자 비용과 Credit 정산 여부는 아직 확인되지 않았습니다.');}
  function toggle(storyId:string){
    if(busy)return;
    setSelected(current=>current.includes(storyId)?current.filter(id=>id!==storyId):current.length<max?[...current,storyId]:current);
    setResult(null);setFailure(null);setStage('results');
  }
  const price=generationCost(mode);
  return <div className={styles.workspace}>
    <header className={styles.hero}><div className="eyebrow"><span className="yellow-line"/> HOLOCRON / GROUNDED ASSISTANT</div><h1>AI <span>도우미</span></h1><p>{SOURCE_DISCLOSURE}</p></header>
    <div className={styles.modes} role="group" aria-label="도우미 모드"><button type="button" disabled={busy} aria-pressed={mode==='qa'} onClick={()=>changeMode('qa')}>아카이브에 질문하기</button><button type="button" disabled={busy} aria-pressed={mode==='script'} onClick={()=>changeMode('script')}>영상 구성 가이드 만들기</button></div>
    <div className={styles.columns}><div className={styles.primary}>
      <form className={styles.searchForm} onSubmit={event=>void search(event)} aria-label="아카이브 검색"><h2>{mode==='qa'?'아카이브에 질문하기':'영상 주제 검색'}</h2>
        <label htmlFor="assistant-query">{mode==='qa'?'질문':'영상 주제'}</label><textarea id="assistant-query" rows={3} maxLength={500} value={query} disabled={busy} onChange={event=>{setQuery(event.target.value);setDirty(true);}} placeholder={mode==='qa'?'최근 공개된 스타워즈 소식 중 어떤 점이 궁금하신가요?':'근거를 찾을 영상 주제를 입력하세요.'} required/>
        <div className={styles.filters}>
          <label>관련 작품 <select value={filters.workId} disabled={busy} onChange={event=>changeFilters({workId:event.target.value})}><option value="">자동 찾기 / 전체</option>{workOptions.map(work=><option key={work.id} value={work.id}>{work.title}</option>)}</select></label>
          <label>카테고리 <select value={filters.category} disabled={busy} onChange={event=>changeFilters({category:event.target.value})}><option value="">전체</option>{categories.map(category=><option key={category} value={category}>{category}</option>)}</select></label>
          <label>게시 시작일 <input type="date" value={filters.dateFrom} disabled={busy} onChange={event=>changeFilters({dateFrom:event.target.value})}/></label>
          <label>게시 종료일 <input type="date" value={filters.dateTo} disabled={busy} onChange={event=>changeFilters({dateTo:event.target.value})}/></label>
          <fieldset><legend>출처 제한 · 최대 7곳</legend><div className={styles.sourceFilters}>{sources.map(source=><label key={source.id}><input type="checkbox" checked={filters.sourceIds.includes(source.id)} disabled={busy} onChange={()=>changeFilters({sourceIds:filters.sourceIds.includes(source.id)?filters.sourceIds.filter(id=>id!==source.id):[...filters.sourceIds,source.id]})}/>{source.name}</label>)}</div></fieldset>
        </div>
        <button className={styles.primaryButton} type="submit" disabled={busy}>{stage==='searching'?'찾는 중…':retrieval?'다시 검색하기':'무료로 소식 찾기'}</button>
        <p className={styles.muted}>검색·근거 검토는 무료입니다. 검색 자체에도 요청 횟수 제한이 적용됩니다.</p>
      </form>
      {retrieval&&<section className={styles.candidates} aria-labelledby="assistant-search-title"><h2 ref={searchHeading} tabIndex={-1} id="assistant-search-title">검색 결과</h2>
        <p>검색어: {retrieval.searchTerms.length?retrieval.searchTerms.join(' · '):'작품 연결 기준'} · 확인 시각 {retrieval.asOf}</p>
        {retrieval.resolvedWork&&<p>확인된 작품: {retrieval.resolvedWork.title}</p>}
        {retrieval.status==='clarification'&&<div className={styles.notice}><p>작품 또는 시즌을 정확히 선택하거나 검색어를 구체화해 주세요.</p>{retrieval.workChoices.map(work=><button className={styles.secondary} type="button" key={work.id} onClick={()=>changeFilters({workId:work.id})}>{work.title} 선택</button>)}<p>선택 후 새 검색을 눌러야 합니다.</p></div>}
        {retrieval.status==='insufficient_evidence'&&<p className={styles.notice}>일치하는 공개 소식이 없습니다. AI 생성과 Credit 차감은 진행되지 않습니다.</p>}
        {retrieval.status==='ready'&&<StorySelection candidates={retrieval.candidates} selected={selected} mode={mode} onToggle={toggle} disabled={busy}/>}
      </section>}
    </div><aside className={styles.secondaryColumn} aria-label="근거 검토 및 생성">
      {retrieval?.status==='ready'&&<><SelectedReview candidates={retrieval.candidates} selected={selected}/>
        {mode==='script'&&<div className={styles.preferences}><label htmlFor="assistant-instructions">구성 방향 요청 (선택)</label><textarea id="assistant-instructions" rows={3} value={instructions} maxLength={1000} disabled={busy} onChange={event=>setInstructions(event.target.value)} placeholder="예: 핵심 소식을 먼저 소개하고 주의할 점으로 연결"/><p className={styles.muted}>완성 대본이 아닌 영상 전개 순서와 핵심 포인트를 제안합니다. 실제 대본은 근거를 참고해 직접 작성해 주세요.</p></div>}
        <div className={styles.generation}><h2>생성 전 확인</h2><p>{mode==='qa'?'답변 5 CR':'영상 구성 가이드 7 CR'} · 선택한 소식 {selected.length}개</p>
          <p className={styles.muted}>요청 내용과 선택된 공개 아카이브 제목·요약이 설정된 AI 제공자에게 전송됩니다. HOLOCRON은 대화와 생성 결과를 저장하지 않습니다. 제공자 측 보존 기간은 별개입니다. 개인 정보와 비밀 정보를 입력하지 마세요.</p>
          {credit?.ownerType==='account'?<p>Account 잔액: {credit.balance} CR · 실제 차감과 잔액은 서버가 결정합니다.</p>:<p>{credit?'AI 생성은 Account 로그인 후 이용할 수 있습니다.':'Credit 상태를 확인 중입니다. 로그인 후 이용해 주세요.'} <a href="/api/auth/google/start">Google 로그인</a></p>}
          {needsSearch&&<p className={styles.notice}>근거가 오래됐거나 검색 조건이 달라졌습니다. 새 검색 후 소식을 다시 검토해 주세요.</p>}
          <button className={styles.primaryButton} type="button" disabled={busy||!selected.length||needsSearch||credit?.ownerType!=='account'} onClick={()=>void generate()}>{stage==='generating'?'검증·생성 중…':`${price} CR로 생성하기`}</button>
          {stage==='generating'&&<button className={styles.secondary} type="button" onClick={cancel}>요청 취소</button>}
          <p className={styles.muted}>완료 후 변경하거나 다시 생성하면 새 요청과 새 차감입니다. 자동 재시도는 하지 않습니다.</p>
        </div>
      </>}
      {result&&<><h2 ref={resultHeading} tabIndex={-1} className={styles.focusHeading}>생성 결과</h2><p className={styles.notice}>{settlementText(result.credit)}</p><AssistantResult view={result} stale={stale} inputChanged={inputChanged} onMessage={setNotice}/></>}
    </aside></div>
    {failure&&<div className={styles.error} role="alert"><h2 ref={errorHeading} tabIndex={-1}>요청 결과를 확인해 주세요</h2><p>{failure.message}</p>{failure.settlement&&<p>{failure.settlement}</p>}{failure.code==='EVIDENCE_CHANGED'&&<p>이전 Story를 새 Story에 자동 연결하지 않습니다. 새 검색과 근거 검토가 필요합니다.</p>}{failure.code==='LOGIN_REQUIRED'&&<a href="/api/auth/google/start">Google 로그인</a>}{failure.code==='INSUFFICIENT_BALANCE'&&<p>현재 Account Credit으로는 이 생성을 요청할 수 없습니다.</p>}{['RESULT_NOT_RETAINED','REQUEST_IN_PROGRESS'].includes(failure.code)&&<p>같은 요청을 자동으로 다시 보내지 않습니다. 새 생성은 별도의 명시적 선택이며 Credit이 다시 차감될 수 있습니다.</p>}</div>}
    <p className={styles.live} role="status" aria-live="polite">{notice}</p>
  </div>;
}
