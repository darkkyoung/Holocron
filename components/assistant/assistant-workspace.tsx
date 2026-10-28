'use client';

import type {FilterChoices} from './contracts';
import {useAssistantSession} from './use-assistant-session';
import AssistantFilters from './assistant-filters';
import StorySelection from './story-selection';
import AssistantResult from './assistant-result';
import {settlementText} from './api-client';
import styles from './assistant-workspace.module.css';

export default function AssistantWorkspace({active=true,...choices}:FilterChoices&{active?:boolean}){
  const session=useAssistantSession(active);
  const {resultHeading:resultHeadingRef,errorHeading:errorHeadingRef,searchHeading:searchHeadingRef}=session;
  const {mode,query,filters,instructions,retrieval,selected,result,stage,stale,dirty,failure,notice,credit,busy,needsSearch,inputChanged,price,uncertain,searchRecovery,expiryReached,additionalConsent,needsAdditionalConsent}=session;
  const account=credit?.ownerType==='account',locked=busy||uncertain;
  const ready=retrieval?.status==='ready'&&!needsSearch;
  return <div className={styles.workspace}>
    <nav className={styles.modes} aria-label="도우미 기능">
      <span className={styles.navBrand}>HOLOCRON AI</span>
      <button type="button" disabled={locked} aria-pressed={mode==='qa'} onClick={()=>session.changeMode('qa')}>뉴스 Q&A</button>
      <button type="button" disabled={locked} aria-pressed={mode==='script'} onClick={()=>session.changeMode('script')}>영상 구성안 플래너</button>

    </nav>
    <div className={styles.conversation}>
      <p className={styles.scope}>저장된 뉴스 제목·요약을 바탕으로 답합니다.</p>
      {mode==='script'&&<p className={styles.muted}>추천 뉴스와 구간별 상세 구성안을 작성합니다. 영상·완성 대본은 제작하지 않습니다.</p>}
      {!account&&<p className={styles.notice}>AI 검색·생성은 Account 전용입니다. <a href="/api/auth/google/start">Google 로그인</a> 후 이용해 주세요. 일반 뉴스 검색은 무료입니다.</p>}
      <p className={styles.live} role="status" aria-live="polite">{notice}</p>
      {session.submittedQuery&&<p className={styles.userQuestion}>{session.submittedQuery}</p>}
      {result&&<div className={styles.exchange}><h2 ref={resultHeadingRef} tabIndex={-1} className={styles.focusHeading}>HOLOCRON 답변</h2><p className={styles.muted}>검색: {retrieval?.credit?.charged===1?'1 CR 사용 완료':'정산 확인 필요'} · 생성: {settlementText(result.credit)}</p><AssistantResult view={result} stale={stale} inputChanged={inputChanged} onMessage={message=>session.setNotice(message)}/></div>}
      {retrieval&&<details className={styles.evidenceDisclosure} ><summary>근거 확인 · 선택 변경</summary><section className={styles.candidates} aria-labelledby="assistant-search-title"><h2 ref={searchHeadingRef} tabIndex={-1} id="assistant-search-title">{retrieval.status==='ready'?'답변에 연결할 근거':'검색 안내'}</h2>
        {retrieval.status==='clarification'&&<div className={styles.notice}><p>작품 또는 시즌을 정확히 선택하거나 질문을 구체화해 주세요.</p>{retrieval.workChoices.map(work=><button className={styles.secondary} key={work.id} type="button" onClick={()=>session.changeFilters({workId:work.id})}>{work.title} 선택</button>)}<p>선택 후 새 검색을 눌러야 합니다. 검색 비용 0 CR.</p></div>}
        {retrieval.status==='insufficient_evidence'&&<p className={styles.notice}>일치하는 공개 소식이 없습니다. AI 생성과 Credit 차감은 진행되지 않습니다.</p>}
        {retrieval.status==='ready'&&<><StorySelection candidates={retrieval.candidates} selected={selected} mode={mode} onToggle={id=>session.toggle(id)} disabled={locked} compact/>
          {needsSearch&&<p className={styles.notice}>{dirty?'검색 질문 또는 상세 조건이 달라졌습니다. 새 검색이 필요합니다.':expiryReached?'검색 Receipt의 10분 유효기간이 지났습니다. 새 검색이 필요합니다.':'서버가 근거 변경을 확인했습니다. 새 검색 후 소식을 다시 검토해 주세요.'}</p>}
          <div className={styles.generation}><p>{mode==='qa'?'답변':'영상 구성안 플래너'} {price} CR · 선택한 근거 {selected.length}개</p><button type="button" className={styles.secondary} disabled={locked||searchRecovery||!ready||!selected.length||!account||!credit.policy} onClick={()=>void session.generate()}>{needsAdditionalConsent?'추가 생성 비용 확인':`${price} CR로 생성하기`}</button>
          {additionalConsent&&<div role="group" aria-label="추가 유료 생성 확인"><p>이전 생성 요청은 끝났습니다. 새 {mode==='qa'?'Q&A':'영상 구성안 플래너'}를 요청하면 <strong>추가 {additionalConsent.price} CR</strong>이 필요합니다. 기존 검색 근거를 사용하며 검색 비용은 추가되지 않습니다.</p><button type="button" className={styles.primaryButton} disabled={locked||!ready||!account} onClick={()=>void session.confirmAdditionalGeneration()}>추가 {additionalConsent.price} CR 사용에 동의하고 생성</button><button type="button" className={styles.secondary} onClick={session.cancelAdditionalConsent}>취소</button></div>}
          <p className={styles.muted}>한 번의 동의로 생성은 1회만 요청합니다. 실패 후 새 생성에는 별도의 추가 비용 동의가 필요합니다.</p></div></>}
      </section></details>}

      {failure&&<div className={styles.error} role="alert"><h2 ref={errorHeadingRef} tabIndex={-1}>{uncertain?'정산 상태 확인 필요':failure.code==='INVALID_OUTPUT'?'생성 응답 검증 실패':['INVALID_REQUEST','EVIDENCE_CHANGED','PRICE_CHANGED'].includes(failure.code)?'입력·근거 확인 필요':'요청 결과를 확인해 주세요'}</h2><p>{failure.message}</p><p>{failure.settlement}</p>{failure.code==='EVIDENCE_CHANGED'&&<p>이전 Story를 새 Story에 자동 연결하지 않습니다. 새 검색과 근거 검토가 필요합니다.</p>}{failure.code==='LOGIN_REQUIRED'&&<a href="/api/auth/google/start">Google 로그인</a>}{failure.code==='INSUFFICIENT_BALANCE'&&<p>현재 Account Credit으로는 이 생성을 요청할 수 없습니다.</p>}{uncertain&&<p>정산 확인 전 추가 유료 요청을 차단했습니다. 같은 요청을 자동으로 다시 보내지 않습니다. 화면을 새로 열어 반복하지 말고 관리자에게 정산 확인을 요청해 주세요.</p>}</div>}
    </div>
      <form className={styles.searchForm} onSubmit={event=>void session.search(event,true)} aria-label="아카이브 검색">
        <label htmlFor="assistant-query">{mode==='qa'?'질문':'영상 주제'}</label>
        <textarea id="assistant-query" rows={2} maxLength={500} value={query} disabled={locked} onChange={event=>session.changeQuery(event.target.value)} placeholder={mode==='qa'?'최근 스타파이터 소식 알려줘':'어떤 소식을 영상으로 소개할까요?'} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();if(!locked)event.currentTarget.form?.requestSubmit();}}} required/>
        <details className={styles.composerOptions}><summary>검색·근거 설정 및 안내</summary>
        <AssistantFilters {...choices} filters={filters} disabled={locked} onChange={patch=>session.changeFilters(patch)}/>
        {mode==='script'&&<details className={styles.advanced}><summary>구성 방향 요청 (선택)</summary><textarea aria-label="구성 방향 요청" rows={2} maxLength={1000} disabled={locked} value={instructions} onChange={event=>session.setInstructions(event.target.value)} placeholder="예: 핵심 소식을 먼저 소개하고 주의할 점으로 연결"/></details>}
        <button className={styles.textButton} type="button" disabled={busy||uncertain||!account||!query.trim()||!searchRecovery&&credit.balance<1} onClick={()=>void session.search({preventDefault(){}},false)}>{searchRecovery?'동일 요청으로 검색 결과 복구':'근거를 먼저 선택 · 검색 1 CR'}</button>
        <details className={styles.advanced}><summary>정보 전송 및 정산 안내</summary><p className={styles.muted}>질문과 선택한 공개 기사 제목·요약이 AI 제공자에게 전송됩니다. 개인정보·비밀정보를 입력하지 마세요. 생성 결과는 서버에 보관하지 않습니다. 검색 복구용 결과는 최대 10분 보관하며 제공자 측 보존 정책은 별개입니다. 응답 유실 시 자동 재시도하지 않습니다.</p></details>
        </details>
        <div className={styles.composerFooter}><span className={styles.balance}>{account?`Account ${credit.balance} CR`:'Account 로그인 필요'}</span>
          <button className={styles.primaryButton} type="submit" disabled={locked||searchRecovery||!account||price===null||!query.trim()||credit.balance<price+1}>{busy?(stage==='searching'?'근거 찾는 중…':'답변 만드는 중…'):price===null?'가격 확인 중…':`${mode==='qa'?'질문하기':'구성 만들기'} · 최대 ${price+1} CR`}</button></div>
        <p className={styles.muted}>검색 1 CR + {mode==='qa'?'Q&A':'플래너'} {price??'확인 중'} CR. · 결과 없음 0 CR.</p>
      </form>
  </div>;
}
