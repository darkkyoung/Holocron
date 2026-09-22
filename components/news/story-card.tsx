'use client';

import { useId, useRef, useState, type CSSProperties } from 'react';
import { ArrowUpRight, Layers3 } from 'lucide-react';
import type { Article } from '@/lib/news';
import type { Story } from '@/lib/news/stories';
import styles from './story-card.module.css';

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function ArticleCard({ article, eager, count, inactive = false }: { article: Article; eager: boolean; count?: number; inactive?: boolean }) {
  return <a className={styles.card} href={article.url} target="_blank" rel="noopener noreferrer" inert={inactive}>
    <div className={styles.image}>
      {/* Remote publisher images have no fixed host list; preserve the source URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {article.image ? <img src={article.image} alt="" loading={eager ? 'eager' : 'lazy'} referrerPolicy="no-referrer" /> : <span className="no-image">HOLOCRON ARCHIVE</span>}
      <span className="category">{article.category}</span>
      {article.id === 'swnn-costume' && <span className="related-image">관련 이미지 · StarWars.com</span>}
      {count && count > 1 ? <span className="group-count"><Layers3 size={13} /> {count}</span> : null}
    </div>
    <div className="card-body">
      <div className="meta"><span>{article.source === 'StarWars.com' ? '공식' : '뉴스'}</span><time dateTime={article.published}>{article.published.slice(0, 10).replaceAll('-', '. ')}</time></div>
      <h3>{article.title}</h3><p className="summary">{article.summary}</p>
      <div className={styles.source}><span><strong>{article.source}</strong><small>{hostname(article.url)}</small></span><ArrowUpRight size={15} aria-hidden="true" /></div>
    </div>
  </a>;
}

export default function StoryCard({ story, eager = false, align }: { story: Story; eager?: boolean; align?: 'left'|'right' }) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLElement>(null);
  const regionId = useId();
  const [representative, ...related] = story.articles;
  const canHover = () => matchMedia('(min-width: 821px) and (hover: hover) and (pointer: fine)').matches;
  function close(returnFocus = false) {
    setExpanded(false);
    setActive(0);
    if (returnFocus) trigger.current?.focus();
  }

  return <article ref={root} className={styles.story} data-align={align} data-expanded={expanded} data-stacked={related.length > 0}
    style={{ '--related-count': related.length } as CSSProperties}
    onPointerLeave={event => {
      if (event.pointerType === 'mouse' && canHover() && !root.current?.contains(document.activeElement)) close();
    }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close(); }}
    onKeyDown={event => { if (event.key === 'Escape' && expanded) { event.preventDefault(); close(true); } }}>
    {related.length > 0 && <button ref={trigger} type="button" className={styles.toggle} aria-expanded={expanded} aria-controls={regionId}
      onClick={() => expanded ? close() : setExpanded(true)}><Layers3 size={15} aria-hidden="true" />{expanded ? '출처 접기' : `${story.articles.length}개 출처 펼치기`}</button>}
    {story.orderUncertain && <p className={styles.dateNote}>같은 날짜의 보도 · 정확한 게시 순서 미확인</p>}
    {expanded && related.length > 1 && <div className={styles.sourcePicker} role="group" aria-label="펼친 카드 선택">
      {story.articles.map((article, index) => <button key={article.id} type="button" aria-pressed={active === index}
        onClick={() => setActive(index)}>{article.source}</button>)}
    </div>}
    <div id={regionId} className={styles.stack}>
      <div className={styles.layer} data-front="true" data-active={active === 0} style={{ '--index': 0 } as CSSProperties}
        onPointerEnter={event => { if (event.pointerType === 'mouse' && canHover()) setActive(0); }} onFocus={() => setActive(0)}>
        <ArticleCard article={representative} eager={eager} count={story.articles.length} />
      </div>
      {related.map((source, index) => <div key={source.id} className={styles.layer} data-front="false" data-active={active === index + 1}
        style={{ '--index': index + 1 } as CSSProperties} onFocus={() => setActive(index + 1)}>
        <div className={styles.articleContent} onPointerEnter={event => { if (expanded && event.pointerType === 'mouse' && canHover()) setActive(index + 1); }}>
          <ArticleCard article={source} eager={false} inactive={!expanded} />
        </div>
        <button type="button" className={styles.edge} aria-expanded={expanded} aria-controls={regionId}
          aria-label={`${source.source} 관련 기사 펼치기`}
          onPointerEnter={event => { if (event.pointerType === 'mouse' && canHover()) { setExpanded(true); setActive(index + 1); } }}
          onClick={() => {
            // On narrow screens the edge disappears after expansion. Move focus
            // to a persistent control first so blur does not immediately collapse it.
            if (!canHover()) trigger.current?.focus({ preventScroll: true });
            setExpanded(true);
            setActive(index + 1);
          }}><span>{source.source}</span></button>
      </div>)}
    </div>
  </article>;
}
