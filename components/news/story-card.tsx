'use client';

import { useState, type CSSProperties } from 'react';
import { ArrowUpRight, Layers3 } from 'lucide-react';
import type { Article } from '@/lib/news';
import type { Story } from '@/lib/news/stories';
import styles from './story-card.module.css';

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function ArticleCard({ article, eager, count }: { article: Article; eager: boolean; count?: number }) {
  return <a className={styles.card} href={article.url} target="_blank" rel="noopener noreferrer">
    <div className={styles.image}>
      {/* Remote publisher images have no fixed host list; preserve the source URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {article.image ? <img src={article.image} alt="" loading={eager ? 'eager' : 'lazy'} referrerPolicy="no-referrer" /> : <span className="no-image">HOLOCRON ARCHIVE</span>}
      <span className="category">{article.category}</span>
      {count && count > 1 ? <span className="group-count"><Layers3 size={13} /> {count}</span> : null}
    </div>
    <div className="card-body">
      <div className="meta"><span>{article.source === 'StarWars.com' ? '공식' : '뉴스'}</span><time dateTime={article.published}>{article.published.slice(0, 10).replaceAll('-', '. ')}</time></div>
      <h3>{article.title}</h3><p className="summary">{article.summary}</p>
      <div className={styles.source}><span><strong>{article.source}</strong><small>{hostname(article.url)}</small></span><ArrowUpRight size={15} aria-hidden="true" /></div>
    </div>
  </a>;
}

export default function StoryCard({ story, eager = false }: { story: Story; eager?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [representative, ...related] = story.articles;
  const regionId = `sources-${representative.id}`;
  return <article className={styles.story} data-expanded={expanded} onMouseLeave={() => { if (matchMedia('(hover: hover)').matches) setExpanded(false); }} onKeyDown={event => { if (event.key === 'Escape') setExpanded(false); }}>
    <div className={styles.stack} style={{ '--edge-width': `${Math.min(related.length, 3) * 18}px` } as CSSProperties}>
      {related.length > 0 && <div className={styles.edges} onMouseEnter={event => { if (matchMedia('(hover: hover)').matches && event.buttons === 0) setExpanded(true); }}>
        {related.slice(0, 3).map((source, index) => <button key={source.id} type="button" className={styles.edge} style={{ '--edge-index': index } as CSSProperties} aria-expanded={expanded} aria-controls={regionId} aria-label={`${source.source} 등 관련 출처 ${related.length}개 ${expanded ? '접기' : '펼치기'}`} onClick={event => { if (event.detail > 0 && matchMedia('(hover: hover)').matches) setExpanded(true); else setExpanded(value => !value); }}><span>{source.source}{index === 2 && related.length > 3 ? ` +${related.length - 3}` : ''}</span></button>)}
      </div>}
      <ArticleCard article={representative} eager={eager} count={story.articles.length} />
    </div>
    {related.length > 0 && <div id={regionId} className={styles.related} hidden={!expanded}>
      <div className={styles.controls}><span>관련 보도 · {related.length}개 출처</span><button type="button" onClick={() => setExpanded(false)}>접기</button></div>
      <div className={styles.fan}>{related.map(source => <ArticleCard key={source.id} article={source} eager={false} />)}</div>
    </div>}
  </article>;
}
