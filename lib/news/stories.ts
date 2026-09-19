import type { Article } from '../news';

export type Story = { topic: string; articles: Article[]; orderUncertain: boolean };

function publicationRange(article: Article) {
  const start = Date.parse(article.published);
  return { start, end: start + (/^\d{4}-\d{2}-\d{2}$/.test(article.published) ? 86400000 - 1 : 0) };
}

/** Read-only projection: persisted topics and administrator publication decisions win. */
export function buildStories(articles: readonly Article[], now: number): Story[] {
  const cutoff = now - 90 * 24 * 60 * 60 * 1000;
  const groups = new Map<string, Article[]>();
  for (const article of articles) {
    const published = Date.parse(article.published);
    if (article.status !== 'published' || !Number.isFinite(published) || published < cutoff) continue;
    const group = groups.get(article.topic) ?? [];
    group.push(article);
    groups.set(article.topic, group);
  }
  return [...groups].map(([topic, members]) => {
    const ordered = members.sort((a, b) => Date.parse(a.published) - Date.parse(b.published) || a.id.localeCompare(b.id));
    const earliestEnd = Math.min(...ordered.map(article => publicationRange(article).end));
    const candidates = ordered.filter(article => publicationRange(article).start <= earliestEnd);
    // Overlapping date ranges cannot establish a strict earliest source. Choose a
    // stable display representative, but explicitly label that uncertainty in UI.
    const orderUncertain = candidates.length > 1 && candidates.some(article => /^\d{4}-\d{2}-\d{2}$/.test(article.published));
    if (orderUncertain) {
      const representative = [...candidates].sort((a, b) => a.id.localeCompare(b.id))[0];
      ordered.splice(ordered.indexOf(representative), 1);
      ordered.unshift(representative);
    }
    return { topic, articles: ordered, orderUncertain };
  }).sort((a, b) => Date.parse(b.articles[0].published) - Date.parse(a.articles[0].published));
}
