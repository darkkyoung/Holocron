import {db,setting} from '@/lib/news';
import {COLLECTION_SOURCES_SETTING_KEY,parseSourceEnabledState,type SourceEnabledState} from './source-settings';

export async function loadSourceEnabledState():Promise<SourceEnabledState>{
  const row=await db().prepare('SELECT value FROM settings WHERE key=?').bind(COLLECTION_SOURCES_SETTING_KEY).first<{value:string}>();
  return parseSourceEnabledState(row?.value);
}

export async function saveSourceEnabledState(state:SourceEnabledState){
  await setting(COLLECTION_SOURCES_SETTING_KEY,JSON.stringify(state));
}
