import type { Article } from '../news';

export type Story = { topic: string; articles: Article[] };

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
  return [...groups].map(([topic, members]) => ({
    topic,
    articles: members.sort((a, b) => Date.parse(a.published) - Date.parse(b.published) || a.id.localeCompare(b.id)),
  })).sort((a, b) => Date.parse(b.articles[0].published) - Date.parse(a.articles[0].published));
}
