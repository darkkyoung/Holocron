import { list, type Article } from '../news';
import seed from '../seed.json';
import { buildStories } from './stories';

/** Request-time data preparation, kept outside React rendering and client bundles. */
export async function loadArchive() {
  let articles: Article[] = seed as Article[];
  let initial = true;
  try {
    const stored = await list();
    if (stored.length) {
      articles = stored;
      initial = false;
    }
  } catch {
    // Keep the initial archive usable before database initialization.
  }
  return { stories: buildStories(articles, Date.now()), initial };
}
