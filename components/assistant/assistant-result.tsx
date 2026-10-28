import type {GenerationView} from './contracts';
import {displayUrl} from './api-client';
import styles from './assistant-workspace.module.css';

type AnswerResult=Extract<GenerationView['result'],{answer:unknown}>;
const isAnswer=(value:GenerationView['result']):value is AnswerResult=>typeof value.answer==='string';
const scope='최근 90일 공개 HOLOCRON 뉴스 제목·요약을 참고했습니다. 기사 원문·인터넷 전체 또는 모든 문장을 독립 검증한 결과는 아닙니다.';
function References({ids,evidence}:{ids:string[];evidence:GenerationView['evidence']}){
  return <span className={styles.references}>{ids.map(id=>{const source=evidence.find(item=>item.evidenceId===id);return source?<a key={id} href={`#assistant-citation-${source.citation}`} aria-label={`참고 기사 ${source.citation}: ${source.source.label}, ${source.title}`}>[{source.citation}]</a>:null;})}</span>;
}
export function copyText(view:GenerationView,section:'answer'|'planner'='answer'){
  const r=view.result;
  const blocks=isAnswer(r)?[r.answer]:[...r.titles,r.direction,'추천 뉴스',...r.recommendations.flatMap(item=>[view.evidence.find(a=>a.evidenceId===item.evidenceId)?.title??'',item.reason,...item.keyPoints]),'구간별 상세 구성안',...r.sections.flatMap((item,i)=>[`${i+1}. ${item.heading}`,item.purpose,...item.points,`연결 방향: ${item.transition}`]),...r.caveats.map(c=>c.text)];
  const citations=view.evidence.map(item=>{const url=displayUrl(item.url);return `[${item.citation}] ${item.title} — ${item.source.label} (${item.published.slice(0,10)})${url?` ${url}`:''}`;});
  // section is only a copy label; every copy includes its server-owned references.
  return [section==='planner'?'영상 구성안 플래너':'뉴스 Q&A',...blocks,...r.limitations,'',...citations,'',scope].join('\n');
}
export default function AssistantResult({view,stale,inputChanged=false,onMessage}:{view:GenerationView;stale:boolean;inputChanged?:boolean;onMessage:(message:string)=>void}){
  const r=view.result;
  const copy=()=>{if(!navigator.clipboard?.writeText){onMessage('이 환경에서는 자동 복사를 사용할 수 없습니다. 결과 텍스트를 선택해 복사해 주세요.');return;}void navigator.clipboard.writeText(copyText(view,isAnswer(r)?'answer':'planner')).then(()=>onMessage('결과를 참고 기사와 함께 복사했습니다.')).catch(()=>onMessage('복사할 수 없습니다. 브라우저 권한을 확인해 주세요.'));};
  return <section aria-labelledby="assistant-result-title" className={styles.result}>
    <h2 id="assistant-result-title">{view.mode==='qa'?'뉴스 Q&A':'영상 구성안 플래너'}</h2>
    {inputChanged&&<p className={styles.notice}>이전 요청의 결과입니다. 현재 입력 조건으로 생성된 결과가 아닙니다.</p>}
    {stale&&<p className={styles.notice}>이전 검색의 결과입니다. 새 생성에는 유효한 검색 근거가 필요합니다.</p>}
    {isAnswer(r)?<p className={styles.answerText}>{r.answer}</p>:<>
      {!!r.titles.length&&<section><h3>영상 제목 후보</h3><ul>{r.titles.map(t=><li key={t}>{t}</li>)}</ul></section>}
      <section><h3>영상의 핵심 방향</h3><p>{r.direction}</p><p className={styles.muted}>구성 제안입니다. 완성 내레이션이나 대본이 아닙니다.</p></section>
      {!!r.recommendations.length&&<section><h3>추천 뉴스</h3><ol className={styles.plannerCards}>{r.recommendations.map(item=>{const article=view.evidence.find(a=>a.evidenceId===item.evidenceId)!;const url=displayUrl(article.url);return <li key={item.evidenceId}><h4>{article.title}</h4><small>{article.source.label} · {article.published.slice(0,10)}</small><p>{item.reason}</p><ul>{item.keyPoints.map((p,i)=><li key={i}>{p}</li>)}</ul>{url&&<a href={url} target="_blank" rel="noopener noreferrer">원문 열기 ↗</a>}</li>;})}</ol></section>}
      {!!r.sections.length&&<section><h3>구간별 상세 구성안</h3><ol className={styles.plannerCards}>{r.sections.map((item,i)=><li key={i}><h4>{item.heading}</h4><p className={styles.muted}>{item.purpose}</p><ul>{item.points.map((p,j)=><li key={j}>{p}</li>)}</ul><p>활용할 기사 <References ids={item.evidenceIds} evidence={view.evidence}/></p><p className={styles.transition}>연결 방향 · {item.transition}</p></li>)}</ol></section>}
    </>}
    <section><h3>참고 기사</h3>{!view.evidence.length&&<p>답변에 연결할 수 있는 기사가 없습니다.</p>}<ol className={styles.citations}>{view.evidence.map(item=>{const url=displayUrl(item.url);return <li key={item.evidenceId} id={`assistant-citation-${item.citation}`}><span>{url?<a href={url} target="_blank" rel="noopener noreferrer">[{item.citation}] {item.title} ↗</a>:item.title} · {item.source.label}</span></li>;})}</ol></section>
    {!!r.limitations.length&&<section><h3>{view.status==='insufficient_evidence'?'더 필요한 정보':'주의할 점'}</h3><ul>{r.limitations.map((t,i)=><li key={i}>{t}</li>)}</ul></section>}
    <button className={styles.secondary} type="button" onClick={copy}>결과와 참고 기사 복사</button>
    <details><summary>자료 범위와 주의사항</summary><p className={styles.meta}>자료 기준 {view.asOf} · {view.archiveWindow.from} – {view.archiveWindow.to}</p><ul>{view.warnings.map((text,i)=><li key={i}>{text}</li>)}{!isAnswer(r)&&r.caveats.map((c,i)=><li key={`c-${i}`}>{c.text}</li>)}</ul></details>
  </section>;
}
