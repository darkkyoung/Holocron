'use client';

import {useEffect,useRef,useState} from 'react';
import ChatComposer from './chat-composer';
import MessageActions from './message-actions';
import type {FilterChoices} from './contracts';
import {useAssistantSession} from './use-assistant-session';
import AssistantFilters from './assistant-filters';
import StorySelection from './story-selection';
import AssistantResult,{copyText} from './assistant-result';
import {settlementText} from './api-client';
import styles from './assistant-workspace.module.css';

export default function AssistantWorkspace({active=true,...choices}:FilterChoices&{active?:boolean}){
  const session=useAssistantSession(active);
  const {resultHeading:resultHeadingRef,errorHeading:errorHeadingRef,searchHeading:searchHeadingRef}=session;
  const {mode,query,filters,instructions,retrieval,selected,result,stage,stale,dirty,failure,notice,credit,busy,needsSearch,inputChanged,price,uncertain,searchRecovery,expiryReached,additionalConsent,needsAdditionalConsent}=session;
  const account=credit?.ownerType==='account',locked=busy||uncertain;
  const direct=mode==='qa'&&!session.newsSearch;
  const ready=retrieval?.status==='ready'&&!needsSearch;
  const [settingsOpen,setSettingsOpen]=useState(false);
  const conversation=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(active)conversation.current?.scrollTo({top:conversation.current.scrollHeight,behavior:'auto'});},[active,stage,result,session.chatResult,failure,additionalConsent,settingsOpen]);
  const cannotRegenerate=locked||searchRecovery||!account||price===null||credit.balance<price||(!direct&&(!ready||!selected.length));
  const cost=direct?`일반 AI 채팅 · ${price??'확인 중'} CR/회 · KST 하루 5회`:`뉴스 검색 무료 · ${mode==='qa'?'뉴스 Q&A':'영상 구성안 플래너'} ${price??'확인 중'} CR/회`;
  const actions=(text?:string)=><MessageActions text={text} onRegenerate={session.regenerate} disabled={cannotRegenerate}/>;
  return <div className={styles.workspace}>
    <nav className={styles.modes} aria-label="도우미 기능">
      <button type="button" disabled={locked} aria-pressed={direct} onClick={()=>session.changeNewsSearch(false)}>일반 AI 채팅</button>
      <button type="button" disabled={locked} aria-pressed={!direct} onClick={()=>session.changeNewsSearch(true)}>뉴스 Q&A</button>

    </nav>
    <div ref={conversation} className={styles.conversation} aria-label="대화 내용" aria-busy={busy}>
      {!account&&<p className={styles.notice}>AI 검색·생성은 Account 전용입니다. <a href="/api/auth/google/start">Google 로그인</a> 후 이용해 주세요. 일반 뉴스 검색은 무료입니다.</p>}
      {direct&&<p className={styles.muted}>일반 지식으로 답하며 최신 뉴스를 검증하지 않습니다.</p>}
      <p className={stage==='completed'?styles.srOnly:styles.live} role="status" aria-live="polite">{notice}</p>
      {session.submittedQuery&&<p className={styles.userQuestion}>{session.submittedQuery}</p>}
      {session.chatResult&&<div className={styles.exchange}><h2 ref={resultHeadingRef} tabIndex={-1} className={styles.focusHeading}>HOLOCRON 답변</h2>{query&&session.submittedQuery!==query&&<p className={styles.notice}>이전 질문에 대한 답변입니다.</p>}<p className={styles.answerText}>{session.chatResult.answer}</p><p className={styles.muted}>일반 지식 답변 · 최신 뉴스 미검증 · {settlementText(session.chatResult.credit)}</p>{actions(session.chatResult.answer)}</div>}
      {result&&<div className={styles.exchange}><h2 ref={resultHeadingRef} tabIndex={-1} className={styles.focusHeading}>HOLOCRON 답변</h2><p className={styles.muted}>검색: {retrieval?.credit?.charged===1?'과거 요청 1 CR 사용 완료':'무료 · 0 CR'} · 생성: {settlementText(result.credit)}</p><AssistantResult view={result} stale={stale} inputChanged={inputChanged} />{actions(copyText(result,result.mode==='qa'?'answer':'planner'))}</div>}
      {retrieval&&<details className={styles.evidenceDisclosure} ><summary>근거 확인 · 선택 변경</summary><section className={styles.candidates} aria-labelledby="assistant-search-title"><h2 ref={searchHeadingRef} tabIndex={-1} id="assistant-search-title">{retrieval.status==='ready'?'답변에 연결할 근거':'검색 안내'}</h2>
        {retrieval.status==='clarification'&&<div className={styles.notice}><p>작품 또는 시즌을 정확히 선택하거나 질문을 구체화해 주세요.</p>{retrieval.workChoices.map(work=><button className={styles.secondary} key={work.id} type="button" onClick={()=>session.changeFilters({workId:work.id})}>{work.title} 선택</button>)}<p>선택 후 새 검색을 눌러야 합니다. 검색 비용 0 CR.</p></div>}
        {retrieval.status==='insufficient_evidence'&&<p className={styles.notice}>일치하는 공개 소식이 없습니다. AI 생성과 Credit 차감은 진행되지 않습니다.</p>}
        {retrieval.status==='ready'&&<><StorySelection candidates={retrieval.candidates} selected={selected} mode={mode} onToggle={id=>session.toggle(id)} disabled={locked} compact/>
          {needsSearch&&<p className={styles.notice}>{dirty?'검색 질문 또는 상세 조건이 달라졌습니다. 새 검색이 필요합니다.':expiryReached?'검색 Receipt의 10분 유효기간이 지났습니다. 새 검색이 필요합니다.':'서버가 근거 변경을 확인했습니다. 새 검색 후 소식을 다시 검토해 주세요.'}</p>}
          <div className={styles.generation}><p>{mode==='qa'?'답변':'영상 구성안 플래너'} {price} CR · 선택한 근거 {selected.length}개</p><button type="button" className={styles.secondary} disabled={locked||searchRecovery||!ready||!selected.length||!account||!credit.policy} onClick={()=>void session.generate()}>{needsAdditionalConsent?'추가 생성 비용 확인':`${price} CR로 생성하기`}</button>
          <p className={styles.muted}>한 번의 동의로 생성은 1회만 요청합니다. 실패 후 새 생성에는 별도의 추가 비용 동의가 필요합니다.</p></div></>}
      </section></details>}

      {failure&&<div className={styles.error} role="alert"><h2 ref={errorHeadingRef} tabIndex={-1}>{uncertain?'정산 상태 확인 필요':failure.code==='INVALID_OUTPUT'?'생성 응답 검증 실패':['INVALID_REQUEST','EVIDENCE_CHANGED','PRICE_CHANGED'].includes(failure.code)?'입력·근거 확인 필요':'요청 결과를 확인해 주세요'}</h2><p>{failure.message}</p><p>{failure.settlement}</p>{failure.code==='EVIDENCE_CHANGED'&&<p>이전 Story를 새 Story에 자동 연결하지 않습니다. 새 검색과 근거 검토가 필요합니다.</p>}{failure.code==='LOGIN_REQUIRED'&&<a href="/api/auth/google/start">Google 로그인</a>}{failure.code==='INSUFFICIENT_BALANCE'&&<p>현재 Account Credit으로는 이 생성을 요청할 수 없습니다.</p>}{uncertain&&<p>정산 확인 전 추가 유료 요청을 차단했습니다. 같은 요청을 자동으로 다시 보내지 않습니다. 화면을 새로 열어 반복하지 말고 관리자에게 정산 확인을 요청해 주세요.</p>}</div>}
      {failure&&session.submittedQuery&&actions()}
      {additionalConsent&&<section className={styles.consent} role="group" aria-label="추가 유료 생성 확인">
        <p>같은 요청으로 새 답변을 생성하면 <strong>추가 {additionalConsent.price} CR</strong>이 필요합니다. {additionalConsent.target==='chat'?'KST 하루 5회 한도에서 새 요청 1회를 사용합니다.':'기존 검색 근거를 사용하며 검색 비용은 추가되지 않습니다.'}</p>
        <button type="button" className={styles.primaryButton} disabled={cannotRegenerate} onClick={()=>void session.confirmAdditionalGeneration()}>{`추가 ${additionalConsent.price} CR 사용에 동의하고 생성`}</button>
        <button type="button" className={styles.secondary} onClick={session.cancelAdditionalConsent}>취소</button>
      </section>}
      <section hidden={!settingsOpen} id="assistant-settings" className={styles.composerOptions} aria-label="상세 설정">
        <p className={styles.muted}>{direct?'일반 지식 답변이며 최신 뉴스는 검증하지 않습니다. 매 요청은 독립적이며 이전 대화를 기억하지 않습니다.':'저장된 뉴스 제목·요약을 참고합니다. 검색 결과 없음은 0 CR입니다.'}</p>
        {mode==='script'&&<p className={styles.muted}>영상·완성 대본이 아닌 구간별 구성안을 만듭니다.</p>}
        {!direct&&<AssistantFilters {...choices} filters={filters} disabled={locked} onChange={patch=>session.changeFilters(patch)}/>}
        {mode==='script'&&<details className={styles.advanced}><summary>구성 방향 요청 (선택)</summary><textarea aria-label="구성 방향 요청" rows={2} maxLength={1000} disabled={locked} value={instructions} onChange={event=>session.setInstructions(event.target.value)} placeholder="예: 핵심 소식을 먼저 소개하고 주의할 점으로 연결"/></details>}
        {!direct&&<button className={styles.textButton} type="button" disabled={busy||uncertain||!account||!query.trim()} onClick={()=>void session.search({preventDefault(){}},false)}>{searchRecovery?'동일 요청으로 검색 결과 복구':'근거를 먼저 선택 · 무료 검색'}</button>}
        <details className={styles.advanced}><summary>정보 전송 및 정산 안내</summary><p className={styles.muted}>질문과 선택한 공개 기사 제목·요약이 AI 제공자에게 전송됩니다. 개인정보·비밀정보를 입력하지 마세요. 생성 결과는 서버에 보관하지 않습니다. 검색 복구용 결과는 최대 10분 보관하며 제공자 측 보존 정책은 별개입니다. 응답 유실 시 자동 재시도하지 않습니다.</p></details>
        </section>
    </div>
      <ChatComposer query={query} onChange={session.changeQuery} onSubmit={event=>void (direct?session.submitChat(event):session.search(event,true))} locked={locked} busy={busy}
        disabled={locked||searchRecovery||!account||price===null||!query.trim()||credit.balance<price}
        label={mode==='qa'?'질문':'영상 주제'} placeholder={direct?'무엇이 궁금하세요?':mode==='qa'?'어떤 소식을 찾을까요?':'어떤 영상 주제를 구성할까요?'} cost={cost} balance={account?`Account ${credit.balance} CR`:'Account 로그인 필요'}>
        <button className={styles.textButton} type="button" aria-controls="assistant-settings" aria-expanded={settingsOpen} onClick={()=>setSettingsOpen(value=>!value)}>상세 설정</button>
      </ChatComposer>
  </div>;
}
