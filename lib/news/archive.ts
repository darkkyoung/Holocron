import { list, type Article } from '../news';
import seed from '../seed.json';
import { buildStories } from './stories';
import {defaultSourceEnabledState,filterArticlesByEnabledSources,sourceSettingItems} from '../collection/source-settings';
import {loadSourceEnabledState} from '../collection/source-settings-repository';

/** Request-time data preparation, kept outside React rendering and client bundles. */
export async function loadArchive() {
  let articles: Article[] = seed as Article[];
  let initial = true;
  let sourceState=defaultSourceEnabledState();
  try {
    const stored = await list();
    if (stored.length) {
      articles = stored;
      initial = false;
    }
  } catch {
    // Keep the initial archive usable before database initialization.
  }
  try {sourceState=await loadSourceEnabledState();}
  catch {
    // Source settings are optional until the D1 settings table is available.
  }
  return {
    stories: buildStories(filterArticlesByEnabledSources(articles,sourceState), Date.now()),
    sources:sourceSettingItems(sourceState).filter(source=>source.enabled),
    initial,
  };
}
