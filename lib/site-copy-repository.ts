import {db,setting} from '@/lib/news';
import {DEFAULT_SITE_COPY,SITE_COPY_SETTING_KEY,normalizeSiteCopy,validateSiteCopy,type SiteCopy} from '@/lib/site-copy';

export async function loadSiteCopy():Promise<SiteCopy>{
  const row=await db().prepare('SELECT value FROM settings WHERE key=?').bind(SITE_COPY_SETTING_KEY).first<{value:string}>();
  if(!row?.value)return {...DEFAULT_SITE_COPY};
  try{return normalizeSiteCopy(JSON.parse(row.value));}
  catch{return {...DEFAULT_SITE_COPY};}
}

export async function saveSiteCopy(value:unknown):Promise<SiteCopy>{
  const copy=validateSiteCopy(value);
  await setting(SITE_COPY_SETTING_KEY,JSON.stringify(copy));
  return copy;
}

export async function resetSiteCopy():Promise<SiteCopy>{
  await db().prepare('DELETE FROM settings WHERE key=?').bind(SITE_COPY_SETTING_KEY).run();
  return {...DEFAULT_SITE_COPY};
}
