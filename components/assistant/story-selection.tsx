import type {Candidate,AssistantMode} from './contracts';
import {displayUrl} from './api-client';
import styles from './assistant-workspace.module.css';

export function EvidenceRows({candidate}:{candidate:Candidate}){
  return <div className={styles.evidenceRows}>
    {candidate.evidence.map(article=>{const url=displayUrl(article.url);return <article className={styles.evidenceRow} key={article.articleId}>
      <strong>{article.title}</strong><p>{article.summary}</p>
      <p className={styles.meta}>{article.source.label} · {article.source.displayClass} · {article.published.slice(0,10)} · {article.category}{article.orderUncertain?' · 기사 순서 불확실':''}{article.truncated.title||article.truncated.summary?' · 오래된 요약 일부 생략':''}</p>
      {url?<a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${article.source.label}의 ${article.title}, ${article.published.slice(0,10)} 원문 열기`}>출처에서 읽기 ↗</a>:<span className={styles.muted}>안전한 원문 링크 없음</span>}
    </article>;})}
    {candidate.omittedArticleCount>0&&<p className={styles.muted}>같은 소식의 기사 {candidate.omittedArticleCount}개는 생성 근거 묶음에서 제외됩니다.</p>}
  </div>;
}

export default function StorySelection({candidates,selected,mode,onToggle,disabled}:{candidates:Candidate[];selected:string[];mode:AssistantMode;onToggle:(storyId:string)=>void;disabled:boolean}){
  const max=mode==='qa'?6:8;
  return <section aria-labelledby="assistant-candidates-title"><h2 id="assistant-candidates-title">검색된 소식 <small>{candidates.length}개 · 최대 {max}개 선택</small></h2>
    <p className={styles.muted}>소식을 선택한 뒤 각 기사와 출처를 확인하세요. 여러 매체의 보도가 곧 독립 검증을 뜻하지는 않습니다.</p>
    <div className={styles.storyList}>{candidates.map((story,index)=>{
      const checked=selected.includes(story.storyId);
      return <article className={styles.story} key={story.storyId}>
        <label className={styles.storyLabel}><input type="checkbox" checked={checked} disabled={disabled||!checked&&selected.length>=max} onChange={()=>onToggle(story.storyId)}/><span><small>소식 {index+1} · {story.representative.published.slice(0,10)} · 출처 {story.sourceCount}곳</small><strong>{story.representative.title}</strong>
          {story.relatedWorks.length>0&&<small>관련 작품: {story.relatedWorks.map(work=>work.title).join(' · ')}</small>}
          {story.orderUncertain&&<small>날짜만 확인된 기사: 보도 순서 불확실</small>}
        </span></label>
        <details onKeyDown={event=>{if(event.key==='Escape'&&event.currentTarget.open){event.preventDefault();event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}>
          <summary>생성에 쓰일 기사 {story.evidence.length}개 보기 {story.omittedArticleCount>0?`· 그 외 ${story.omittedArticleCount}개 미포함`:''}</summary>
          <EvidenceRows candidate={story}/>
        </details>
      </article>;
    })}</div>
  </section>;
}

export function SelectedReview({candidates,selected}:{candidates:Candidate[];selected:string[]}){
  const chosen=candidates.filter(item=>selected.includes(item.storyId));
  return <section className={styles.review} aria-labelledby="assistant-review-title"><h2 id="assistant-review-title">선택한 근거 <small>{chosen.length}개 소식</small></h2>
    {!chosen.length?<p>생성할 소식을 선택해 주세요.</p>:chosen.map(story=><details key={story.storyId} onKeyDown={event=>{if(event.key==='Escape'&&event.currentTarget.open){event.currentTarget.open=false;event.currentTarget.querySelector('summary')?.focus();}}}>
      <summary>{story.representative.title} · 기사 {story.evidence.length}개{story.omittedArticleCount?` · ${story.omittedArticleCount}개 미포함`:''}</summary>
      <EvidenceRows candidate={story}/>
    </details>)}
  </section>;
}
