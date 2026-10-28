'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import {CREDIT_CHANGED,initializeGuestCredits} from '@/components/credit/client';
import type {GuestCreditState} from '@/lib/credit/rewards/policy';
import type {AssistantMode,FilterDraft,GenerationView,RetrievalView} from './contracts';
import {emptyFilters,generationCost,retrievalFilters} from './contracts';
import {generateSelection,retrieveCandidates,settlementText,WorkspaceRequestError} from './api-client';
import {searchSnapshot,receiptExpired} from './receipt-state';

type Stage='idle'|'searching'|'results'|'generating'|'completed'|'error';
type Failure={code:string;message:string;settlement?:string};

export function useAssistantSession(active=true){
  const [mode,setMode]=useState<AssistantMode>('qa'),[query,setQuery]=useState(''),[filters,setFilters]=useState<FilterDraft>(emptyFilters);
  const [instructions,setInstructions]=useState('');
  const [retrieval,setRetrieval]=useState<RetrievalView|null>(null),[selected,setSelected]=useState<string[]>([]),[expiresAt,setExpiresAt]=useState(0);
  const [result,setResult]=useState<GenerationView|null>(null),[stage,setStage]=useState<Stage>('idle'),[stale,setStale]=useState(false),[dirty,setDirty]=useState(false);
  const [failure,setFailure]=useState<Failure|null>(null),[notice,setNotice]=useState(''),[credit,setCredit]=useState<GuestCreditState|null>(null);
  const [resultInput,setResultInput]=useState<string|null>(null);
  const searchRetry=useRef<{id:string;digest:string;at:number}|null>(null);
  const controller=useRef<AbortController|null>(null),resultHeading=useRef<HTMLHeadingElement>(null),errorHeading=useRef<HTMLHeadingElement>(null),searchHeading=useRef<HTMLHeadingElement>(null);
  const busy=stage==='searching'||stage==='generating',max=mode==='qa'?6:8;
  const snapshot=useRef<string|null>(null),submittedQuery=useRef('');
  const needsSearch=dirty||stale;
  const inFlight=useRef(false),activeNow=useRef(active);
  useEffect(()=>{activeNow.current=active;},[active]);
  const [uncertain,setUncertain]=useState(false),[searchRecovery,setSearchRecovery]=useState(false),[expiryReached,setExpiryReached]=useState(false);
  const [additionalConsent,setAdditionalConsent]=useState<{signature:string;price:number;policy:number}|null>(null);
  const attemptedGeneration=useRef(false),consent=useRef<typeof additionalConsent>(null);
  const inputSignature=JSON.stringify([mode,query,filters,instructions]);
  const generationSignature=JSON.stringify([inputSignature,retrieval?.receipt,selected]);
  const inputChanged=Boolean(result&&resultInput!==inputSignature);

  // The external dialog closing revokes an unspent payment confirmation.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(()=>{if(!active){consent.current=null;setAdditionalConsent(null);}},[active]);
  useEffect(()=>{
    let mounted=true;
    const changed=(event:Event)=>{if(mounted){const next=(event as CustomEvent<GuestCreditState|null>).detail;setCredit(next);if(next?.ownerType!=='account'){setRetrieval(null);setSelected([]);setResult(null);setStale(true);}}};
    window.addEventListener(CREDIT_CHANGED,changed);
    void initializeGuestCredits().then(value=>{if(mounted){setCredit(value);
    try{const saved=JSON.parse(sessionStorage.getItem('holocron-search-retry')??'null');if(saved&&typeof saved.id==='string'&&typeof saved.digest==='string'&&Number.isSafeInteger(saved.at)){searchRetry.current=saved;setSearchRecovery(true);setNotice('이전 검색이 미확인 상태입니다. 원래 질문과 상세 조건으로 같은 요청을 복구해 주세요.');}}catch{/* Storage unavailable: use the current in-memory request. */}
    }}).catch(()=>{if(mounted)setCredit(null);});
    return()=>{mounted=false;controller.current?.abort();window.removeEventListener(CREDIT_CHANGED,changed);};
  },[]);
  useEffect(()=>{
    if(!expiresAt)return;
    const check=()=>{if(receiptExpired(expiresAt)){setStale(true);setExpiryReached(true);}};
    const timer=setTimeout(check,Math.max(0,expiresAt-Date.now()));
    document.addEventListener('visibilitychange',check);
    return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',check);};
  },[expiresAt]);
  useEffect(()=>{if(!active)return;if(failure)errorHeading.current?.focus();else if(stage==='completed')resultHeading.current?.focus();else if(stage==='results')searchHeading.current?.focus();},[active,failure,stage]);

  function changeMode(next:AssistantMode){
    if(inFlight.current||uncertain||next===mode)return;
    cancelAdditionalConsent();submittedQuery.current='';setMode(next);setQuery('');setFilters(emptyFilters());setInstructions('');setRetrieval(null);setSelected([]);setResult(null);setFailure(null);setNotice('');setStage('idle');setDirty(false);setStale(false);setExpiresAt(0);snapshot.current=null;
  }
  function changeFilters(patch:Partial<FilterDraft>){setFilters(previous=>({...previous,...patch}));setDirty(snapshot.current!==searchSnapshot(mode,query,{...filters,...patch}));}
  async function search(event:Pick<FormEvent<HTMLFormElement>,'preventDefault'>,continueToGeneration=false){
    event.preventDefault();if(inFlight.current||uncertain||credit?.ownerType!=='account'||!credit.policy)return;
    const quotedPolicy=credit.policy.version,quotedCost=generationCost(mode,credit.policy)!;
    if(!searchRecovery&&!searchRetry.current&&credit.balance<(continueToGeneration?1+quotedCost:1)){setNotice('Account Credit 잔액이 부족합니다.');return;}
    cancelAdditionalConsent();inFlight.current=true;let recovering=searchRecovery;
    const active=new AbortController();controller.current=active;
    submittedQuery.current=query;setResult(null);setStage('searching');setFailure(null);setNotice('공개 아카이브에서 소식을 찾고 있습니다.');setStale(true);
    try{
      const signature={mode,query,filters};
      const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(signature)))),b=>b.toString(16).padStart(2,'0')).join('');
      // This async function is invoked only by an explicit submit/click, never during render.
      let id=searchRetry.current?.digest===digest?searchRetry.current.id:crypto.randomUUID(),at=searchRetry.current?.digest===digest?searchRetry.current.at:Date.now();
      let saved:null|{id:string;digest:string;at:number}=searchRetry.current;
      try{saved=JSON.parse(sessionStorage.getItem('holocron-search-retry')??'null')??saved;}catch{/* Memory fallback. */}
      if(saved&&saved.digest!==digest)throw new WorkspaceRequestError('RECOVERY_REQUIRED','이전 검색의 정산 확인이 필요합니다. 원래 질문과 조건으로 결과를 복구해 주세요.');
      if(saved?.digest===digest&&typeof saved.id==='string'&&Number.isSafeInteger(saved.at)){id=saved.id;at=saved.at;recovering=true;}
      try{sessionStorage.setItem('holocron-search-retry',JSON.stringify({id,digest,at}));}catch{/* Memory fallback preserves request identity. */}
      searchRetry.current={id,digest,at};
      const payload={mode,query,filters:retrievalFilters(filters,at)};
      const response=await retrieveCandidates({...payload,requestId:id},active.signal);
      searchRetry.current=null;try{sessionStorage.removeItem('holocron-search-retry');}catch{}
      const refreshed=await initializeGuestCredits(true).catch(()=>null);if(refreshed){setCredit(refreshed);}
      setSearchRecovery(false);
      const chosen=(response.proposedStoryIds.length?response.proposedStoryIds:response.candidates.map(c=>c.storyId)).filter(id=>response.candidates.some(c=>c.storyId===id)).slice(0,3);
      setRetrieval(response);setSelected(chosen);setResult(null);setStale(response.status==='ready'&&receiptExpired(response.resultExpiresAt??0));setExpiryReached(response.status==='ready'&&receiptExpired(response.resultExpiresAt??0));setDirty(false);setExpiresAt(response.status==='ready'?(response.resultExpiresAt??0):0);snapshot.current=searchSnapshot(mode,query,filters);setStage('results');
      setNotice(response.status==='clarification'?'작품이나 검색어를 더 구체적으로 선택해 주세요. 검색 비용은 차감되지 않았습니다.':response.status==='insufficient_evidence'?'해당 근거가 없습니다. 검색 비용은 차감되지 않았습니다.':`${response.candidates.length}개 소식을 찾았습니다. 검색 ${response.credit?.charged===1?'1 CR 사용 완료':'정산 확인 필요'}. 생성은 추가 요금입니다.`);
      if(continueToGeneration&&!recovering&&activeNow.current&&refreshed?.ownerType==='account'&&refreshed.policy?.version===quotedPolicy&&generationCost(mode,refreshed.policy)===quotedCost&&refreshed.balance>=quotedCost&&response.status==='ready'&&response.receipt&&response.credit?.charged===1&&!receiptExpired(response.resultExpiresAt??0)&&chosen.length){
        await requestGeneration(response,chosen,quotedPolicy);
      }
    }catch(reason){setNotice('검색 요청이 완료되지 않았습니다. 아래 정산 안내를 확인해 주세요.');if(active.signal.aborted)return;const error=reason as WorkspaceRequestError;if(['LOGIN_REQUIRED','INVALID_REQUEST','FORBIDDEN','INSUFFICIENT_BALANCE','ADMISSION_LIMIT','ARCHIVE_UNAVAILABLE','ARCHIVE_CAPACITY','EVIDENCE_TOO_LARGE'].includes(error.code)){searchRetry.current=null;try{sessionStorage.removeItem('holocron-search-retry');}catch{}}setSearchRecovery(!['LOGIN_REQUIRED','INVALID_REQUEST','FORBIDDEN','INSUFFICIENT_BALANCE','ADMISSION_LIMIT','ARCHIVE_UNAVAILABLE','ARCHIVE_CAPACITY','EVIDENCE_TOO_LARGE'].includes(error.code));setFailure({settlement:['LOGIN_REQUIRED','INVALID_REQUEST','FORBIDDEN','INSUFFICIENT_BALANCE','ADMISSION_LIMIT','ARCHIVE_UNAVAILABLE','ARCHIVE_CAPACITY','EVIDENCE_TOO_LARGE'].includes(error.code)?'이 검색 요청에서는 Credit이 차감되지 않았습니다.':'차감 여부를 단정할 수 없습니다. 같은 검색을 다시 눌러 같은 요청 ID의 결과를 확인해 주세요. 복구 가능 시간은 원래 요청 후 10분입니다.',code:error.code??'UNKNOWN',message:error instanceof WorkspaceRequestError?error.message:'응답을 확인하지 못했습니다. 같은 검색을 다시 누르면 같은 요청 ID로 복구합니다. 새로운 검색을 실행하지 마세요.'});setStage('error');}
    finally{inFlight.current=false;if(controller.current===active)controller.current=null;}
  }
  function generationReady(){
    if(inFlight.current||uncertain||searchRecovery||!activeNow.current||!retrieval||retrieval.status!=='ready'||!retrieval.receipt||!selected.length||needsSearch||credit?.ownerType!=='account'||!credit.policy)return false;
    if(receiptExpired(expiresAt)){setStale(true);setExpiryReached(true);return false;}
    const price=generationCost(mode,credit.policy);
    if(price===null||credit.balance<price){setNotice('Account Credit 잔액이 부족합니다.');return false;}
    return true;
  }
  async function generate(){
    if(!generationReady())return;
    if(attemptedGeneration.current){
      const quote={signature:generationSignature,price:generationCost(mode,credit!.policy)!,policy:credit!.policy!.version};
      consent.current=quote;setAdditionalConsent(quote);return;
    }
    inFlight.current=true;try{await requestGeneration(retrieval!,selected,credit!.policy!.version);}finally{inFlight.current=false;}
  }
  function cancelAdditionalConsent(){consent.current=null;setAdditionalConsent(null);}
  async function confirmAdditionalGeneration(){
    const quote=consent.current;
    if(!quote||!generationReady())return;
    cancelAdditionalConsent();
    if(quote.signature!==generationSignature||quote.policy!==credit!.policy!.version||quote.price!==generationCost(mode,credit!.policy)){
      setNotice('입력·근거 또는 가격이 변경됐습니다. 추가 생성 비용을 다시 확인해 주세요.');return;
    }
    inFlight.current=true;try{await requestGeneration(retrieval!,selected,quote.policy);}finally{inFlight.current=false;}
  }
  async function requestGeneration(evidence:RetrievalView,ids:string[],policyVersion:number){
    // Consume this explicit intent before dispatch. Settled failure never rearms it.
    attemptedGeneration.current=true;cancelAdditionalConsent();
    const active=new AbortController();controller.current=active;
    setStage('generating');setFailure(null);setNotice('선택한 기사를 참고해 결과를 만들고 있습니다.');setResult(null);
    const requestId=crypto.randomUUID();
    try{
      const response=await generateSelection({requestId,mode,receipt:evidence.receipt!,selectedStoryIds:ids,instructions:mode==='qa'?'':instructions,includeDraft:false,policyVersion},active.signal);
      setResult(response);setResultInput(inputSignature);setStage('completed');setNotice(response.status==='ok'?'결과가 도착했습니다. 참고 기사와 사용 내역을 확인해 주세요.':'선택한 근거로는 답을 만들 수 없습니다. 실제 환불 정산을 확인해 주세요.');
      void initializeGuestCredits(true).catch(()=>setNotice('결과는 도착했지만 현재 Credit 잔액은 다시 확인해 주세요.'));
    }catch(reason){
      setNotice('생성 요청이 종료됐습니다. 아래 결과·정산 안내를 확인해 주세요.');
      if(active.signal.aborted){setUncertain(true);setStage('error');setFailure({code:'CANCELLED_UNKNOWN',message:'요청을 중단했습니다. 브라우저에서 실제 차감 또는 환불 여부를 확인할 수 없습니다. 자동 재요청하지 마세요.',settlement:settlementText(undefined)});return;}
      const error=reason as WorkspaceRequestError;
      if(!(error instanceof WorkspaceRequestError)||!error.credit||error.credit.settlement==='failed'&&!error.credit.refund||['unknown','refund_pending'].includes(error.credit.settlement??'')||['REQUEST_IN_PROGRESS','RESULT_NOT_RETAINED'].includes(error.code))setUncertain(true);
      if(error instanceof WorkspaceRequestError&&['PRICE_CHANGED','EVIDENCE_CHANGED','LOGIN_REQUIRED','INSUFFICIENT_BALANCE','ADMISSION_LIMIT','MONTHLY_BUDGET_EXCEEDED'].includes(error.code)&&!error.credit)setUncertain(false);
      setFailure({code:error.code??'UNKNOWN',message:error instanceof WorkspaceRequestError?error.message:'응답이 끊겼습니다. 차감·정산 여부를 확인할 수 없습니다. 자동 재요청하지 마세요.',settlement:error instanceof WorkspaceRequestError&&['PRICE_CHANGED','MONTHLY_BUDGET_EXCEEDED'].includes(error.code)?'새 요청은 접수되지 않았으며 Credit은 차감되지 않았습니다.':settlementText(error instanceof WorkspaceRequestError?error.credit:undefined)});
      if(error instanceof WorkspaceRequestError&&error.code==='EVIDENCE_CHANGED')setStale(true);
      if(error instanceof WorkspaceRequestError&&error.code==='PRICE_CHANGED'){setCredit(null);void initializeGuestCredits(true).then(setCredit).catch(()=>setNotice('가격을 확인하지 못했습니다. 상태를 다시 확인해 주세요.'));}
      setStage('error');
      if(error instanceof WorkspaceRequestError&&error.credit)void initializeGuestCredits(true).catch(()=>{});
    }finally{if(controller.current===active)controller.current=null;}
  }
  function cancel(){controller.current?.abort();setNotice('취소를 요청했습니다. 제공자 비용과 Credit 정산 여부는 아직 확인되지 않았습니다.');}
  function toggle(storyId:string){
    if(inFlight.current)return;
    setSelected(current=>current.includes(storyId)?current.filter(id=>id!==storyId):current.length<max?[...current,storyId]:current);
    setResult(null);setStage('results');
  }
  const price=generationCost(mode,credit?.policy);
  return {submittedQuery:submittedQuery.current,additionalConsent,needsAdditionalConsent:attemptedGeneration.current,confirmAdditionalGeneration,cancelAdditionalConsent,expiryReached,uncertain,searchRecovery,mode,query,filters,instructions,retrieval,selected,expiresAt,result,stage,stale,dirty,failure,notice,credit,busy,needsSearch,inputChanged,price,resultHeading,errorHeading,searchHeading,changeMode,changeFilters,search,generate,cancel,toggle,setInstructions,setNotice,changeQuery:(value:string)=>{setQuery(value);setDirty(snapshot.current!==searchSnapshot(mode,value,filters));}};
}
