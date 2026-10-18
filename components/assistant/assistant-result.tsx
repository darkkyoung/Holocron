import type {GenerationView} from './contracts';
import {displayUrl} from './api-client';
import styles from './assistant-workspace.module.css';

type Fact={text:string;evidenceIds:string[];certainty:string};
type AnswerResult=Extract<GenerationView['result'],{answer:unknown}>;
const isAnswer=(value:GenerationView['result']):value is AnswerResult=>Array.isArray(value.answer);
const certaintyLabels:Record<string,string>={explicit_announcement:'명시적 공식 발표',attributed_report:'출처가 있는 보도',explicit_speculation:'추측·논의',unclear:'확실성 불명'};
const scope='최근 90일 공개 HOLOCRON 뉴스 제목·요약만 근거로 사용했습니다. 기사 원문 전체와 인터넷 전체는 검색하지 않았습니다.';

function References({ids,evidence}:{ids:string[];evidence:GenerationView['evidence']}){
  return <span className={styles.references}>{ids.map(id=>{const source=evidence.find(item=>item.evidenceId===id);return source?<a key={id} href={`#assistant-citation-${source.citation}`} aria-label={`근거 ${source.citation}: ${source.source.label}, ${source.title}, ${source.published.slice(0,10)}`}>[{source.citation}]</a>:<span key={id}>[근거 확인 불가]</span>;})}</span>;
}
function FactBlock({fact,evidence}:{fact:Fact;evidence:GenerationView['evidence']}){
  return <li className={styles.fact}><p>{fact.text} <References ids={fact.evidenceIds} evidence={evidence}/></p><small>{certaintyLabels[fact.certainty]??certaintyLabels.unclear}</small></li>;
}
function referencesFor(view:GenerationView,section:'answer'|'facts'|'outline'){
  const value=view.result;
  if(isAnswer(value))return section==='answer'?value.answer.flatMap(fact=>fact.evidenceIds):[];
  if(section==='facts')return value.facts.flatMap(fact=>fact.evidenceIds);
  const facts=new Map(value.facts.map(fact=>[fact.factId,fact]));
  if(section==='outline')return value.outline.flatMap(item=>item.factIds.flatMap(id=>facts.get(id)?.evidenceIds??[]));
  return [];
}
export function copyText(view:GenerationView,section:'answer'|'facts'|'outline'){
  const result=view.result;
  const blocks=isAnswer(result)?section==='answer'?result.answer.map(fact=>`${fact.text} (${certaintyLabels[fact.certainty]??certaintyLabels.unclear})`):[]:
    section==='facts'?result.facts.map(fact=>`${fact.text} (${certaintyLabels[fact.certainty]??certaintyLabels.unclear})`):
    section==='outline'?result.outline.map((item,index)=>`${index+1}. ${item.heading}${item.creativeNote?` — 창작 제안: ${item.creativeNote}`:''}\n${item.factIds.map(id=>result.facts.find(fact=>fact.factId===id)).filter(fact=>fact!==undefined).map(fact=>`- ${fact.text} (${certaintyLabels[fact.certainty]??certaintyLabels.unclear})`).join('\n')}`):
    [];
  const ids=new Set(referencesFor(view,section));
  const citations=view.evidence.filter(item=>ids.has(item.evidenceId)).map(item=>{
    const url=displayUrl(item.url);return `[${item.citation}] ${item.title} — ${item.source.label} (${item.published.slice(0,10)})${url?` ${url}`:''}`;
  });
  return [...blocks,'',...citations,'',scope].join('\n');
}
function CopyButton({view,section,label,onMessage}:{view:GenerationView;section:'answer'|'facts'|'outline';label:string;onMessage:(message:string)=>void}){
  return <button className={styles.secondary} type="button" onClick={()=>{void navigator.clipboard.writeText(copyText(view,section)).then(()=>onMessage(`${label}을 출처와 함께 복사했습니다.`)).catch(()=>onMessage('복사할 수 없습니다. 브라우저 권한을 확인해 주세요.'));}}>{label}과 출처 복사</button>;
}
export default function AssistantResult({view,stale,inputChanged=false,onMessage}:{view:GenerationView;stale:boolean;inputChanged?:boolean;onMessage:(message:string)=>void}){
  const result=view.result;
  const canCopy=!stale&&!inputChanged;
  return <section aria-labelledby="assistant-result-title" className={styles.result}>
    <h2 id="assistant-result-title">{view.mode==='qa'?'아카이브 답변':'영상 구성 가이드'}</h2>
    {inputChanged&&<p role="status" className={styles.notice}>이전 요청의 결과입니다. 현재 입력 조건으로 생성된 결과가 아닙니다. 새 조건으로 생성하려면 비용을 확인하고 다시 명시적으로 요청해 주세요.</p>}
    {stale&&<p role="status" className={styles.notice}>탭이 비활성화된 동안 아카이브가 바뀌었을 수 있습니다. 이전 결과이며 현재 근거로 다시 검증되지 않았습니다. 새 검색 후 선택을 검토해 주세요.</p>}
    <p className={styles.meta}>근거 확인 시각 {view.asOf} · 기간 {view.archiveWindow.from} – {view.archiveWindow.to}</p>
    {isAnswer(result)?<section><h3>답변</h3><ol>{result.answer.map((fact,index)=><FactBlock key={index} fact={fact} evidence={view.evidence}/>)}</ol>{canCopy&&result.answer.length>0&&<CopyButton view={view} section="answer" label="답변" onMessage={onMessage}/>}<h3>한계</h3><ul>{result.limitations.map((text,index)=><li key={index}>{text}</li>)}</ul></section>:
      <><section><h3>근거가 있는 핵심 사실</h3><ol>{result.facts.map(fact=><FactBlock key={fact.factId} fact={fact} evidence={view.evidence}/>)}</ol>{canCopy&&result.facts.length>0&&<CopyButton view={view} section="facts" label="사실" onMessage={onMessage}/>}</section>
        <section><h3>보도 간 차이 / 주의할 점</h3>{result.caveats.length?<ul>{result.caveats.map((item,index)=><li key={index}>{item.text} <References ids={item.evidenceIds} evidence={view.evidence}/></li>)}</ul>:<p>별도의 주의 사항이 표시되지 않았습니다. 독립 검증을 뜻하지는 않습니다.</p>}</section>
        <section><h3>영상 구간별 구성 방향</h3><ol>{result.outline.map((item,index)=><li key={index}><strong>{item.heading}</strong> {item.creativeNote&&<span>창작 제안: {item.creativeNote}</span>}<ul>{item.factIds.map(id=>{const fact=result.facts.find(value=>value.factId===id);return fact?<FactBlock key={id} fact={fact} evidence={view.evidence}/>:null;})}</ul></li>)}</ol>{canCopy&&result.outline.length>0&&<CopyButton view={view} section="outline" label="구성안" onMessage={onMessage}/>}</section>
        </>}
    <section><h3>사용한 소식</h3><ul>{view.usedStories.map(item=><li key={item.storyId}>Story {item.storyId} · {item.omittedArticleCount}개 기사 미포함{item.orderUncertain?' · 순서 불확실':''}</li>)}</ul>
      <h3>인용 출처</h3><ol className={styles.citations}>{view.evidence.map(item=>{const url=displayUrl(item.url);return <li key={item.evidenceId} id={`assistant-citation-${item.citation}`}><strong>[{item.citation}] {item.title}</strong><span>{item.source.label} · {item.source.displayClass} · {item.published.slice(0,10)}</span>{url?<a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${item.source.label}의 ${item.title}, ${item.published.slice(0,10)} 원문 열기`}>원문 열기 ↗</a>:<span>안전한 원문 링크 없음</span>}</li>;})}</ol>
      {view.relatedStories.length>0&&<><h3>선택했으나 인용되지 않은 소식</h3><ul>{view.relatedStories.map(item=><li key={item.storyId}>Story {item.storyId} (인용 근거가 아닙니다)</li>)}</ul></>}</section>
    <ul className={styles.warnings}>{view.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul>
  </section>;
}
